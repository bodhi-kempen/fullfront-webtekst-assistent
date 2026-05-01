import { supabaseAdmin } from '../lib/supabase.js';
import {
  getPlannedQuestion,
  MAX_FOLLOWUPS_PER_PART,
  META_BLOG_OPTIN_ID,
  META_BLOG_OPTIN_TEXT,
  moreServicesId,
  PARTS,
  plannedId,
  serviceQuestionId,
  type Archetype,
  type Part,
} from '../data/questions.js';
import {
  classifyArchetype,
  classifyBlogOptin,
  classifyMoreServices,
  decideInterviewTurn,
  type PriorTurn,
} from './interview-ai.js';

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export interface CurrentQuestion {
  question_id: string;
  parent_question_id: string | null;
  is_followup: boolean;
  part: Part;
  text: string;
}

export interface InterviewProgress {
  part: Part;
  parts_total: 10;
  answered: number;
  archetype: Archetype | null;
  sub_archetype: Archetype | null;
  service_index?: number;
}

export interface InterviewStep {
  done: boolean;
  assistant_message: string;
  current_question: CurrentQuestion | null;
  progress: InterviewProgress;
}

// ---------------------------------------------------------------------------
// Persisted state
// ---------------------------------------------------------------------------

type PendingKind = 'planned' | 'followup' | 'extra' | 'meta_more' | 'meta_blog';

interface PendingQuestion {
  question_id: string;
  question_text: string;
  kind: PendingKind;
  parent_id: string | null;
  part: Part;
}

interface InterviewMeta {
  current_part: Part;
  current_part_q: number; // 1-based; for non-part-4 parts.
  current_service: number; // 1-based; only meaningful in part 4.
  current_service_q: number; // 1-based within the service template; 9 = meta_more.
  blog_optin: boolean | null;
  pending: PendingQuestion | null;
}

function blankMeta(): InterviewMeta {
  return {
    current_part: 1,
    current_part_q: 0,
    current_service: 1,
    current_service_q: 0,
    blog_optin: null,
    pending: null,
  };
}

interface ProjectRow {
  id: string;
  user_id: string;
  archetype: Archetype | null;
  sub_archetype: Archetype | null;
  status: string;
  interview_meta: InterviewMeta | null;
}
interface AnswerRow {
  id: string;
  project_id: string;
  question_id: string;
  question_text: string;
  answer_text: string;
  answer_source: 'voice' | 'typed';
  phase: number;
  sequence_order: number;
  is_followup: boolean;
  parent_question_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function loadProject(projectId: string): Promise<ProjectRow> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, user_id, archetype, sub_archetype, status, interview_meta')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, 'Project not found');
  return data as ProjectRow;
}

async function loadAnswers(projectId: string): Promise<AnswerRow[]> {
  const { data, error } = await supabaseAdmin
    .from('interview_answers')
    .select('*')
    .eq('project_id', projectId)
    .order('sequence_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnswerRow[];
}

async function nextSequenceOrder(projectId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('interview_answers')
    .select('sequence_order')
    .eq('project_id', projectId)
    .order('sequence_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sequence_order ?? 0) + 1;
}

async function insertAnswer(row: Omit<AnswerRow, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabaseAdmin.from('interview_answers').insert(row);
  if (error) throw error;
}

async function setMeta(projectId: string, meta: InterviewMeta): Promise<void> {
  const { error } = await supabaseAdmin
    .from('projects')
    .update({ interview_meta: meta })
    .eq('id', projectId);
  if (error) throw error;
}

async function setArchetype(projectId: string, primary: Archetype, sub: Archetype | null): Promise<void> {
  const { error } = await supabaseAdmin
    .from('projects')
    .update({ archetype: primary, sub_archetype: sub })
    .eq('id', projectId);
  if (error) throw error;
}

async function setStatus(projectId: string, status: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('projects')
    .update({ status })
    .eq('id', projectId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

interface HttpError extends Error {
  statusCode: number;
}

function httpError(statusCode: number, message: string): HttpError {
  return Object.assign(new Error(message), { statusCode });
}

// ---------------------------------------------------------------------------
// Plan navigation
// ---------------------------------------------------------------------------

interface NextEmit {
  question_id: string;
  question_text: string;
  kind: PendingKind;
  parent_id: string | null;
  part: Part;
}

/** Advance meta in place to the next thing to ask, and return its descriptor.
 *  Returns null when the interview is done. Handles part transitions, the
 *  part-4 service loop, and the meta-blog opt-in question between part 8 and 9. */
function advanceMeta(meta: InterviewMeta): NextEmit | null {
  // Helper to emit a planned question for a given part + question index.
  const emitPlanned = (part: Part, qIdx: number): NextEmit => {
    const def = PARTS[part];
    const q = def.questions.find((x) => x.index === qIdx);
    if (!q) throw new Error(`No question p${part}q${qIdx}`);
    return {
      question_id: plannedId(part, qIdx),
      question_text: q.text,
      kind: 'planned',
      parent_id: null,
      part,
    };
  };

  // Inside part 4 service loop?
  if (meta.current_part === 4) {
    if (meta.current_service_q < 8) {
      meta.current_service_q += 1;
      const tmpl = PARTS[4].questions.find((q) => q.index === meta.current_service_q);
      if (!tmpl) throw new Error('part 4 template error');
      return {
        question_id: serviceQuestionId(meta.current_service, meta.current_service_q),
        question_text: tmpl.text,
        kind: 'planned',
        parent_id: null,
        part: 4,
      };
    }
    if (meta.current_service_q === 8) {
      meta.current_service_q = 9;
      return {
        question_id: moreServicesId(meta.current_service),
        question_text:
          'Heb je nog een andere dienst om te bespreken? Zo ja, hoe heet hij en wat houdt hij in? Anders kun je gewoon "nee" antwoorden.',
        kind: 'meta_more',
        parent_id: null,
        part: 4,
      };
    }
    // current_service_q === 9 means we just emitted meta_more; the /answer
    // handler decides what's next (next service or part 5). Should not be
    // reached from advanceMeta directly.
  }

  // Non-part-4: still questions left in current part?
  const def = PARTS[meta.current_part];
  if (def && meta.current_part_q < def.questions.length) {
    meta.current_part_q += 1;
    return emitPlanned(meta.current_part, meta.current_part_q);
  }

  // Transition to next part
  return transitionAfterPart(meta);
}

/** Apply the part transition that should run after the LAST question of
 *  meta.current_part has just been answered. Mutates meta and returns the
 *  next thing to ask (or null when interview is complete). */
function transitionAfterPart(meta: InterviewMeta): NextEmit | null {
  switch (meta.current_part) {
    case 1:
    case 2:
    case 3: {
      const next = (meta.current_part + 1) as Part;
      if (next === 4) {
        meta.current_part = 4;
        meta.current_service = 1;
        meta.current_service_q = 1;
        const tmpl = PARTS[4].questions[0]!;
        return {
          question_id: serviceQuestionId(1, 1),
          question_text: tmpl.text,
          kind: 'planned',
          parent_id: null,
          part: 4,
        };
      }
      meta.current_part = next;
      meta.current_part_q = 1;
      const def = PARTS[next];
      return {
        question_id: plannedId(next, 1),
        question_text: def.questions[0]!.text,
        kind: 'planned',
        parent_id: null,
        part: next,
      };
    }
    case 4:
      // After service loop is done, go to part 5.
      meta.current_part = 5;
      meta.current_part_q = 1;
      return {
        question_id: plannedId(5, 1),
        question_text: PARTS[5].questions[0]!.text,
        kind: 'planned',
        parent_id: null,
        part: 5,
      };
    case 5:
    case 6:
    case 7: {
      const next = (meta.current_part + 1) as Part;
      meta.current_part = next;
      meta.current_part_q = 1;
      return {
        question_id: plannedId(next, 1),
        question_text: PARTS[next].questions[0]!.text,
        kind: 'planned',
        parent_id: null,
        part: next,
      };
    }
    case 8:
      // After part 8, ask the blog opt-in meta question.
      return {
        question_id: META_BLOG_OPTIN_ID,
        question_text: META_BLOG_OPTIN_TEXT,
        kind: 'meta_blog',
        parent_id: null,
        part: 8,
      };
    case 9:
      meta.current_part = 10;
      meta.current_part_q = 1;
      return {
        question_id: plannedId(10, 1),
        question_text: PARTS[10].questions[0]!.text,
        kind: 'planned',
        parent_id: null,
        part: 10,
      };
    case 10:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Conversation context helpers (for AI calls)
// ---------------------------------------------------------------------------

function followupsAskedFor(parentId: string, answers: AnswerRow[]): number {
  return answers.filter(
    (a) => a.is_followup && a.parent_question_id === parentId
  ).length;
}

function recentTurnsFor(parentId: string, answers: AnswerRow[]): PriorTurn[] {
  const turns: PriorTurn[] = [];
  for (const a of answers) {
    const isThisGroup =
      (!a.is_followup && a.question_id === parentId) ||
      (a.is_followup && a.parent_question_id === parentId);
    if (!isThisGroup) continue;
    turns.push({ role: 'assistant', text: a.question_text });
    turns.push({ role: 'user', text: a.answer_text });
  }
  return turns;
}

function priorAnswersSummary(answers: AnswerRow[]): string {
  // Dense, abbreviated overview to help the AI spot already-answered topics.
  if (answers.length === 0) return '';
  const lines: string[] = [];
  for (const a of answers) {
    const tag = a.is_followup ? '↳' : '•';
    const q = a.question_text.length > 80 ? a.question_text.slice(0, 80) + '…' : a.question_text;
    const ans = a.answer_text.length > 200 ? a.answer_text.slice(0, 200) + '…' : a.answer_text;
    lines.push(`${tag} [${a.question_id}] ${q}\n  → ${ans}`);
  }
  return lines.join('\n');
}

function progressFor(meta: InterviewMeta, answers: AnswerRow[], project: ProjectRow): InterviewProgress {
  const answered = answers.filter((a) => !a.is_followup).length;
  return {
    part: meta.current_part,
    parts_total: 10,
    answered,
    archetype: project.archetype,
    sub_archetype: project.sub_archetype,
    ...(meta.current_part === 4 ? { service_index: meta.current_service } : {}),
  };
}

// ---------------------------------------------------------------------------
// Archetype detection — runs on the first turn after part 1 ends. Retries
// the AI call up to 3 times; on persistent failure, falls back to a
// keyword scan so the archetype is ALWAYS set before part 2 is processed.
// ---------------------------------------------------------------------------

function keywordFallbackArchetype(text: string): { primary: Archetype; sub: Archetype | null; reason: string } {
  const t = text.toLowerCase();
  if (/loodgieter|elektricien|cv-monteur|monteur|schilder|dakdekker|slotenmaker|installateur|aannemer|stukadoor|tegelzetter|timmerman/.test(t)) {
    return { primary: 'lokale_ambacht', sub: null, reason: 'Keyword fallback: detected lokaal-ambacht beroep.' };
  }
  if (/restaurant|caf[eé]|lunchroom|bistro|catering|chef|kok|food\s?truck/.test(t)) {
    return { primary: 'horeca', sub: null, reason: 'Keyword fallback: horeca trefwoord.' };
  }
  if (/webshop|e-?commerce|online winkel|productverkoop|verkoop online|webwinkel/.test(t)) {
    return { primary: 'webshop', sub: null, reason: 'Keyword fallback: webshop / e-commerce.' };
  }
  if (/kapper|barbershop|salon|nagelstud|personal trainer|yogastudio|dansschool|sportschool|massage/.test(t)) {
    return { primary: 'boeking_gedreven', sub: null, reason: 'Keyword fallback: boekings-gedreven dienst.' };
  }
  if (/fotograaf|hovenier|tuin\s?ontwerp|interieurdesigner|interieurontwerp|grafisch ontwerper|illustrator|videograaf/.test(t)) {
    return { primary: 'visueel_portfolio', sub: null, reason: 'Keyword fallback: visueel portfolio.' };
  }
  // Default catch-all: dienstverlening.
  return { primary: 'service_zzp', sub: null, reason: 'Keyword fallback default: service_zzp.' };
}

async function classifyArchetypeWithFallback(
  projectId: string,
  project: ProjectRow,
  answers: AnswerRow[]
): Promise<void> {
  const part1MainAnswers = answers.filter((a) => a.phase === 1 && !a.is_followup);
  if (part1MainAnswers.length === 0) {
    console.warn(`[interview] ${projectId}: no part-1 answers yet; archetype detection deferred.`);
    return;
  }

  const transcript = part1MainAnswers.map((a) => ({
    question_text: a.question_text,
    answer_text: a.answer_text,
  }));

  // Try AI classification up to 3 times.
  const errors: string[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const cls = await classifyArchetype(transcript);
      await setArchetype(projectId, cls.primary, cls.sub);
      project.archetype = cls.primary;
      project.sub_archetype = cls.sub;
      console.log(
        `[interview] ${projectId}: archetype=${cls.primary}${cls.sub ? '+' + cls.sub : ''} via AI (attempt ${attempt}). Reason: ${cls.reason}`
      );
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`attempt ${attempt}: ${msg}`);
      console.error(`[interview] ${projectId}: archetype attempt ${attempt} failed:`, msg);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }

  // Fallback: keyword scan.
  const text = part1MainAnswers.map((a) => a.answer_text).join(' ');
  const cls = keywordFallbackArchetype(text);
  await setArchetype(projectId, cls.primary, cls.sub);
  project.archetype = cls.primary;
  project.sub_archetype = cls.sub;
  console.warn(
    `[interview] ${projectId}: AI classification failed 3x — using ${cls.primary} via keyword fallback. ` +
      `AI errors: ${errors.join(' | ')}`
  );
}

// ---------------------------------------------------------------------------
// Welcome message
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE =
  'Welkom! Ik neem een uitgebreid interview met je af om alle informatie boven tafel te krijgen voor de teksten op je website. We doorlopen samen 10 onderwerpen en het duurt ongeveer 45 tot 60 minuten. Antwoord zo concreet mogelijk; ik vraag waar nodig door.';

// ---------------------------------------------------------------------------
// Public: getInterviewStep (resume / poll)
// ---------------------------------------------------------------------------

export async function getInterviewStep(projectId: string): Promise<InterviewStep> {
  const project = await loadProject(projectId);
  const answers = await loadAnswers(projectId);
  const meta: InterviewMeta = project.interview_meta ?? blankMeta();

  // First-ever call: emit the very first question.
  if (!meta.pending && answers.length === 0) {
    meta.current_part = 1;
    meta.current_part_q = 1;
    const first = PARTS[1].questions[0]!;
    meta.pending = {
      question_id: plannedId(1, 1),
      question_text: first.text,
      kind: 'planned',
      parent_id: null,
      part: 1,
    };
    await setMeta(projectId, meta);
    return {
      done: false,
      assistant_message: `${WELCOME_MESSAGE}\n\n${first.text}`,
      current_question: {
        question_id: meta.pending.question_id,
        parent_question_id: null,
        is_followup: false,
        part: 1,
        text: first.text,
      },
      progress: progressFor(meta, answers, project),
    };
  }

  // Already in progress.
  if (meta.pending) {
    return {
      done: false,
      assistant_message: meta.pending.question_text,
      current_question: {
        question_id: meta.pending.question_id,
        parent_question_id: meta.pending.parent_id,
        is_followup: meta.pending.kind === 'followup' || meta.pending.kind === 'extra',
        part: meta.pending.part,
        text: meta.pending.question_text,
      },
      progress: progressFor(meta, answers, project),
    };
  }

  // No pending and answers exist: interview is complete.
  return {
    done: true,
    assistant_message: 'Het interview is voltooid. We kunnen door naar de strategie.',
    current_question: null,
    progress: progressFor(meta, answers, project),
  };
}

// ---------------------------------------------------------------------------
// Public: submitAnswer
// ---------------------------------------------------------------------------

export interface SubmitAnswerInput {
  question_id: string;
  question_text?: string;
  answer_text: string;
  answer_source: 'voice' | 'typed';
}

export async function submitAnswer(
  projectId: string,
  input: SubmitAnswerInput
): Promise<InterviewStep> {
  if (!input.answer_text || input.answer_text.trim().length === 0) {
    throw httpError(400, 'answer_text is required');
  }

  const project = await loadProject(projectId);
  const answers = await loadAnswers(projectId);
  const meta: InterviewMeta = project.interview_meta ?? blankMeta();

  // Validate against the pending question we emitted.
  if (!meta.pending) {
    throw httpError(409, 'No pending question — interview already complete or not started');
  }
  if (meta.pending.question_id !== input.question_id) {
    throw httpError(
      409,
      `Unexpected question_id. Server expected ${meta.pending.question_id}, got ${input.question_id}.`
    );
  }

  // Lazy archetype detection: if we somehow ended up past part 1 without an
  // archetype (e.g., the AI used skip_planned during part 1 so the old
  // ">= 10 mains answered" trigger never fired), classify NOW with retry +
  // keyword fallback before processing this turn.
  if (!project.archetype && meta.pending.part > 1) {
    await classifyArchetypeWithFallback(projectId, project, answers);
  }

  const pending = meta.pending;

  // Persist the answer for this turn.
  const seq = await nextSequenceOrder(projectId);
  await insertAnswer({
    project_id: projectId,
    question_id: pending.question_id,
    question_text: pending.question_text,
    answer_text: input.answer_text.trim(),
    answer_source: input.answer_source,
    phase: pending.part,
    sequence_order: seq,
    is_followup: pending.kind === 'followup' || pending.kind === 'extra',
    parent_question_id: pending.parent_id,
  });
  answers.push({
    id: 'pending',
    project_id: projectId,
    question_id: pending.question_id,
    question_text: pending.question_text,
    answer_text: input.answer_text.trim(),
    answer_source: input.answer_source,
    phase: pending.part,
    sequence_order: seq,
    is_followup: pending.kind === 'followup' || pending.kind === 'extra',
    parent_question_id: pending.parent_id,
    created_at: new Date().toISOString(),
  });

  // ---- Branch on what the user just answered ----

  if (pending.kind === 'meta_more') {
    return await handleMetaMore(projectId, project, meta, answers);
  }
  if (pending.kind === 'meta_blog') {
    return await handleMetaBlog(projectId, project, meta, answers, input.answer_text.trim());
  }

  // ---- Run AI per-turn decision (planned / followup / extra) ----

  // Determine what the next planned question would be (without committing).
  const speculativeMeta: InterviewMeta = JSON.parse(JSON.stringify(meta));
  let nextCandidate: NextEmit | null;
  if (pending.kind === 'planned') {
    nextCandidate = advanceMeta(speculativeMeta);
  } else {
    // followup / extra: the planned question is the parent's NEXT, which is
    // actually the same as advancing from current state (parent is the
    // current pending in meta — but pending was followup/extra, not the
    // planned itself). For followup/extra, the "next planned" is whatever
    // would come after the parent. Easiest: speculatively advance from
    // current meta state — parent's index is already accounted for.
    nextCandidate = advanceMeta(speculativeMeta);
  }

  // For followup count + recent context, use the parent question id.
  const parentForFollowupCount =
    pending.kind === 'planned' ? pending.question_id : pending.parent_id ?? pending.question_id;
  const followupsAsked = followupsAskedFor(parentForFollowupCount, answers);
  const maxFollowups = MAX_FOLLOWUPS_PER_PART[pending.part] ?? 2;

  // Archetype hints for the current part (only relevant once detected).
  const archetypeHints: string[] = (() => {
    if (!project.archetype) return [];
    const def = PARTS[pending.part];
    return def.archetype_hints?.[project.archetype] ?? [];
  })();

  const decision = await decideInterviewTurn({
    part: pending.part,
    justAnsweredText: pending.question_text,
    latestAnswer: input.answer_text.trim(),
    recentTurns: recentTurnsFor(parentForFollowupCount, answers),
    followupsAlreadyAsked: followupsAsked,
    maxFollowups,
    nextPlannedText: nextCandidate?.kind === 'planned' ? nextCandidate.question_text : null,
    archetypeHints,
    priorAnswersSummary: priorAnswersSummary(answers),
  });

  return await applyDecision(projectId, project, meta, answers, pending, decision, nextCandidate);
}

// ---------------------------------------------------------------------------
// Decision applier
// ---------------------------------------------------------------------------

async function applyDecision(
  projectId: string,
  project: ProjectRow,
  meta: InterviewMeta,
  answers: AnswerRow[],
  pending: PendingQuestion,
  decision: Awaited<ReturnType<typeof decideInterviewTurn>>,
  nextCandidate: NextEmit | null
): Promise<InterviewStep> {
  const acknowledgement = decision.acknowledgement || 'Helder.';

  // Followup: the parent stays; emit the doorvraag.
  if (decision.action === 'followup' && decision.followup_question) {
    const parentId =
      pending.kind === 'planned' ? pending.question_id : pending.parent_id ?? pending.question_id;
    const parentPart = pending.part;
    const followupCount = followupsAskedFor(parentId, answers);
    const followupId = `${parentId}_followup_${followupCount + 1}`;
    meta.pending = {
      question_id: followupId,
      question_text: decision.followup_question,
      kind: 'followup',
      parent_id: parentId,
      part: parentPart,
    };
    await setMeta(projectId, meta);
    return {
      done: false,
      assistant_message: `${acknowledgement}\n\n${decision.followup_question}`,
      current_question: {
        question_id: followupId,
        parent_question_id: parentId,
        is_followup: true,
        part: parentPart,
        text: decision.followup_question,
      },
      progress: progressFor(meta, answers, project),
    };
  }

  // Extra (archetype-woven): inserts an extra question before the next planned.
  if (decision.action === 'extra_archetype' && decision.extra_question) {
    // Use the planned-id-style parent (the next planned candidate's id) so we
    // can persist the relation. If there's no next planned, treat as advance.
    const parentId =
      nextCandidate?.question_id ?? (pending.kind === 'planned' ? pending.question_id : pending.parent_id);
    const partForExtra = pending.part;
    const extraCount = answers.filter(
      (a) => a.is_followup && a.parent_question_id === parentId && /_extra_\d+$/.test(a.question_id)
    ).length;
    const extraId = `${parentId ?? `p${partForExtra}`}_extra_${extraCount + 1}`;
    meta.pending = {
      question_id: extraId,
      question_text: decision.extra_question,
      kind: 'extra',
      parent_id: parentId ?? null,
      part: partForExtra,
    };
    await setMeta(projectId, meta);
    return {
      done: false,
      assistant_message: `${acknowledgement}\n\n${decision.extra_question}`,
      current_question: {
        question_id: extraId,
        parent_question_id: parentId,
        is_followup: true,
        part: partForExtra,
        text: decision.extra_question,
      },
      progress: progressFor(meta, answers, project),
    };
  }

  // Skip planned: advance past nextCandidate, then take the one after.
  if (decision.action === 'skip_planned' && nextCandidate) {
    // First advance commits skipping nextCandidate (already mutated meta if
    // we'd called advanceMeta; but nextCandidate came from a speculative
    // copy). Apply the same mutation on the real meta:
    const skipped = advanceMeta(meta);
    if (skipped && skipped.kind === 'meta_more') {
      // Skipping meta_more doesn't make sense; commit it and move on.
      meta.pending = skipped;
      await setMeta(projectId, meta);
      return emitFromCandidate(meta, answers, project, acknowledgement, skipped);
    }
    // Now advance once more for the actual next.
    const after = advanceMeta(meta);
    if (!after) {
      meta.pending = null;
      await setMeta(projectId, meta);
      await setStatus(projectId, 'strategy');
      return {
        done: true,
        assistant_message: `${acknowledgement}\n\nDat was alles. Ik heb genoeg om de strategie voor je op te stellen.`,
        current_question: null,
        progress: progressFor(meta, answers, project),
      };
    }
    meta.pending = after;
    await setMeta(projectId, meta);
    return emitFromCandidate(meta, answers, project, acknowledgement, after);
  }

  // Advance: commit the speculative advance (re-run on the real meta).
  const next = advanceMeta(meta);
  if (!next) {
    meta.pending = null;
    await setMeta(projectId, meta);
    await setStatus(projectId, 'strategy');
    return {
      done: true,
      assistant_message: `${acknowledgement}\n\nDat was alles. Ik heb genoeg om de strategie voor je op te stellen.`,
      current_question: null,
      progress: progressFor(meta, answers, project),
    };
  }
  meta.pending = next;
  await setMeta(projectId, meta);
  return emitFromCandidate(meta, answers, project, acknowledgement, next);
}

function emitFromCandidate(
  meta: InterviewMeta,
  answers: AnswerRow[],
  project: ProjectRow,
  acknowledgement: string,
  emit: NextEmit
): InterviewStep {
  return {
    done: false,
    assistant_message: `${acknowledgement}\n\n${emit.question_text}`,
    current_question: {
      question_id: emit.question_id,
      parent_question_id: emit.parent_id,
      is_followup: emit.kind === 'followup' || emit.kind === 'extra',
      part: emit.part,
      text: emit.question_text,
    },
    progress: progressFor(meta, answers, project),
  };
}

// ---------------------------------------------------------------------------
// Meta-question handlers
// ---------------------------------------------------------------------------

async function handleMetaMore(
  projectId: string,
  project: ProjectRow,
  meta: InterviewMeta,
  answers: AnswerRow[]
): Promise<InterviewStep> {
  const lastAnswer = answers[answers.length - 1]!;
  let wantsMore = false;
  try {
    wantsMore = await classifyMoreServices(lastAnswer.answer_text);
  } catch (err) {
    console.error('[interview] more-services classification failed; assuming no.', err);
  }

  if (wantsMore) {
    meta.current_service += 1;
    meta.current_service_q = 1;
    const tmpl = PARTS[4].questions[0]!;
    meta.pending = {
      question_id: serviceQuestionId(meta.current_service, 1),
      question_text: tmpl.text,
      kind: 'planned',
      parent_id: null,
      part: 4,
    };
    await setMeta(projectId, meta);
    return {
      done: false,
      assistant_message: `Helder, vertel.\n\n${tmpl.text}`,
      current_question: {
        question_id: meta.pending.question_id,
        parent_question_id: null,
        is_followup: false,
        part: 4,
        text: tmpl.text,
      },
      progress: progressFor(meta, answers, project),
    };
  }

  // No more services — advance to part 5.
  meta.current_part = 5;
  meta.current_part_q = 1;
  const first = PARTS[5].questions[0]!;
  meta.pending = {
    question_id: plannedId(5, 1),
    question_text: first.text,
    kind: 'planned',
    parent_id: null,
    part: 5,
  };
  await setMeta(projectId, meta);
  return {
    done: false,
    assistant_message: `Helder, dan gaan we door.\n\n${first.text}`,
    current_question: {
      question_id: meta.pending.question_id,
      parent_question_id: null,
      is_followup: false,
      part: 5,
      text: first.text,
    },
    progress: progressFor(meta, answers, project),
  };
}

async function handleMetaBlog(
  projectId: string,
  project: ProjectRow,
  meta: InterviewMeta,
  answers: AnswerRow[],
  answerText: string
): Promise<InterviewStep> {
  let wantsBlog = false;
  try {
    wantsBlog = await classifyBlogOptin(answerText);
  } catch (err) {
    console.error('[interview] blog opt-in classification failed; assuming no.', err);
  }
  meta.blog_optin = wantsBlog;

  const nextPart = (wantsBlog ? 9 : 10) as Part;
  meta.current_part = nextPart;
  meta.current_part_q = 1;
  const first = PARTS[nextPart].questions[0]!;
  meta.pending = {
    question_id: plannedId(nextPart, 1),
    question_text: first.text,
    kind: 'planned',
    parent_id: null,
    part: nextPart,
  };
  await setMeta(projectId, meta);
  return {
    done: false,
    assistant_message: wantsBlog
      ? `Mooi, dan duiken we daar even in.\n\n${first.text}`
      : `Helder, dan gaan we door naar de afsluiting.\n\n${first.text}`,
    current_question: {
      question_id: meta.pending.question_id,
      parent_question_id: null,
      is_followup: false,
      part: nextPart,
      text: first.text,
    },
    progress: progressFor(meta, answers, project),
  };
}

// ---------------------------------------------------------------------------
// Public: explicit completion
// ---------------------------------------------------------------------------

export async function markInterviewComplete(projectId: string): Promise<void> {
  await setStatus(projectId, 'strategy');
}

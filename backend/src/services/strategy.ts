import { supabaseAdmin } from '../lib/supabase.js';
import type { Archetype } from '../data/questions.js';
import {
  proposeStrategy,
  type ArchetypeConfig,
  type StrategyProposal,
  type SuggestedPage,
} from './strategy-ai.js';

export interface StoredStrategy {
  id: string;
  project_id: string;
  website_type: StrategyProposal['website_type'];
  tone_of_voice: string;
  addressing: 'je' | 'u' | 'mix';
  primary_cta: string;
  suggested_pages: SuggestedPage[];
  archetype_config: ArchetypeConfig;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  archetype: Archetype | null;
  sub_archetype: Archetype | null;
  status: string;
}

interface AnswerRow {
  question_id: string;
  question_text: string;
  answer_text: string;
  phase: 1 | 2 | 3;
  is_followup: boolean;
  sequence_order: number;
}

async function loadProject(projectId: string): Promise<ProjectRow> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, archetype, sub_archetype, status')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project not found');
  return data as ProjectRow;
}

async function loadAnswers(projectId: string): Promise<AnswerRow[]> {
  const { data, error } = await supabaseAdmin
    .from('interview_answers')
    .select('question_id, question_text, answer_text, phase, is_followup, sequence_order')
    .eq('project_id', projectId)
    .order('sequence_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnswerRow[];
}

export async function getStrategy(
  projectId: string
): Promise<StoredStrategy | null> {
  const { data, error } = await supabaseAdmin
    .from('website_strategy')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return (data as StoredStrategy | null) ?? null;
}

export async function generateStrategy(
  projectId: string
): Promise<StoredStrategy> {
  const project = await loadProject(projectId);
  if (!project.archetype) {
    throw new Error('Cannot generate strategy: archetype not detected yet');
  }

  const answers = await loadAnswers(projectId);
  if (answers.length === 0) {
    throw new Error('Cannot generate strategy: no interview answers yet');
  }

  const proposal = await proposeStrategy({
    archetype: project.archetype,
    sub_archetype: project.sub_archetype,
    answers,
  });

  const row = {
    project_id: projectId,
    website_type: proposal.website_type,
    tone_of_voice: proposal.tone_of_voice,
    addressing: proposal.addressing,
    primary_cta: proposal.primary_cta,
    suggested_pages: proposal.suggested_pages,
    archetype_config: proposal.archetype_config,
    approved: false,
  };

  const { data, error } = await supabaseAdmin
    .from('website_strategy')
    .upsert(row, { onConflict: 'project_id' })
    .select()
    .single();
  if (error) throw error;

  return data as StoredStrategy;
}

export interface StrategyUpdate {
  website_type?: StrategyProposal['website_type'];
  tone_of_voice?: string;
  addressing?: 'je' | 'u' | 'mix';
  primary_cta?: string;
  suggested_pages?: SuggestedPage[];
  archetype_config?: Partial<ArchetypeConfig>;
}

export async function updateStrategy(
  projectId: string,
  updates: StrategyUpdate
): Promise<StoredStrategy> {
  const current = await getStrategy(projectId);
  if (!current) throw new Error('Strategy not yet generated');

  const merged: Record<string, unknown> = {};
  if (updates.website_type) merged.website_type = updates.website_type;
  if (updates.tone_of_voice !== undefined)
    merged.tone_of_voice = updates.tone_of_voice;
  if (updates.addressing) merged.addressing = updates.addressing;
  if (updates.primary_cta !== undefined)
    merged.primary_cta = updates.primary_cta;
  if (updates.suggested_pages)
    merged.suggested_pages = updates.suggested_pages;
  if (updates.archetype_config)
    merged.archetype_config = { ...current.archetype_config, ...updates.archetype_config };

  if (Object.keys(merged).length === 0) {
    return current;
  }

  const { data, error } = await supabaseAdmin
    .from('website_strategy')
    .update(merged)
    .eq('project_id', projectId)
    .select()
    .single();
  if (error) throw error;

  return data as StoredStrategy;
}

export async function approveStrategy(
  projectId: string
): Promise<StoredStrategy> {
  const { data, error } = await supabaseAdmin
    .from('website_strategy')
    .update({ approved: true })
    .eq('project_id', projectId)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error('Strategy not found');

  // Flip status synchronously so the next /pages poll from the client
  // deterministically sees 'generating' (no race against the fire-and-forget
  // worker's first await). The worker will set it again inside generateAllContent
  // — that's an idempotent no-op.
  const { error: sErr } = await supabaseAdmin
    .from('projects')
    .update({ status: 'generating' })
    .eq('id', projectId);
  if (sErr) throw sErr;

  return data as StoredStrategy;
}

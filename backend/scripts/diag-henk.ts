import { supabaseAdmin } from '../src/lib/supabase.js';

const projectId = '284a897b-813f-413f-b811-61783d529b8c';

const { data: project } = await supabaseAdmin
  .from('projects')
  .select('id, name, archetype, sub_archetype, status, interview_meta')
  .eq('id', projectId)
  .maybeSingle();

console.log('Project:', project);

const { data: answers } = await supabaseAdmin
  .from('interview_answers')
  .select('question_id, phase, is_followup, answer_text, sequence_order')
  .eq('project_id', projectId)
  .order('sequence_order');

console.log(`\nAnswers (${answers?.length}):`);
for (const a of answers ?? []) {
  console.log(`  seq=${a.sequence_order} phase=${a.phase} fu=${a.is_followup} id=${a.question_id} → ${a.answer_text.slice(0, 60)}`);
}

const part1Mains = (answers ?? []).filter((a) => a.phase === 1 && !a.is_followup);
console.log(`\nPART 1 main answers: ${part1Mains.length} of 10 expected`);

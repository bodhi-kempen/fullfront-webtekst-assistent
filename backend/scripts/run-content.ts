// Diagnostic: directly invoke generateAllContent for a project so we see
// the actual error (if any) on stderr instead of via the fire-and-forget
// catch.

import { generateAllContent } from '../src/services/content.js';

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: tsx scripts/run-content.ts <project_id>');
  process.exit(1);
}

console.log(`Generating content for project ${projectId}...`);
console.time('generation');
try {
  await generateAllContent(projectId);
  console.timeEnd('generation');
  console.log('Done.');
} catch (err) {
  console.timeEnd('generation');
  console.error('FAILED:', err);
  process.exit(1);
}

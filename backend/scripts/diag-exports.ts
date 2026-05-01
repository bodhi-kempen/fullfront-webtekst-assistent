// Smoke-test the export pipeline directly (skips HTTP/auth so we just
// verify the renderers produce non-empty Buffers/text).

import { writeFile } from 'node:fs/promises';
import { renderDocAsDocx } from '../src/services/export-docx.js';
import { renderDocAsPdf } from '../src/services/export-pdf.js';
import { loadExportDoc } from '../src/services/export-render.js';
import { renderDocAsText, renderPageAsText } from '../src/services/export-text.js';

const projectId = process.argv[2];
if (!projectId) {
  console.error('Usage: tsx scripts/diag-exports.ts <project_id>');
  process.exit(1);
}

const doc = await loadExportDoc(projectId);
console.log(`Loaded: ${doc.business_name} — ${doc.pages.length} pages`);

const txt = renderDocAsText(doc);
console.log(`Plain text: ${txt.length} chars`);
await writeFile(`/tmp/${projectId}.txt`, txt);

const docxBuf = await renderDocAsDocx(doc);
console.log(`Word: ${docxBuf.length} bytes`);
await writeFile(`/tmp/${projectId}.docx`, docxBuf);

const pdfBuf = await renderDocAsPdf(doc);
console.log(`PDF: ${pdfBuf.length} bytes`);
await writeFile(`/tmp/${projectId}.pdf`, pdfBuf);

if (doc.pages.length > 0) {
  const firstPage = doc.pages[0]!;
  const oneText = renderPageAsText(firstPage, doc.business_name);
  console.log(`First page (${firstPage.title}) text: ${oneText.length} chars`);
}

console.log(`\nFiles written to /tmp/${projectId}.{txt,docx,pdf}`);

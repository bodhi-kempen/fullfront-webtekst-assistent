import PDFDocument from 'pdfkit';
import type {
  ExportBlock,
  ExportDoc,
  ExportItem,
  ExportPage,
  ExportSection,
} from './export-render.js';

// ---------------------------------------------------------------------------
// PDF formatter (pdfkit).
// pdfkit's API is imperative — we draw paragraphs sequentially and let it
// auto-paginate.
// ---------------------------------------------------------------------------

const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const FONT_ITALIC = 'Helvetica-Oblique';

const COLORS = {
  text: '#1a1a1a',
  muted: '#666666',
  faint: '#888888',
};

function writeBlock(doc: PDFKit.PDFDocument, block: ExportBlock): void {
  switch (block.kind) {
    case 'field':
      if (block.isLong) {
        doc.font(FONT_BOLD).fontSize(11).fillColor(COLORS.text);
        doc.text(block.label, { paragraphGap: 4 });
        doc.font(FONT_REGULAR).fontSize(11).fillColor(COLORS.text);
        doc.text(block.value, { paragraphGap: 8, lineGap: 2 });
      } else {
        doc.font(FONT_BOLD).fontSize(11).fillColor(COLORS.text);
        doc.text(`${block.label}: `, { continued: true });
        doc.font(FONT_REGULAR).fillColor(COLORS.text);
        doc.text(block.value, { paragraphGap: 4 });
      }
      break;
    case 'cta':
      doc.font(FONT_BOLD).fontSize(11).fillColor(COLORS.text);
      doc.text(`${block.label}: `, { continued: true });
      doc.font(FONT_ITALIC).fillColor(COLORS.text);
      doc.text(`"${block.text}" `, { continued: true });
      doc.font(FONT_REGULAR).fillColor(COLORS.muted);
      doc.text(`→ ${block.url}`, { paragraphGap: 4 });
      break;
    case 'link':
      doc.font(FONT_REGULAR).fontSize(11).fillColor(COLORS.text);
      doc.text(`${block.label} `, { continued: true });
      doc.fillColor(COLORS.muted);
      doc.text(`→ ${block.url}`, { paragraphGap: 4 });
      break;
  }
}

function writeItem(doc: PDFKit.PDFDocument, item: ExportItem): void {
  if (item.heading === '' && item.blocks.length === 1) {
    writeBlock(doc, item.blocks[0]!);
    return;
  }
  if (item.heading) {
    doc.font(FONT_BOLD).fontSize(11).fillColor(COLORS.text);
    doc.text(item.heading, { paragraphGap: 4 });
  }
  for (const b of item.blocks) writeBlock(doc, b);
  doc.moveDown(0.3);
}

function writeSection(doc: PDFKit.PDFDocument, section: ExportSection): void {
  doc.moveDown(0.6);
  doc.font(FONT_BOLD).fontSize(13).fillColor(COLORS.text);
  doc.text(section.label, { paragraphGap: 6 });
  for (const b of section.pre) writeBlock(doc, b);
  for (const item of section.items) writeItem(doc, item);
  if (section.post.length > 0) {
    doc.moveDown(0.3);
    for (const b of section.post) writeBlock(doc, b);
  }
}

function writePage(
  doc: PDFKit.PDFDocument,
  page: ExportPage,
  isFirst: boolean
): void {
  if (!isFirst) doc.addPage();
  doc.font(FONT_BOLD).fontSize(22).fillColor(COLORS.text);
  doc.text(page.title, { paragraphGap: 2 });
  doc.font(FONT_ITALIC).fontSize(10).fillColor(COLORS.faint);
  doc.text(page.slug ? `/${page.slug}` : '/', { paragraphGap: 12 });
  for (const section of page.sections) writeSection(doc, section);
}

export async function renderDocAsPdf(doc: ExportDoc): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: `Websiteteksten — ${doc.business_name}`,
        Creator: 'Fullfront Webtekst-assistent',
      },
    });

    const chunks: Buffer[] = [];
    pdf.on('data', (chunk) => chunks.push(chunk as Buffer));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    // Cover
    pdf.font(FONT_BOLD).fontSize(28).fillColor(COLORS.text);
    pdf.text('Websiteteksten', { align: 'center' });
    pdf.moveDown(0.4);
    pdf.font(FONT_REGULAR).fontSize(16).fillColor(COLORS.muted);
    pdf.text(doc.business_name, { align: 'center' });
    pdf.moveDown(2);

    // Pages
    for (let i = 0; i < doc.pages.length; i++) {
      writePage(pdf, doc.pages[i]!, i === 0);
    }

    pdf.end();
  });
}

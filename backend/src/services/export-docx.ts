import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type {
  ExportBlock,
  ExportDoc,
  ExportItem,
  ExportSection,
} from './export-render.js';

// ---------------------------------------------------------------------------
// Word (.docx) formatter
// ---------------------------------------------------------------------------

function blockParagraphs(block: ExportBlock): Paragraph[] {
  switch (block.kind) {
    case 'field':
      if (block.isLong) {
        const out: Paragraph[] = [
          new Paragraph({
            children: [new TextRun({ text: block.label, bold: true })],
            spacing: { before: 120, after: 60 },
          }),
        ];
        for (const line of block.value.split('\n')) {
          if (line.trim().length === 0) {
            out.push(new Paragraph({ children: [new TextRun('')] }));
          } else {
            out.push(new Paragraph({ children: [new TextRun(line)] }));
          }
        }
        return out;
      }
      return [
        new Paragraph({
          children: [
            new TextRun({ text: `${block.label}: `, bold: true }),
            new TextRun(block.value),
          ],
        }),
      ];
    case 'cta':
      return [
        new Paragraph({
          children: [
            new TextRun({ text: `${block.label}: `, bold: true }),
            new TextRun({ text: `"${block.text}" `, italics: true }),
            new TextRun({ text: `→ ${block.url}`, color: '666666' }),
          ],
        }),
      ];
    case 'link':
      return [
        new Paragraph({
          children: [
            new TextRun({ text: block.label }),
            new TextRun({ text: ` → ${block.url}`, color: '666666' }),
          ],
        }),
      ];
  }
}

function itemParagraphs(item: ExportItem): Paragraph[] {
  // Compact link-only item (nav/legal): single-line link.
  if (item.heading === '' && item.blocks.length === 1) {
    return blockParagraphs(item.blocks[0]!);
  }
  const out: Paragraph[] = [];
  if (item.heading) {
    out.push(
      new Paragraph({
        children: [new TextRun({ text: item.heading, bold: true })],
        spacing: { before: 120, after: 40 },
      })
    );
  }
  for (const b of item.blocks) out.push(...blockParagraphs(b));
  return out;
}

function sectionParagraphs(section: ExportSection): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun(section.label)],
      spacing: { before: 240, after: 120 },
    })
  );
  for (const b of section.pre) out.push(...blockParagraphs(b));
  for (const item of section.items) out.push(...itemParagraphs(item));
  if (section.post.length > 0) {
    out.push(new Paragraph({ children: [new TextRun('')] }));
    for (const b of section.post) out.push(...blockParagraphs(b));
  }
  return out;
}

export async function renderDocAsDocx(doc: ExportDoc): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Websiteteksten — ${doc.business_name}`)],
      spacing: { after: 400 },
    })
  );

  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i]!;
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(page.title)],
        spacing: { before: 480, after: 60 },
        pageBreakBefore: i > 0,
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: page.slug ? `/${page.slug}` : '/',
            color: '888888',
            italics: true,
          }),
        ],
        spacing: { after: 120 },
      })
    );

    for (const section of page.sections) {
      children.push(...sectionParagraphs(section));
    }
  }

  const docFile = new Document({
    creator: 'Fullfront Webtekst-assistent',
    title: `Websiteteksten — ${doc.business_name}`,
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(docFile);
}

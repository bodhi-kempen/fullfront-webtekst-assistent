import type {
  ExportBlock,
  ExportDoc,
  ExportItem,
  ExportPage,
  ExportSection,
} from './export-render.js';

// ---------------------------------------------------------------------------
// Plain-text formatter — used for "copy-paste per page" and as a sane
// representation of the full export.
// ---------------------------------------------------------------------------

function renderBlock(block: ExportBlock, indent: string = ''): string[] {
  switch (block.kind) {
    case 'field':
      if (block.isLong) {
        return [
          `${indent}${block.label}:`,
          ...block.value.split('\n').map((l) => `${indent}  ${l}`),
        ];
      }
      return [`${indent}${block.label}: ${block.value}`];
    case 'cta':
      return [`${indent}${block.label}: "${block.text}" → ${block.url}`];
    case 'link':
      return [`${indent}${block.label} → ${block.url}`];
  }
}

function renderItem(item: ExportItem, indent: string = ''): string[] {
  const lines: string[] = [];
  // If the item has no heading and exactly one link block, render compactly.
  if (item.heading === '' && item.blocks.length === 1) {
    const b = item.blocks[0]!;
    lines.push(...renderBlock(b, indent));
    return lines;
  }
  if (item.heading) {
    lines.push(`${indent}${item.heading}`);
  }
  for (const b of item.blocks) {
    lines.push(...renderBlock(b, indent + '  '));
  }
  return lines;
}

function renderSection(section: ExportSection): string[] {
  const lines: string[] = [];
  lines.push(`--- ${section.label} ---`);
  for (const b of section.pre) {
    lines.push(...renderBlock(b));
  }
  if (section.items.length > 0) {
    if (section.pre.length > 0) lines.push('');
    for (let i = 0; i < section.items.length; i++) {
      lines.push(...renderItem(section.items[i]!));
    }
  }
  if (section.post.length > 0) {
    lines.push('');
    for (const b of section.post) {
      lines.push(...renderBlock(b));
    }
  }
  return lines;
}

export function renderPageAsText(
  page: ExportPage,
  businessName?: string
): string {
  const lines: string[] = [];
  if (businessName) {
    lines.push(`# ${businessName} — ${page.title}`);
  } else {
    lines.push(`# ${page.title}`);
  }
  if (page.slug !== '' && page.slug !== undefined) {
    lines.push(`(/${page.slug})`);
  } else {
    lines.push('(/)');
  }
  lines.push('');

  for (const section of page.sections) {
    lines.push(...renderSection(section));
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function renderDocAsText(doc: ExportDoc): string {
  const out: string[] = [];
  out.push(`# Website-teksten — ${doc.business_name}`);
  out.push('');
  out.push('='.repeat(60));
  out.push('');
  for (const page of doc.pages) {
    out.push(renderPageAsText(page));
    out.push('='.repeat(60));
    out.push('');
  }
  return out.join('\n');
}

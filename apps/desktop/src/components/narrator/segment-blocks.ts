export function segmentBlocks(
  markdown: string,
  opts: { skipCodeBlocks: boolean; skipFrontmatter: boolean },
): string[] {
  let text = markdown;

  // Strip frontmatter: must start with ---\n and have a closing \n---\n or \n--- at end
  if (opts.skipFrontmatter && text.startsWith("---\n")) {
    const closeIndex = text.indexOf("\n---", 4);
    if (closeIndex !== -1) {
      // Check if it's \n---\n (mid-document) or \n--- at end of string
      const afterClose = closeIndex + 4;
      if (afterClose >= text.length || text[afterClose] === "\n") {
        text = text.slice(afterClose + 1);
      }
    }
  }

  // Strip fenced code blocks
  if (opts.skipCodeBlocks) {
    text = text.replace(/```[\s\S]*?```/g, "");
  }

  // Split on blank lines
  const rawBlocks = text.split(/\n\s*\n/);

  const result: string[] = [];
  for (const raw of rawBlocks) {
    let block = raw;

    // Strip images (before links, since images are ![alt](url))
    block = block.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

    // Strip links — keep label text
    block = block.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

    // Strip bold/italic (order matters: bold before italic)
    block = block.replace(/\*\*([^*]*)\*\*/g, "$1");
    block = block.replace(/__([^_]*)__/g, "$1");
    block = block.replace(/\*([^*]*)\*/g, "$1");
    block = block.replace(/_([^_]*)_/g, "$1");

    // Strip inline code
    block = block.replace(/`([^`]*)`/g, "$1");

    // Strip leading heading markers
    block = block.replace(/^#+\s+/m, "");

    // Strip leading list markers (bullet or numbered, first line only)
    block = block.replace(/^[-*+]\s+/, "");
    block = block.replace(/^\d+\.\s+/, "");

    block = block.trim();

    // Drop horizontal rules
    if (/^[-*_]{3,}$/.test(block)) continue;

    if (block.length > 0) {
      result.push(block);
    }
  }

  return result;
}

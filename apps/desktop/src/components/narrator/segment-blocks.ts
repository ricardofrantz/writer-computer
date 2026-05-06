/** Strip residual punctuation that TTS engines tend to pronounce literally
 *  ("quote", "open paren") or that adds awkward pauses. Run AFTER block
 *  segmentation — segmentation is about block boundaries, this is about
 *  "what should the synth actually say". Single-pass regex chain so the
 *  cost stays linear in block length. */
export function sanitizeForTts(text: string): string {
  return (
    text
      // HTML tags that escaped the markdown stripper (rare but happens with
      // raw HTML inside paragraphs).
      .replace(/<[^>]+>/g, " ")
      // Quote marks: ASCII straight quotes, smart quotes, French/Portuguese
      // guillemets, German low-9, Japanese 「」. All pronounced as "quote"
      // by most TTS engines — drop entirely.
      .replace(/[“”„‟"«»‹›「」『』]/g, "")
      .replace(/['‘’‚‛]/g, "")
      // Backticks, pipes, square brackets, curly braces — markdown / table
      // syntax that occasionally leaks past the block-level stripper.
      .replace(/[`|[\]{}]/g, " ")
      // Bare URLs — let the engine say "link" rather than spelling out the
      // URL character by character. Match http(s) and www.
      .replace(/https?:\/\/\S+/g, " link ")
      .replace(/\bwww\.\S+/g, " link ")
      // Multiple spaces / leftover whitespace from substitutions above.
      .replace(/\s+/g, " ")
      .trim()
  );
}

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

    // Strip residual TTS-noisy punctuation (smart quotes, brackets, URLs, …).
    // Done last so block boundary detection above isn't confused by quotes.
    block = sanitizeForTts(block);

    if (block.length > 0) {
      result.push(block);
    }
  }

  return result;
}

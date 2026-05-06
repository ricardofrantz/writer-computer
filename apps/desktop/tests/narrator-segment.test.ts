import { describe, expect, test } from "vite-plus/test";
import { segmentBlocks } from "../src/components/narrator/segment-blocks";

describe("segmentBlocks", () => {
  test("strips frontmatter when skipFrontmatter is true", () => {
    const input = "---\nfoo: bar\n---\nHello world";
    const result = segmentBlocks(input, { skipCodeBlocks: false, skipFrontmatter: true });
    expect(result).toEqual(["Hello world"]);
  });

  test("preserves frontmatter content when skipFrontmatter is false", () => {
    const input = "---\nfoo: bar\n---\nHello world";
    const result = segmentBlocks(input, { skipCodeBlocks: false, skipFrontmatter: false });
    // The entire text (including frontmatter) is treated as a single block
    expect(result.join(" ")).toContain("foo");
  });

  test("strips fenced code blocks when skipCodeBlocks is true", () => {
    const input = "Before\n\n```js\nconsole.log('hi');\n```\n\nAfter";
    const result = segmentBlocks(input, { skipCodeBlocks: true, skipFrontmatter: false });
    expect(result).toContain("Before");
    expect(result).toContain("After");
    const joined = result.join(" ");
    expect(joined).not.toContain("console.log");
  });

  test("preserves code block content when skipCodeBlocks is false", () => {
    const input = "Before\n\n```js\nconsole.log('hi');\n```\n\nAfter";
    const result = segmentBlocks(input, { skipCodeBlocks: false, skipFrontmatter: false });
    const joined = result.join(" ");
    expect(joined).toContain("console.log");
  });

  test("strips heading hashes", () => {
    const result = segmentBlocks("# Title", { skipCodeBlocks: false, skipFrontmatter: false });
    expect(result).toEqual(["Title"]);
  });

  test("strips bullet list markers", () => {
    const result = segmentBlocks("- item one", { skipCodeBlocks: false, skipFrontmatter: false });
    expect(result).toEqual(["item one"]);
  });

  test("strips numbered list markers", () => {
    const result = segmentBlocks("1. first", { skipCodeBlocks: false, skipFrontmatter: false });
    expect(result).toEqual(["first"]);
  });

  test("strips bold and italic inline syntax", () => {
    const result = segmentBlocks("**bold** and *italic*", {
      skipCodeBlocks: false,
      skipFrontmatter: false,
    });
    expect(result).toEqual(["bold and italic"]);
  });

  test("strips inline code backticks", () => {
    const result = segmentBlocks("`code`", { skipCodeBlocks: false, skipFrontmatter: false });
    expect(result).toEqual(["code"]);
  });

  test("strips links keeping label text", () => {
    const result = segmentBlocks("[click here](https://example.com)", {
      skipCodeBlocks: false,
      skipFrontmatter: false,
    });
    expect(result).toEqual(["click here"]);
  });

  test("drops image-only blocks", () => {
    const result = segmentBlocks("![alt text](img.png)", {
      skipCodeBlocks: false,
      skipFrontmatter: false,
    });
    expect(result).toEqual([]);
  });

  test("drops horizontal rules", () => {
    const result = segmentBlocks("---", { skipCodeBlocks: false, skipFrontmatter: false });
    expect(result).toEqual([]);
  });

  test("returns empty array for empty string", () => {
    const result = segmentBlocks("", { skipCodeBlocks: false, skipFrontmatter: false });
    expect(result).toEqual([]);
  });

  test("splits multiple paragraphs into separate entries", () => {
    const input = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const result = segmentBlocks(input, { skipCodeBlocks: false, skipFrontmatter: false });
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("First paragraph.");
    expect(result[1]).toBe("Second paragraph.");
    expect(result[2]).toBe("Third paragraph.");
  });
});

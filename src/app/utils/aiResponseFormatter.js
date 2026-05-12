
/**
 * Parses a markdown-like string into a structured array of blocks.
 * @param {string} text The raw response text from the AI.
 * @returns {Array} Array of structured blocks (paragraph, heading, numbered_list, bulleted_list).
 */
export const formatStructuredResponse = (text) => {
  if (typeof text !== "string") return text;

  const blocks = [];
  const lines = text.split("\n");

  let currentList = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Don't close the list immediately if the next non-empty line is a list item of the same type
      let nextNonEmptyLine = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          nextNonEmptyLine = lines[j].trim();
          break;
        }
      }

      if (currentList) {
        const isNextNumbered = /^(\d+)\.\s+/.test(nextNonEmptyLine);
        const isNextBulleted = /^[-*]\s+/.test(nextNonEmptyLine);

        if (
          (currentList.type === "numbered_list" && isNextNumbered) ||
          (currentList.type === "bulleted_list" && isNextBulleted)
        ) {
          // Keep the list open, just skip this empty line
          continue;
        } else {
          blocks.push(currentList);
          currentList = null;
        }
      }
      continue;
    }

    // Numbered list: "1. **Title**: content" or "1. content"
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== "numbered_list") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "numbered_list", items: [] };
      }

      const content = numberedMatch[2];
      const boldMatch = content.match(/^\*\*(.*?)\*\*[:\s]*(.*)/);
      if (boldMatch) {
        currentList.items.push({
          title: boldMatch[1],
          text: boldMatch[2].trim(),
        });
      } else {
        currentList.items.push({ text: content });
      }
      continue;
    }

    // Bullet list: "- **Title**: content" or "- content"
    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "bulleted_list") {
        if (currentList) blocks.push(currentList);
        currentList = { type: "bulleted_list", items: [] };
      }

      const content = bulletMatch[1];
      const boldMatch = content.match(/^\*\*(.*?)\*\*[:\s]*(.*)/);
      if (boldMatch) {
        currentList.items.push({
          title: boldMatch[1],
          text: boldMatch[2].trim(),
        });
      } else {
        currentList.items.push({ text: content });
      }
      continue;
    }

    // If we were in a list but this line doesn't match, close the list
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }

    // Check for "Heading" (all bold line)
    const headingMatch = line.match(/^\*\*(.*?)\*\*$/);
    if (headingMatch) {
      blocks.push({ type: "heading", text: headingMatch[1] });
      continue;
    }

    // Default to paragraph
    blocks.push({ type: "paragraph", text: line });
  }

  if (currentList) {
    blocks.push(currentList);
  }

  return blocks;
};

/**
 * Deeply traverses an object and formats any "response", "output", or "summary" string fields.
 * @param {any} obj The object to transform.
 * @param {object} [options] Formatting options.
 * @param {string[]} [options.excludeFields] Fields to skip.
 * @returns {any} The transformed object.
 */
export const formatAiResponseObject = (obj, options = {}) => {
  const { excludeFields = [] } = options;
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => formatAiResponseObject(item, options));
  }

  const result = { ...obj };
  const targetFields = ["response", "output", "result", "content", "summary"];

  for (const key in result) {
    if (
      targetFields.includes(key) &&
      !excludeFields.includes(key) &&
      typeof result[key] === "string"
    ) {
      const trimmed = result[key].trim();
      let parsed = result[key];
      
      // Try to parse as JSON if it looks like an object or array
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          parsed = JSON.parse(trimmed);
        } catch (e) {
          // Not valid JSON, keep as string
        }
      }

      if (typeof parsed === "object" && parsed !== null) {
        // If it was JSON, recurse into the parsed object
        result[key] = formatAiResponseObject(parsed);
      } else {
        // If it's a regular string, apply structured formatting
        result[`structured_${key}`] = formatStructuredResponse(result[key]);
        result[key] = formatStructuredResponse(result[key]);
      }
    } else if (typeof result[key] === "object") {
      result[key] = formatAiResponseObject(result[key], options);
    }
  }

  return result;
};

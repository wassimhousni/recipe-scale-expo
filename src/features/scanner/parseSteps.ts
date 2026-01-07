/**
 * Step parser for extracting cooking instructions from OCR text.
 */

/**
 * Common section headers that indicate the start of cooking instructions.
 */
const STEP_HEADERS = [
  'instructions',
  'directions',
  'steps',
  'method',
  'preparation',
  'procedure',
  'how to make',
  'to make',
];

/**
 * Headers that indicate the end of the steps section (start of another section).
 */
const SECTION_END_HEADERS = [
  'ingredients',
  'notes',
  'tips',
  'nutrition',
  'nutritional',
  'serving',
  'servings',
  'yield',
  'makes',
  'storage',
  'variations',
];

/**
 * Regex pattern for numbered steps: "1.", "1)", "1:", "Step 1", "Step 1:", etc.
 */
const NUMBERED_STEP_REGEX = /^(?:step\s*)?(\d+)[.):\s]\s*/i;

/**
 * Regex pattern for bullet points: "-", "•", "*", "·"
 */
const BULLET_REGEX = /^[-•*·]\s*/;

/**
 * Checks if a line is a section header.
 *
 * @param line - The line to check
 * @param headers - Array of header strings to match against
 * @returns True if the line matches a header
 */
function isHeader(line: string, headers: string[]): boolean {
  const normalized = line.toLowerCase().replace(/[:\s]+$/, '').trim();
  return headers.some((header) => normalized === header || normalized.startsWith(header + ' '));
}

/**
 * Cleans a step line by removing numbering, bullets, and extra whitespace.
 *
 * @param line - The raw line to clean
 * @returns Cleaned step text
 */
function cleanStepLine(line: string): string {
  let cleaned = line.trim();

  // Remove numbered prefix (1., 1), Step 1:, etc.)
  cleaned = cleaned.replace(NUMBERED_STEP_REGEX, '');

  // Remove bullet prefix
  cleaned = cleaned.replace(BULLET_REGEX, '');

  // Trim again after removing prefix
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extracts steps from text starting after a header until the next section or end.
 *
 * @param lines - Array of text lines
 * @param startIndex - Index to start extracting from (after the header)
 * @returns Array of step strings
 */
function extractStepsFromSection(lines: string[], startIndex: number): string[] {
  const steps: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop if we hit another section header
    if (isHeader(line, SECTION_END_HEADERS)) {
      break;
    }

    // Skip empty lines
    if (!line) continue;

    // Skip if it looks like an ingredient (starts with a quantity)
    if (/^\d+\s*[\d/]*\s*(cup|tsp|tbsp|oz|g|ml|lb)/i.test(line)) {
      continue;
    }

    const cleaned = cleanStepLine(line);

    // Only add non-empty steps
    if (cleaned) {
      steps.push(cleaned);
    }
  }

  return steps;
}

/**
 * Attempts to find numbered steps anywhere in the text.
 * Used as a fallback when no section header is found.
 *
 * @param lines - Array of text lines
 * @returns Array of step strings
 */
function findNumberedSteps(lines: string[]): string[] {
  const steps: string[] = [];
  const numberedLines: Array<{ num: number; text: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(NUMBERED_STEP_REGEX);
    if (match) {
      const stepNum = parseInt(match[1], 10);
      const cleaned = cleanStepLine(trimmed);

      if (cleaned) {
        numberedLines.push({ num: stepNum, text: cleaned });
      }
    }
  }

  // Only return if we found at least 2 numbered steps that look sequential
  if (numberedLines.length >= 2) {
    // Sort by step number
    numberedLines.sort((a, b) => a.num - b.num);

    // Check if they appear somewhat sequential (starting from 1 or close to it)
    if (numberedLines[0].num <= 2) {
      for (const item of numberedLines) {
        steps.push(item.text);
      }
    }
  }

  return steps;
}

/**
 * Attempts to find bulleted steps when no numbered steps or headers are found.
 *
 * @param lines - Array of text lines
 * @returns Array of step strings
 */
function findBulletedSteps(lines: string[]): string[] {
  const steps: string[] = [];
  let inBulletSection = false;
  let consecutiveBullets = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      // Reset if we hit an empty line after bullets
      if (inBulletSection && consecutiveBullets >= 2) {
        break;
      }
      continue;
    }

    if (BULLET_REGEX.test(trimmed)) {
      const cleaned = cleanStepLine(trimmed);

      // Skip lines that look like ingredients
      if (/^\d+\s*[\d/]*\s*(cup|tsp|tbsp|oz|g|ml|lb)/i.test(cleaned)) {
        continue;
      }

      // Steps are usually longer than ingredients
      if (cleaned.length > 15) {
        steps.push(cleaned);
        inBulletSection = true;
        consecutiveBullets++;
      }
    } else if (inBulletSection) {
      // Non-bullet line after bullets, might be continuation or end
      consecutiveBullets = 0;
    }
  }

  // Only return if we found meaningful steps
  return steps.length >= 2 ? steps : [];
}

/**
 * Parse steps from OCR text.
 * Looks for numbered steps or lines after "Instructions:", "Directions:",
 * "Steps:", "Method:" headers.
 *
 * @param text - Raw OCR text
 * @returns Array of step strings
 *
 * @example
 * const text = `
 * Chocolate Cake
 *
 * Ingredients:
 * - 2 cups flour
 * - 1 cup sugar
 *
 * Instructions:
 * 1. Preheat oven to 350°F
 * 2. Mix dry ingredients
 * 3. Add wet ingredients
 * 4. Bake for 30 minutes
 * `;
 *
 * const steps = parseSteps(text);
 * // Returns:
 * // [
 * //   "Preheat oven to 350°F",
 * //   "Mix dry ingredients",
 * //   "Add wet ingredients",
 * //   "Bake for 30 minutes"
 * // ]
 */
export function parseSteps(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split('\n');

  // First, try to find a section header
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (isHeader(line, STEP_HEADERS)) {
      const steps = extractStepsFromSection(lines, i + 1);
      if (steps.length > 0) {
        return steps;
      }
    }
  }

  // Fallback: look for numbered steps anywhere
  const numberedSteps = findNumberedSteps(lines);
  if (numberedSteps.length > 0) {
    return numberedSteps;
  }

  // Fallback: look for bulleted steps that look like instructions
  const bulletedSteps = findBulletedSteps(lines);
  if (bulletedSteps.length > 0) {
    return bulletedSteps;
  }

  // No steps found
  return [];
}

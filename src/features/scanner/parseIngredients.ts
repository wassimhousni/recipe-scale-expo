import type { Ingredient } from '../recipes/recipeTypes';

/**
 * Common unit patterns for ingredient parsing.
 * Includes singular and plural forms.
 */
const UNIT_PATTERNS = [
  // Weight
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'oz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds',
  // Volume
  'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres',
  'l', 'liter', 'liters', 'litre', 'litres',
  'cup', 'cups',
  'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons',
  'fl oz', 'fluid ounce', 'fluid ounces',
  // Other
  'pinch', 'pinches',
  'dash', 'dashes',
  'bunch', 'bunches',
  'clove', 'cloves',
  'slice', 'slices',
  'piece', 'pieces',
  'can', 'cans',
  'package', 'packages', 'pkg',
  'stick', 'sticks',
];

/**
 * Parses a fraction string to a decimal number.
 * Handles formats like "1/2", "3/4", mixed numbers like "1 1/2".
 *
 * @param fractionStr - The fraction string to parse
 * @returns The decimal equivalent, or NaN if invalid
 *
 * @example
 * parseFraction("1/2") // 0.5
 * parseFraction("3/4") // 0.75
 * parseFraction("1 1/2") // 1.5
 */
function parseFraction(fractionStr: string): number {
  const trimmed = fractionStr.trim();

  // Check for mixed number (e.g., "1 1/2")
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const numerator = parseInt(mixedMatch[2], 10);
    const denominator = parseInt(mixedMatch[3], 10);
    if (denominator === 0) return NaN;
    return whole + numerator / denominator;
  }

  // Check for simple fraction (e.g., "1/2")
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);
    if (denominator === 0) return NaN;
    return numerator / denominator;
  }

  // Try parsing as a regular number
  return parseFloat(trimmed);
}

/**
 * Generates a unique ID for an ingredient.
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp + random.
 *
 * @returns A unique string identifier
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parses OCR text into structured ingredient objects.
 *
 * @param ocrText - Raw text from OCR, with ingredients on separate lines
 * @returns Array of parsed Ingredient objects
 *
 * @example
 * const text = `
 * 2 cups all-purpose flour
 * 1/2 cup sugar
 * 3 eggs
 * 100 ml milk
 * `;
 *
 * const ingredients = parseIngredients(text);
 * // Returns:
 * // [
 * //   { id: "...", quantity: 2, unit: "cups", label: "all-purpose flour" },
 * //   { id: "...", quantity: 0.5, unit: "cup", label: "sugar" },
 * //   { id: "...", quantity: 3, unit: undefined, label: "eggs" },
 * //   { id: "...", quantity: 100, unit: "ml", label: "milk" },
 * // ]
 */
export function parseIngredients(ocrText: string): Ingredient[] {
  const ingredients: Ingredient[] = [];
  const lines = ocrText.split('\n');

  // Build regex pattern for units (case-insensitive, word boundary)
  const unitPatternStr = UNIT_PATTERNS.map((u) => u.replace(/\s+/g, '\\s+')).join('|');
  const unitRegex = new RegExp(`^(${unitPatternStr})\\b`, 'i');

  for (const line of lines) {
    // Clean up the line: remove leading dashes, bullets, asterisks, and whitespace
    const cleanedLine = line.replace(/^[\s\-*•]+/, '').trim();

    if (!cleanedLine) continue;

    // Pattern to match quantity at start of line
    // Matches: "2", "2.5", "1/2", "1 1/2", ".5"
    const quantityMatch = cleanedLine.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*/);

    if (!quantityMatch) continue;

    const quantityStr = quantityMatch[1];
    const quantity = parseFraction(quantityStr);

    if (isNaN(quantity) || quantity <= 0) continue;

    // Get the rest of the line after the quantity
    let remainder = cleanedLine.slice(quantityMatch[0].length).trim();

    if (!remainder) continue;

    // Try to extract unit
    let unit: string | undefined;
    const unitMatch = remainder.match(unitRegex);

    if (unitMatch) {
      unit = unitMatch[1].toLowerCase();
      remainder = remainder.slice(unitMatch[0].length).trim();
    }

    // The rest is the label (ingredient name)
    // Remove common prefixes like "of "
    const label = remainder.replace(/^of\s+/i, '').trim();

    if (!label) continue;

    ingredients.push({
      id: generateId(),
      quantity,
      unit,
      label,
    });
  }

  return ingredients;
}
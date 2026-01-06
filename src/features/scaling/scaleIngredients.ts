import type { Ingredient } from '../recipes/recipeTypes';

/**
 * Scales ingredient quantities based on serving size changes.
 *
 * This is a pure function that returns a new array with scaled quantities.
 * The original array is not mutated.
 *
 * @param ingredients - Array of ingredients to scale
 * @param originalServings - The original number of servings in the recipe
 * @param targetServings - The desired number of servings
 * @returns New array of ingredients with scaled quantities
 *
 * @example
 * const ingredients = [
 *   { id: "1", quantity: 2, unit: "cups", label: "flour" },
 *   { id: "2", quantity: 1, unit: "tsp", label: "salt" },
 * ];
 *
 * // Scale from 4 servings to 8 servings (double)
 * const scaled = scaleIngredients(ingredients, 4, 8);
 * // Returns:
 * // [
 * //   { id: "1", quantity: 4, unit: "cups", label: "flour" },
 * //   { id: "2", quantity: 2, unit: "tsp", label: "salt" },
 * // ]
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  originalServings: number,
  targetServings: number
): Ingredient[] {
  // Handle edge cases: invalid servings values
  if (originalServings <= 0 || targetServings <= 0) {
    // Return a shallow copy to maintain immutability contract
    return ingredients.map((ingredient) => ({ ...ingredient }));
  }

  // Handle edge case: same servings (no scaling needed)
  if (originalServings === targetServings) {
    return ingredients.map((ingredient) => ({ ...ingredient }));
  }

  const scalingFactor = targetServings / originalServings;

  return ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity * scalingFactor,
  }));
}

/**
 * Formats a scaled quantity for display.
 * Rounds to a reasonable number of decimal places and handles common fractions.
 *
 * @param quantity - The quantity to format
 * @param maxDecimals - Maximum decimal places (default: 2)
 * @returns Formatted quantity string
 *
 * @example
 * formatQuantity(1.5) // "1.5"
 * formatQuantity(2.0) // "2"
 * formatQuantity(0.333333) // "0.33"
 */
export function formatQuantity(quantity: number, maxDecimals: number = 2): string {
  // Round to specified decimal places
  const rounded = Math.round(quantity * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);

  // Remove trailing zeros
  return rounded.toString();
}
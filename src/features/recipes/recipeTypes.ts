/**
 * Core types for recipe and ingredient data structures.
 */

/**
 * Represents a single ingredient in a recipe.
 */
export interface Ingredient {
  /** Unique identifier for the ingredient */
  id: string;
  /** Normalized quantity as a number (fractions parsed to float, e.g., 1/2 → 0.5) */
  quantity: number;
  /** Unit of measurement (e.g., "g", "ml", "cup", "tsp"). Undefined for countable items like "eggs" */
  unit?: string;
  /** Ingredient name/description */
  label: string;
}

/**
 * Represents a complete recipe with ingredients and serving information.
 */
export interface Recipe {
  /** Unique identifier for the recipe */
  id: string;
  /** Recipe title/name */
  title: string;
  /** Original number of servings from the recipe */
  originalServings: number;
  /** Current scaled number of servings */
  currentServings: number;
  /** List of ingredients in the recipe */
  ingredients: Ingredient[];
  /** Original OCR text for reference */
  rawText?: string;
  /** ISO 8601 timestamp of when the recipe was created */
  createdAt: string;
}
/**
 * Pure functions for filtering, searching, and sorting recipes.
 */

import type { RecipeV2, Category } from './recipeTypesV2';

/**
 * Sort options for recipes.
 */
export type SortBy = 'recent' | 'created' | 'alphabetical';

/**
 * Filter recipes by category.
 *
 * @param recipes - Array of recipes
 * @param category - Category to filter by, or null for all
 * @returns Filtered recipes
 *
 * @example
 * const entrees = filterByCategory(recipes, 'entree');
 * const all = filterByCategory(recipes, null);
 */
export function filterByCategory(
  recipes: RecipeV2[],
  category: Category | null
): RecipeV2[] {
  if (category === null) {
    return recipes;
  }

  return recipes.filter((recipe) => recipe.category === category);
}

/**
 * Filter recipes by tags.
 * Returns recipes that contain ALL specified tags.
 *
 * @param recipes - Array of recipes
 * @param tags - Tags to filter by (recipes must have ALL tags)
 * @returns Filtered recipes
 *
 * @example
 * const veggie = filterByTags(recipes, ['vegetarian']);
 * const quickVeggie = filterByTags(recipes, ['vegetarian', 'quick']);
 */
export function filterByTags(recipes: RecipeV2[], tags: string[]): RecipeV2[] {
  if (tags.length === 0) {
    return recipes;
  }

  const normalizedTags = tags.map((tag) => tag.toLowerCase());

  return recipes.filter((recipe) => {
    const recipeTags = recipe.tags.map((tag) => tag.toLowerCase());
    return normalizedTags.every((tag) => recipeTags.includes(tag));
  });
}

/**
 * Search recipes by query.
 * Searches case-insensitive in title, ingredient names, and steps.
 *
 * @param recipes - Array of recipes
 * @param query - Search query (case-insensitive)
 * @returns Matching recipes
 *
 * @example
 * const results = searchRecipes(recipes, 'chocolate');
 * const results = searchRecipes(recipes, 'bake 350');
 */
export function searchRecipes(recipes: RecipeV2[], query: string): RecipeV2[] {
  const trimmedQuery = query.trim().toLowerCase();

  if (!trimmedQuery) {
    return recipes;
  }

  return recipes.filter((recipe) => {
    // Search in title
    if (recipe.title.toLowerCase().includes(trimmedQuery)) {
      return true;
    }

    // Search in ingredient names
    for (const ingredient of recipe.ingredients) {
      if (ingredient.name.toLowerCase().includes(trimmedQuery)) {
        return true;
      }
    }

    // Search in steps
    for (const step of recipe.steps) {
      if (step.toLowerCase().includes(trimmedQuery)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Sort recipes by specified criteria.
 * Returns a new array (does not mutate input).
 *
 * @param recipes - Array of recipes
 * @param sortBy - Sort option: 'recent', 'created', or 'alphabetical'
 * @returns Sorted recipes (new array)
 *
 * @example
 * const byRecent = sortRecipes(recipes, 'recent');
 * const alphabetical = sortRecipes(recipes, 'alphabetical');
 */
export function sortRecipes(recipes: RecipeV2[], sortBy: SortBy): RecipeV2[] {
  const sorted = [...recipes];

  switch (sortBy) {
    case 'recent':
      // Sort by updated_at descending (newest first)
      sorted.sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateB - dateA;
      });
      break;

    case 'created':
      // Sort by created_at descending (newest first)
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      break;

    case 'alphabetical':
      // Sort by title ascending (A-Z)
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  return sorted;
}

/**
 * Get all unique tags from recipes.
 *
 * @param recipes - Array of recipes
 * @returns Array of unique tags, sorted alphabetically
 *
 * @example
 * const tags = getAllTags(recipes);
 * // ['dessert', 'quick', 'vegetarian']
 */
export function getAllTags(recipes: RecipeV2[]): string[] {
  const tagSet = new Set<string>();

  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      tagSet.add(tag.toLowerCase());
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}
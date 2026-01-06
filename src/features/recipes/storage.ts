import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Recipe } from './recipeTypes';

/** Storage key for recipes data */
const STORAGE_KEY = 'RECIPES_V1';

/**
 * Generates a unique ID for a new recipe.
 * Uses timestamp combined with random string for uniqueness.
 *
 * @returns A unique string identifier
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load all saved recipes from storage.
 * Returns empty array if no recipes exist or on parse error.
 *
 * @returns Promise resolving to array of Recipe objects
 *
 * @example
 * const recipes = await loadRecipes();
 * console.log(`Found ${recipes.length} recipes`);
 */
export async function loadRecipes(): Promise<Recipe[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);

    if (!json) {
      return [];
    }

    const recipes = JSON.parse(json);

    // Validate that we got an array
    if (!Array.isArray(recipes)) {
      console.warn('Invalid recipes data in storage, returning empty array');
      return [];
    }

    return recipes as Recipe[];
  } catch (error) {
    console.error('Error loading recipes from storage:', error);
    return [];
  }
}

/**
 * Save a new recipe to storage.
 * Generates id and createdAt automatically.
 * Appends to existing recipes list.
 *
 * @param recipe - Recipe data without id and createdAt
 * @returns Promise resolving to the saved recipe with generated fields
 *
 * @example
 * const saved = await saveRecipe({
 *   title: "Chocolate Cake",
 *   originalServings: 8,
 *   currentServings: 8,
 *   ingredients: [...],
 * });
 * console.log(`Saved recipe with id: ${saved.id}`);
 */
export async function saveRecipe(
  recipe: Omit<Recipe, 'id' | 'createdAt'>
): Promise<Recipe> {
  const newRecipe: Recipe = {
    ...recipe,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  const recipes = await loadRecipes();
  recipes.push(newRecipe);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));

  return newRecipe;
}

/**
 * Get a single recipe by ID.
 *
 * @param id - The recipe ID to find
 * @returns Promise resolving to the recipe, or null if not found
 *
 * @example
 * const recipe = await getRecipeById("123456");
 * if (recipe) {
 *   console.log(`Found: ${recipe.title}`);
 * }
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  const recipes = await loadRecipes();
  return recipes.find((recipe) => recipe.id === id) ?? null;
}

/**
 * Update an existing recipe in storage.
 * Replaces the recipe with matching ID.
 *
 * @param recipe - The updated recipe (must include id)
 * @throws Error if recipe with given ID is not found
 *
 * @example
 * const recipe = await getRecipeById("123");
 * if (recipe) {
 *   recipe.currentServings = 4;
 *   await updateRecipe(recipe);
 * }
 */
export async function updateRecipe(recipe: Recipe): Promise<void> {
  const recipes = await loadRecipes();
  const index = recipes.findIndex((r) => r.id === recipe.id);

  if (index === -1) {
    throw new Error(`Recipe with id "${recipe.id}" not found`);
  }

  recipes[index] = recipe;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

/**
 * Delete a recipe by ID.
 * No-op if recipe doesn't exist.
 *
 * @param id - The ID of the recipe to delete
 *
 * @example
 * await deleteRecipe("123456");
 */
export async function deleteRecipe(id: string): Promise<void> {
  const recipes = await loadRecipes();
  const filtered = recipes.filter((recipe) => recipe.id !== id);

  // Only write if something was actually removed
  if (filtered.length !== recipes.length) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

/**
 * Clear all recipes from storage.
 * Useful for testing or reset functionality.
 *
 * @example
 * await clearAllRecipes();
 */
export async function clearAllRecipes(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
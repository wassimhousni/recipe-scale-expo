/**
 * Recipe cache for offline access using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecipeV2 } from './recipeTypesV2';

/** Storage key for V2 recipes cache */
const CACHE_KEY = 'RECIPES_CACHE_V2';

/** Storage key for old MVP recipes (V1) */
const MVP_CACHE_KEY = 'RECIPES_V1';

/**
 * Cache recipes locally for offline access.
 * Overwrites any existing cache.
 *
 * @param recipes - Array of recipes to cache
 */
export async function cacheRecipes(recipes: RecipeV2[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recipes));
  } catch (error) {
    console.error('Error caching recipes:', error);
  }
}

/**
 * Get cached recipes for offline access.
 * Returns empty array if no cache exists or on parse error.
 *
 * @returns Promise resolving to array of cached recipes
 */
export async function getCachedRecipes(): Promise<RecipeV2[]> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);

    if (!json) {
      return [];
    }

    const recipes = JSON.parse(json);

    if (!Array.isArray(recipes)) {
      console.warn('Invalid recipes cache data, returning empty array');
      return [];
    }

    return recipes as RecipeV2[];
  } catch (error) {
    console.error('Error getting cached recipes:', error);
    return [];
  }
}

/**
 * Clear the recipe cache.
 * Useful for logout or cache invalidation.
 */
export async function clearRecipeCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing recipe cache:', error);
  }
}

/**
 * Clear old MVP recipes (V1) on V2 migration.
 * Call this once when migrating to V2 to remove local-only MVP data.
 */
export async function clearMvpRecipes(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MVP_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing MVP recipes:', error);
  }
}

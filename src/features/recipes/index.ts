/**
 * Recipe feature barrel export.
 */

// V2 Types
export type {
  Category,
  IngredientV2,
  RecipeV2,
  CreateRecipeData,
  UpdateRecipeData,
} from './recipeTypesV2';

// V2 Supabase Service
export {
  fetchRecipes,
  fetchRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from './recipeService';

// V2 Cache
export {
  cacheRecipes,
  getCachedRecipes,
  clearRecipeCache,
  clearMvpRecipes,
} from './recipeCache';

// V1 Types (legacy, for migration reference)
export type { Ingredient, Recipe } from './recipeTypes';

// V1 Storage (legacy, for migration)
export {
  loadRecipes,
  saveRecipe,
  getRecipeById,
  updateRecipe as updateRecipeV1,
  deleteRecipe as deleteRecipeV1,
  clearAllRecipes,
} from './storage';

// Share functionality
export {
  shareRecipe,
  copyRecipeToClipboard,
  shareRecipeAsText,
  generateRecipePdf,
  formatRecipeAsText,
} from './shareRecipe';

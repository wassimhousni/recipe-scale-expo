/**
 * Recipe V2 type definitions for Supabase storage.
 */

/**
 * Recipe category options.
 */
export type Category = 'appetizer' | 'entree' | 'dessert' | 'snack' | 'drink' | 'other';

/**
 * Ingredient with quantity, unit, and name.
 */
export interface IngredientV2 {
  quantity: number;
  unit?: string;
  name: string;
  notes?: string;
}

/**
 * Recipe V2 stored in Supabase.
 */
export interface RecipeV2 {
  id: string;
  user_id: string;
  title: string;
  ingredients: IngredientV2[];
  steps: string[];
  original_servings: number;
  category: Category;
  tags: string[];
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating a new recipe (no id, timestamps auto-generated).
 */
export interface CreateRecipeData {
  title: string;
  ingredients: IngredientV2[];
  steps: string[];
  original_servings: number;
  category: Category;
  tags: string[];
  photo_url?: string;
  notes?: string;
}

/**
 * Data for updating an existing recipe.
 */
export interface UpdateRecipeData extends Partial<CreateRecipeData> {
  id: string;
}

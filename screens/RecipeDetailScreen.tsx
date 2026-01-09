import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchRecipeById, deleteRecipe } from '../src/features/recipes/recipeService';
import { scaleIngredients } from '../src/features/scaling/scaleIngredients';
import {
  shareRecipe,
  generateRecipePdf,
  copyRecipeToClipboard,
} from '../src/features/recipes/shareRecipe';
import * as Sharing from 'expo-sharing';
import type { RecipeV2, IngredientV2 } from '../src/features/recipes/recipeTypesV2';
import type { Recipe, Ingredient } from '../src/features/recipes/recipeTypes';
import { IngredientList } from '../src/components/IngredientList';
import { ServingsControl } from '../src/components/ServingsControl';

interface RecipeDetailScreenProps {
  /** ID of the recipe to display */
  recipeId: string;
  /** Callback to go back to list */
  onBack: () => void;
  /** Callback after recipe is deleted */
  onDelete: () => void;
  /** Callback to edit the recipe */
  onEdit?: (recipe: RecipeV2) => void;
  /** Callback to start cook mode */
  onCook?: (recipe: RecipeV2, targetServings: number) => void;
}

/**
 * Maps IngredientV2 array to Ingredient array for compatibility with
 * existing scaling and UI components.
 */
function mapIngredientsV2ToV1(ingredients: IngredientV2[]): Ingredient[] {
  return ingredients.map((ing, index) => ({
    id: `ing-${index}`,
    quantity: ing.quantity,
    unit: ing.unit,
    label: ing.name,
  }));
}

/**
 * Maps RecipeV2 to Recipe for compatibility with existing share functions.
 */
function mapRecipeV2ToV1(recipe: RecipeV2, currentServings: number): Recipe {
  return {
    id: recipe.id,
    title: recipe.title,
    originalServings: recipe.original_servings,
    currentServings,
    ingredients: mapIngredientsV2ToV1(recipe.ingredients),
    createdAt: recipe.created_at,
  };
}

/**
 * Formats a category value for display.
 */
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Screen displaying a single recipe with scaling controls.
 * Fetches from Supabase, allows viewing, scaling, and deleting.
 */
export default function RecipeDetailScreen({
  recipeId,
  onBack,
  onDelete,
  onEdit,
  onCook,
}: RecipeDetailScreenProps) {
  const [recipe, setRecipe] = useState<RecipeV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [originalServings, setOriginalServings] = useState(4);
  const [targetServings, setTargetServings] = useState(4);

  // Load recipe on mount
  useEffect(() => {
    (async () => {
      const { recipe: loaded, error } = await fetchRecipeById(recipeId);
      if (error) {
        console.error('Error fetching recipe:', error);
      }
      if (loaded) {
        setRecipe(loaded);
        setOriginalServings(loaded.original_servings);
        setTargetServings(loaded.original_servings);
      }
      setIsLoading(false);
    })();
  }, [recipeId]);

  // Map V2 ingredients to V1 format for components
  const ingredientsV1 = useMemo(() => {
    if (!recipe) return [];
    return mapIngredientsV2ToV1(recipe.ingredients);
  }, [recipe]);

  // Compute scaled ingredients
  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return scaleIngredients(ingredientsV1, originalServings, targetServings);
  }, [ingredientsV1, originalServings, targetServings]);

  // Handle delete with confirmation
  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error } = await deleteRecipe(recipeId);
              if (error) {
                Alert.alert('Error', error);
                setIsDeleting(false);
              } else {
                onDelete();
              }
            } catch {
              Alert.alert('Error', 'Failed to delete recipe. Please try again.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Handle share recipe
  const handleShare = async () => {
    if (!recipe) return;
    try {
      const recipeV1 = mapRecipeV2ToV1(recipe, targetServings);
      await shareRecipe(recipeV1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share recipe';
      Alert.alert('Share', message);
    }
  };

  // Handle export PDF
  const handleExportPdf = async () => {
    if (!recipe) return;
    try {
      const recipeV1 = mapRecipeV2ToV1(recipe, targetServings);
      const pdfUri = await generateRecipePdf(recipeV1);
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Export ${recipe.title}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'Failed to export PDF. Please try again.');
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!recipe) return;
    try {
      const recipeV1 = mapRecipeV2ToV1(recipe, targetServings);
      await copyRecipeToClipboard(recipeV1);
      Alert.alert('Copied!', 'Recipe copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Failed to copy recipe. Please try again.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // Recipe not found
  if (!recipe) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#6b7280" />
        <Text style={styles.errorTitle}>Recipe Not Found</Text>
        <Text style={styles.errorText}>This recipe may have been deleted.</Text>
        <TouchableOpacity style={styles.backButtonLarge} onPress={onBack}>
          <Text style={styles.backButtonLargeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showComparison = originalServings !== targetServings;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipe.title}
        </Text>
        {onEdit && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => onEdit(recipe)}
            accessibilityLabel="Edit recipe"
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleDelete}
          disabled={isDeleting}
          accessibilityLabel="Delete recipe"
          accessibilityRole="button"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="trash-outline" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Recipe Photo */}
        {recipe.photo_url && (
          <Image
            source={{ uri: recipe.photo_url }}
            style={styles.recipePhoto}
            resizeMode="cover"
          />
        )}

        {/* Category and Tags */}
        {(recipe.category || recipe.tags.length > 0) && (
          <View style={styles.tagsContainer}>
            {recipe.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{formatCategory(recipe.category)}</Text>
              </View>
            )}
            {recipe.tags.map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Servings Control Card */}
        <View style={styles.card}>
          <ServingsControl
            originalServings={originalServings}
            targetServings={targetServings}
            onOriginalChange={setOriginalServings}
            onTargetChange={setTargetServings}
          />
        </View>

        {/* Ingredients Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Ingredients
            {showComparison && <Text style={styles.scaledBadge}> (scaled)</Text>}
          </Text>
          <IngredientList
            ingredients={ingredientsV1}
            scaledIngredients={scaledIngredients}
            showComparison={showComparison}
          />
        </View>

        {/* Steps Card (new in V2) */}
        {recipe.steps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Steps</Text>
            {recipe.steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes (if any) */}
        {recipe.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{recipe.notes}</Text>
          </View>
        )}

        {/* Action Buttons Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>
          <View style={styles.actionButtons}>
            {onCook && recipe.steps.length > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onCook(recipe, targetServings)}
                accessibilityLabel="Start cooking"
                accessibilityRole="button"
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="restaurant-outline" size={24} color="#FF6B35" />
                </View>
                <Text style={styles.actionButtonText}>Cook</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              accessibilityLabel="Share recipe"
              accessibilityRole="button"
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="share-outline" size={24} color="#FF6B35" />
              </View>
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportPdf}
              accessibilityLabel="Export as PDF"
              accessibilityRole="button"
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="document-outline" size={24} color="#FF6B35" />
              </View>
              <Text style={styles.actionButtonText}>PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopy}
              accessibilityLabel="Copy to clipboard"
              accessibilityRole="button"
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name="copy-outline" size={24} color="#FF6B35" />
              </View>
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF7F2',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FDF7F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Recipe photo
  recipePhoto: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tagBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    color: '#3D2B1F',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  scaledBadge: {
    color: '#FF6B35',
    fontWeight: '400',
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    color: '#3D2B1F',
    fontSize: 16,
    lineHeight: 24,
  },

  // Notes
  notesText: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#3D2B1F',
    fontSize: 14,
    fontWeight: '500',
  },

  // Error state
  errorTitle: {
    color: '#3D2B1F',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  errorText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  backButtonLarge: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
  },
  backButtonLargeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

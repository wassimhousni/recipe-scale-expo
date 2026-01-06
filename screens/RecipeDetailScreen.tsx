import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRecipeById, deleteRecipe } from '../src/features/recipes/storage';
import { scaleIngredients } from '../src/features/scaling/scaleIngredients';
import type { Recipe } from '../src/features/recipes/recipeTypes';
import { IngredientList } from '../src/components/IngredientList';
import { ServingsControl } from '../src/components/ServingsControl';

interface RecipeDetailScreenProps {
  /** ID of the recipe to display */
  recipeId: string;
  /** Callback to go back to list */
  onBack: () => void;
  /** Callback after recipe is deleted */
  onDelete: () => void;
}

/**
 * Screen displaying a single recipe with scaling controls.
 * Allows viewing, scaling, and deleting the recipe.
 */
export default function RecipeDetailScreen({
  recipeId,
  onBack,
  onDelete,
}: RecipeDetailScreenProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [originalServings, setOriginalServings] = useState(4);
  const [targetServings, setTargetServings] = useState(4);

  // Load recipe on mount
  useEffect(() => {
    (async () => {
      const loaded = await getRecipeById(recipeId);
      if (loaded) {
        setRecipe(loaded);
        setOriginalServings(loaded.originalServings);
        setTargetServings(loaded.currentServings);
      }
      setIsLoading(false);
    })();
  }, [recipeId]);

  // Compute scaled ingredients
  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return scaleIngredients(recipe.ingredients, originalServings, targetServings);
  }, [recipe, originalServings, targetServings]);

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
            try {
              await deleteRecipe(recipeId);
              onDelete();
            } catch {
              Alert.alert('Error', 'Failed to delete recipe. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
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
      <View style={styles.header}>
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
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityLabel="Delete recipe"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Servings Control */}
        <ServingsControl
          originalServings={originalServings}
          targetServings={targetServings}
          onOriginalChange={setOriginalServings}
          onTargetChange={setTargetServings}
        />

        {/* Ingredients Section */}
        <View style={styles.ingredientsSection}>
          <Text style={styles.ingredientsTitle}>
            Ingredients
            {showComparison && <Text style={styles.scaledBadge}> (scaled)</Text>}
          </Text>
          <IngredientList
            ingredients={recipe.ingredients}
            scaledIngredients={scaledIngredients}
            showComparison={showComparison}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
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
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  ingredientsSection: {
    marginTop: 8,
  },
  ingredientsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scaledBadge: {
    color: '#22c55e',
    fontWeight: '400',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  errorText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  backButtonLarge: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#22c55e',
    borderRadius: 12,
  },
  backButtonLargeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadRecipes } from '../src/features/recipes/storage';
import type { Recipe } from '../src/features/recipes/recipeTypes';

interface RecipeListScreenProps {
  /** Callback when a recipe is selected */
  onSelectRecipe: (recipeId: string) => void;
  /** Callback to navigate to scanner */
  onGoToScanner: () => void;
}

/**
 * Formats a date string for display.
 * Shows relative time for recent dates, otherwise formatted date.
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Screen displaying the list of saved recipes.
 * Supports pull-to-refresh and empty state.
 */
export default function RecipeListScreen({
  onSelectRecipe,
  onGoToScanner,
}: RecipeListScreenProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecipes = useCallback(async () => {
    const loaded = await loadRecipes();
    // Sort by newest first
    loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRecipes(loaded);
  }, []);

  // Load recipes on mount
  useEffect(() => {
    fetchRecipes().finally(() => setIsLoading(false));
  }, [fetchRecipes]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRecipes();
    setIsRefreshing(false);
  }, [fetchRecipes]);

  const renderRecipeCard = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => onSelectRecipe(item.id)}
      accessibilityLabel={`${item.title}, ${item.currentServings} servings, created ${formatDate(item.createdAt)}`}
      accessibilityRole="button"
    >
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.recipeMeta}>
          <Text style={styles.recipeServings}>
            {item.currentServings} servings
          </Text>
          <Text style={styles.recipeDot}>•</Text>
          <Text style={styles.recipeDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Recipes</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={onGoToScanner}
          accessibilityLabel="Scan new recipe"
          accessibilityRole="button"
        >
          <Ionicons name="scan" size={20} color="#fff" />
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Recipe List or Empty State */}
      {recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#374151" />
          <Text style={styles.emptyTitle}>No saved recipes yet</Text>
          <Text style={styles.emptyText}>
            Scan a recipe to get started
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={onGoToScanner}
            accessibilityLabel="Scan your first recipe"
            accessibilityRole="button"
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Scan Recipe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#22c55e"
              colors={['#22c55e']}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeServings: {
    color: '#22c55e',
    fontSize: 14,
  },
  recipeDot: {
    color: '#6b7280',
    fontSize: 14,
    marginHorizontal: 8,
  },
  recipeDate: {
    color: '#9ca3af',
    fontSize: 14,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
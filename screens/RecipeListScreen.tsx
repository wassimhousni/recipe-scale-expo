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
import { LinearGradient } from 'expo-linear-gradient';
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
      activeOpacity={0.7}
    >
      <View style={styles.recipeIcon}>
        <Ionicons name="document-text" size={24} color="#FF6B35" />
      </View>
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
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="book" size={24} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>My Recipes</Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={onGoToScanner}
            accessibilityLabel="Scan new recipe"
            accessibilityRole="button"
          >
            <Ionicons name="scan" size={18} color="#FF6B35" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Recipe List or Empty State */}
      {recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="restaurant-outline" size={48} color="#FF6B35" />
            </View>
            <Text style={styles.emptyTitle}>No saved recipes yet</Text>
            <Text style={styles.emptyText}>
              Scan your first recipe to start building your collection
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
              tintColor="#FF6B35"
              colors={['#FF6B35']}
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
    backgroundColor: '#FDF7F2',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FDF7F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  scanButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },

  // List
  listContent: {
    padding: 16,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  recipeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitle: {
    color: '#3D2B1F',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeServings: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '500',
  },
  recipeDot: {
    color: '#d1d5db',
    fontSize: 13,
    marginHorizontal: 8,
  },
  recipeDate: {
    color: '#9ca3af',
    fontSize: 13,
  },
  separator: {
    height: 12,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#3D2B1F',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

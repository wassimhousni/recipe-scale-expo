import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fetchRecipes } from '../src/features/recipes/recipeService';
import { cacheRecipes, getCachedRecipes, clearMvpRecipes } from '../src/features/recipes/recipeCache';
import { getCurrentUser } from '../src/features/auth/authService';
import type { RecipeV2 } from '../src/features/recipes/recipeTypesV2';
import { SearchBar } from '../src/components/SearchBar';

/** AsyncStorage key for V2 migration flag */
const V2_MIGRATION_KEY = 'V2_MIGRATION_DONE';

interface RecipeListScreenProps {
  /** Callback when a recipe is selected */
  onSelectRecipe: (recipeId: string) => void;
  /** Callback to navigate to scanner */
  onGoToScanner: () => void;
  /** Callback to create a new recipe manually */
  onCreateRecipe?: () => void;
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
 * Fetches from Supabase with offline cache fallback.
 */
export default function RecipeListScreen({
  onSelectRecipe,
  onGoToScanner,
  onCreateRecipe,
}: RecipeListScreenProps) {
  const [recipes, setRecipes] = useState<RecipeV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Clear MVP recipes on first V2 load (migration).
   */
  const runV2Migration = useCallback(async () => {
    try {
      const migrationDone = await AsyncStorage.getItem(V2_MIGRATION_KEY);
      if (!migrationDone) {
        await clearMvpRecipes();
        await AsyncStorage.setItem(V2_MIGRATION_KEY, 'true');
      }
    } catch (error) {
      console.error('Error during V2 migration:', error);
    }
  }, []);

  /**
   * Fetch recipes from Supabase, fall back to cache on error.
   */
  const loadRecipes = useCallback(async () => {
    try {
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        // Not logged in - use cache if available
        const cached = await getCachedRecipes();
        setRecipes(cached);
        setIsOffline(cached.length > 0);
        return;
      }

      // Fetch from Supabase
      const { recipes: cloudRecipes, error } = await fetchRecipes(user.id);

      if (error) {
        // Fetch failed - fall back to cache
        console.warn('Failed to fetch from cloud, using cache:', error);
        const cached = await getCachedRecipes();
        setRecipes(cached);
        setIsOffline(true);
        return;
      }

      // Success - update cache and state
      await cacheRecipes(cloudRecipes);
      setRecipes(cloudRecipes);
      setIsOffline(false);
    } catch (error) {
      // Unexpected error - fall back to cache
      console.error('Error loading recipes:', error);
      const cached = await getCachedRecipes();
      setRecipes(cached);
      setIsOffline(true);
    }
  }, []);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) {
      return recipes;
    }
    const query = searchQuery.toLowerCase().trim();
    return recipes.filter((recipe) =>
      recipe.title.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery]);

  // Load recipes on mount
  useEffect(() => {
    (async () => {
      await runV2Migration();
      await loadRecipes();
      setIsLoading(false);
    })();
  }, [runV2Migration, loadRecipes]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRecipes();
    setIsRefreshing(false);
  }, [loadRecipes]);

  const renderRecipeCard = ({ item }: { item: RecipeV2 }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => onSelectRecipe(item.id)}
      accessibilityLabel={`${item.title}, ${item.original_servings} servings, created ${formatDate(item.created_at)}`}
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
            {item.original_servings} servings
          </Text>
          <Text style={styles.recipeDot}>•</Text>
          <Text style={styles.recipeDate}>{formatDate(item.created_at)}</Text>
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
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={14} color="#FF6B35" />
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          )}
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
          data={filteredRecipes}
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
          ListHeaderComponent={
            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search recipes..."
              />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={styles.noResultsTitle}>No recipes found</Text>
              <Text style={styles.noResultsText}>
                Try a different search term
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Floating Action Button */}
      {onCreateRecipe && (
        <TouchableOpacity
          style={styles.fab}
          onPress={onCreateRecipe}
          accessibilityLabel="Create new recipe"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
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
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    marginRight: 8,
  },
  offlineBadgeText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
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

  // Search
  searchContainer: {
    marginBottom: 16,
  },

  // No results state
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsTitle: {
    color: '#3D2B1F',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noResultsText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
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

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

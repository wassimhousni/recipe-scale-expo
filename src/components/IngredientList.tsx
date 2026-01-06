import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { Ingredient } from '../features/recipes/recipeTypes';
import { formatQuantity } from '../features/scaling/scaleIngredients';

interface IngredientListProps {
  /** Original parsed ingredients */
  ingredients: Ingredient[];
  /** Scaled ingredients (same order as original) */
  scaledIngredients: Ingredient[];
  /** If true, show "original → scaled" comparison */
  showComparison?: boolean;
}

/**
 * Formats a single ingredient for display.
 *
 * @param ingredient - The ingredient to format
 * @returns Formatted string like "2 cups flour"
 */
function formatIngredient(ingredient: Ingredient): string {
  const qty = formatQuantity(ingredient.quantity);
  if (ingredient.unit) {
    return `${qty} ${ingredient.unit} ${ingredient.label}`;
  }
  return `${qty} ${ingredient.label}`;
}

/**
 * Displays a list of ingredients with optional original → scaled comparison.
 */
export function IngredientList({
  ingredients,
  scaledIngredients,
  showComparison = false,
}: IngredientListProps) {
  const renderItem = ({ item, index }: { item: Ingredient; index: number }) => {
    const scaled = scaledIngredients[index];
    const displayIngredient = scaled || item;
    const accessibilityLabel = `${formatQuantity(displayIngredient.quantity)} ${displayIngredient.unit || ''} ${displayIngredient.label}`.trim();

    if (showComparison && scaled) {
      const originalQty = formatQuantity(item.quantity);
      const scaledQty = formatQuantity(scaled.quantity);
      const hasChanged = originalQty !== scaledQty;

      return (
        <View
          style={styles.ingredientRow}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={hasChanged ? `${item.label}: ${originalQty} scaled to ${scaledQty} ${item.unit || ''}`.trim() : accessibilityLabel}
        >
          {hasChanged ? (
            <>
              <Text style={styles.originalQty}>{originalQty}</Text>
              <Text style={styles.arrow}> → </Text>
              <Text style={styles.scaledQty}>{scaledQty}</Text>
              <Text style={styles.unitLabel}>
                {item.unit ? ` ${item.unit}` : ''} {item.label}
              </Text>
            </>
          ) : (
            <Text style={styles.ingredientText}>{formatIngredient(item)}</Text>
          )}
        </View>
      );
    }

    return (
      <View
        style={styles.ingredientRow}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={styles.ingredientText}>{formatIngredient(displayIngredient)}</Text>
      </View>
    );
  };

  if (ingredients.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No ingredients found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={ingredients}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  ingredientText: {
    color: '#e5e7eb',
    fontSize: 16,
    lineHeight: 22,
  },
  originalQty: {
    color: '#9ca3af',
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  arrow: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  scaledQty: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  unitLabel: {
    color: '#e5e7eb',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
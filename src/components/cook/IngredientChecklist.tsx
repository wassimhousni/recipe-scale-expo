import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Ingredient } from '../../features/recipes/recipeTypes';
import { formatQuantity } from '../../features/scaling/scaleIngredients';

interface IngredientChecklistProps {
  /** Scaled ingredients to display */
  ingredients: Ingredient[];
  /** Set of checked ingredient indices */
  checkedIndices: Set<number>;
  /** Toggle check callback */
  onToggle: (index: number) => void;
}

/**
 * Displays a checklist of ingredients for the prep phase of cook mode.
 * Users can check off ingredients as they gather them.
 */
export function IngredientChecklist({
  ingredients,
  checkedIndices,
  onToggle,
}: IngredientChecklistProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {ingredients.map((ingredient, index) => {
        const isChecked = checkedIndices.has(index);
        return (
          <TouchableOpacity
            key={ingredient.id}
            style={[styles.ingredientRow, isChecked && styles.ingredientChecked]}
            onPress={() => onToggle(index)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isChecked }}
            accessibilityLabel={`${formatQuantity(ingredient.quantity)} ${ingredient.unit ?? ''} ${ingredient.label}`}
          >
            <Ionicons
              name={isChecked ? 'checkbox' : 'square-outline'}
              size={24}
              color={isChecked ? '#10b981' : '#9ca3af'}
            />
            <Text style={[styles.ingredientText, isChecked && styles.ingredientTextChecked]}>
              {formatQuantity(ingredient.quantity)} {ingredient.unit} {ingredient.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ingredientChecked: {
    backgroundColor: '#f0fdf4',
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#3D2B1F',
    lineHeight: 22,
  },
  ingredientTextChecked: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
});

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { RecipeV2, IngredientV2 } from '../src/features/recipes/recipeTypesV2';
import type { Ingredient } from '../src/features/recipes/recipeTypes';
import { scaleIngredients } from '../src/features/scaling/scaleIngredients';
import { IngredientChecklist } from '../src/components/cook/IngredientChecklist';
import { StepView } from '../src/components/cook/StepView';

interface CookModeScreenProps {
  /** Recipe to cook */
  recipe: RecipeV2;
  /** Target servings (for scaling) */
  targetServings: number;
  /** Callback to exit cook mode */
  onExit: () => void;
}

/**
 * Maps IngredientV2 array to Ingredient array for compatibility with scaling.
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
 * Cook Mode screen with two phases:
 * 1. Prep Phase: Ingredient checklist for gathering items
 * 2. Cook Phase: Step-by-step cooking instructions
 */
export default function CookModeScreen({
  recipe,
  targetServings,
  onExit,
}: CookModeScreenProps) {
  // Phase: 'prep' (checklist) or 'cook' (steps)
  const [phase, setPhase] = useState<'prep' | 'cook'>('prep');

  // Checked ingredient indices
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  // Current step index (0-based)
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Map V2 ingredients to V1 format for scaling
  const ingredientsV1 = useMemo(() => {
    return mapIngredientsV2ToV1(recipe.ingredients);
  }, [recipe.ingredients]);

  // Compute scaled ingredients
  const scaledIngredients = useMemo(() => {
    return scaleIngredients(ingredientsV1, recipe.original_servings, targetServings);
  }, [ingredientsV1, recipe.original_servings, targetServings]);

  // Toggle ingredient check
  const handleToggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Start cooking (move to cook phase)
  const handleStartCooking = () => {
    setPhase('cook');
    setCurrentStepIndex(0);
  };

  // Navigate to previous step
  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Navigate to next step or finish
  const handleNextStep = () => {
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Last step - exit cook mode
      onExit();
    }
  };

  // Check if all ingredients are checked
  const allIngredientsChecked = checkedIngredients.size === scaledIngredients.length;

  // Current step data
  const currentStep = recipe.steps[currentStepIndex] ?? '';
  const totalSteps = recipe.steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onExit}
          accessibilityLabel="Exit cook mode"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {phase === 'prep' ? 'Prep' : `Step ${currentStepIndex + 1} of ${totalSteps}`}
        </Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {/* Content */}
      {phase === 'prep' ? (
        <View style={styles.prepContainer}>
          {/* Subheader */}
          <View style={styles.subheader}>
            <Text style={styles.subheaderText}>Gather your ingredients</Text>
            <View style={styles.servingsBadge}>
              <Ionicons name="people-outline" size={16} color="#FF6B35" />
              <Text style={styles.servingsText}>{targetServings} servings</Text>
            </View>
          </View>

          {/* Ingredient Checklist */}
          <IngredientChecklist
            ingredients={scaledIngredients}
            checkedIndices={checkedIngredients}
            onToggle={handleToggleIngredient}
          />

          {/* Bottom buttons */}
          <View style={styles.prepFooter}>
            <TouchableOpacity
              style={[
                styles.startCookingButton,
                allIngredientsChecked && styles.startCookingButtonReady,
              ]}
              onPress={handleStartCooking}
              accessibilityLabel="Start cooking"
              accessibilityRole="button"
            >
              <Ionicons name="restaurant" size={24} color="#fff" />
              <Text style={styles.startCookingText}>Start Cooking</Text>
            </TouchableOpacity>
            {!allIngredientsChecked && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleStartCooking}
                accessibilityLabel="Skip to cooking"
                accessibilityRole="button"
              >
                <Text style={styles.skipButtonText}>Skip to cooking</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <StepView
          step={currentStep}
          stepNumber={currentStepIndex + 1}
          totalSteps={totalSteps}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          isLastStep={isLastStep}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 44,
  },

  // Prep phase
  prepContainer: {
    flex: 1,
  },
  subheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  subheaderText: {
    fontSize: 16,
    color: '#3D2B1F',
    fontWeight: '600',
  },
  servingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  servingsText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  prepFooter: {
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  startCookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    opacity: 0.7,
  },
  startCookingButtonReady: {
    opacity: 1,
  },
  startCookingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});

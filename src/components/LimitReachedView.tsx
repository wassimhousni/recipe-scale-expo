import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LimitReachedViewProps {
  /** Callback to navigate to recipe list */
  onGoToRecipes: () => void;
}

/**
 * Full-screen view shown when user has used all 5 free scans this month.
 * Provides option to view saved recipes.
 */
export function LimitReachedView({ onGoToRecipes }: LimitReachedViewProps) {
  return (
    <View style={styles.container} accessible={true} accessibilityRole="alert">
      <View style={styles.iconContainer} accessibilityElementsHidden={true}>
        <Ionicons name="lock-closed" size={64} color="#f59e0b" />
      </View>

      <Text style={styles.title}>Scan Limit Reached</Text>

      <Text style={styles.message}>
        You've used all 5 free scans this month.
      </Text>

      <Text style={styles.secondaryMessage}>
        Pro plan coming soon!
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={onGoToRecipes}
        accessibilityLabel="View saved recipes"
        accessibilityRole="button"
      >
        <Ionicons name="book" size={20} color="#fff" />
        <Text style={styles.buttonText}>View Saved Recipes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  secondaryMessage: {
    color: '#22c55e',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
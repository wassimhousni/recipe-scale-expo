import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StepViewProps {
  /** Current step text */
  step: string;
  /** Current step number (1-based for display) */
  stepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Navigation callbacks */
  onPrevious: () => void;
  onNext: () => void;
  /** Whether this is the last step */
  isLastStep: boolean;
}

/**
 * Displays a single cooking step with large text and navigation controls.
 * Shows progress bar and Previous/Next (or Done) buttons.
 */
export function StepView({
  step,
  stepNumber,
  totalSteps,
  onPrevious,
  onNext,
  isLastStep,
}: StepViewProps) {
  const progressPercent = (stepNumber / totalSteps) * 100;
  const isFirstStep = stepNumber === 1;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>

      {/* Step content - large, centered */}
      <ScrollView
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepContent}
      >
        <Text style={styles.stepText}>{step}</Text>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, isFirstStep && styles.navButtonDisabled]}
          onPress={onPrevious}
          disabled={isFirstStep}
          accessibilityLabel="Previous step"
          accessibilityRole="button"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isFirstStep ? '#d1d5db' : '#FF6B35'}
          />
          <Text style={[styles.navButtonText, isFirstStep && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary]}
          onPress={onNext}
          accessibilityLabel={isLastStep ? 'Done cooking' : 'Next step'}
          accessibilityRole="button"
        >
          <Text style={styles.navButtonPrimaryText}>
            {isLastStep ? 'Done' : 'Next'}
          </Text>
          <Ionicons
            name={isLastStep ? 'checkmark' : 'arrow-forward'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  stepScrollView: {
    flex: 1,
  },
  stepContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stepText: {
    fontSize: 22,
    color: '#3D2B1F',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF6B35',
    backgroundColor: '#fff',
  },
  navButtonDisabled: {
    borderColor: '#d1d5db',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  navButtonTextDisabled: {
    color: '#d1d5db',
  },
  navButtonPrimary: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  navButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

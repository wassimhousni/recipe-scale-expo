import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface ServingsControlProps {
  /** Current original servings value */
  originalServings: number;
  /** Current target servings value */
  targetServings: number;
  /** Callback when original servings changes */
  onOriginalChange: (value: number) => void;
  /** Callback when target servings changes */
  onTargetChange: (value: number) => void;
  /** Minimum servings value (default: 1) */
  minServings?: number;
  /** Maximum servings value (default: 12) */
  maxServings?: number;
}

/**
 * Control component for adjusting original and target servings.
 * Features a stepper for original servings and a slider for target servings.
 */
export function ServingsControl({
  originalServings,
  targetServings,
  onOriginalChange,
  onTargetChange,
  minServings = 1,
  maxServings = 12,
}: ServingsControlProps) {
  const handleDecrement = () => {
    if (originalServings > minServings) {
      onOriginalChange(originalServings - 1);
    }
  };

  const handleIncrement = () => {
    if (originalServings < maxServings) {
      onOriginalChange(originalServings + 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Original Servings Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Original servings</Text>
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepperButton, originalServings <= minServings && styles.stepperButtonDisabled]}
            onPress={handleDecrement}
            disabled={originalServings <= minServings}
            accessibilityLabel="Decrease original servings"
            accessibilityHint={`Current value is ${originalServings}`}
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, originalServings <= minServings && styles.stepperButtonTextDisabled]}>
              −
            </Text>
          </TouchableOpacity>
          <View style={styles.stepperValue} accessibilityLabel={`${originalServings} servings`}>
            <Text style={styles.stepperValueText}>{originalServings}</Text>
          </View>
          <TouchableOpacity
            style={[styles.stepperButton, originalServings >= maxServings && styles.stepperButtonDisabled]}
            onPress={handleIncrement}
            disabled={originalServings >= maxServings}
            accessibilityLabel="Increase original servings"
            accessibilityHint={`Current value is ${originalServings}`}
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, originalServings >= maxServings && styles.stepperButtonTextDisabled]}>
              +
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Target Servings Section */}
      <View style={styles.section}>
        <View style={styles.targetHeader}>
          <Text style={styles.label}>Scale to</Text>
          <Text style={styles.targetValue}>{targetServings} servings</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={minServings}
          maximumValue={maxServings}
          step={1}
          value={targetServings}
          onValueChange={onTargetChange}
          minimumTrackTintColor="#22c55e"
          maximumTrackTintColor="#374151"
          thumbTintColor="#22c55e"
          accessibilityLabel={`Target servings: ${targetServings}`}
          accessibilityHint="Slide to adjust number of servings"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>{minServings}</Text>
          <Text style={styles.sliderLabel}>{maxServings}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
  section: {
    marginBottom: 8,
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: '#374151',
  },
  stepperButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  stepperButtonTextDisabled: {
    color: '#6b7280',
  },
  stepperValue: {
    width: 60,
    alignItems: 'center',
  },
  stepperValueText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 16,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetValue: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
});
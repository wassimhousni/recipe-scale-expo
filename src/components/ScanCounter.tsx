import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScanCounterProps {
  /** Number of remaining scans */
  remaining: number;
  /** Total number of free scans (default: 5) */
  total?: number;
}

/**
 * Small badge showing remaining scans.
 * Shows warning color when remaining <= 1.
 */
export function ScanCounter({ remaining, total = 5 }: ScanCounterProps) {
  const isWarning = remaining <= 1;

  return (
    <View
      style={[styles.container, isWarning && styles.containerWarning]}
      accessible={true}
      accessibilityLabel={`${remaining} of ${total} free scans remaining this month`}
      accessibilityRole="text"
    >
      <Ionicons
        name="scan-outline"
        size={14}
        color={isWarning ? '#f59e0b' : '#9ca3af'}
      />
      <Text style={[styles.text, isWarning && styles.textWarning]}>
        {remaining}/{total} scans left
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  containerWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  text: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  textWarning: {
    color: '#f59e0b',
  },
});
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getScanStatus, resetScanCount, type ScanStatus, MAX_FREE_SCANS } from '../src/features/limits/scanLimit';
import { loadRecipes } from '../src/features/recipes/storage';

interface SettingsScreenProps {
  /** Callback to navigate to scanner */
  onGoToScanner: () => void;
  /** Callback to navigate to recipes */
  onGoToRecipes: () => void;
}

const APP_VERSION = 'v0.1.0';

/**
 * Settings screen showing scan status, app info, and dev reset option.
 */
export default function SettingsScreen({
  onGoToScanner,
  onGoToRecipes,
}: SettingsScreenProps) {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [recipeCount, setRecipeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [devTapCount, setDevTapCount] = useState(0);
  const [showDevReset, setShowDevReset] = useState(__DEV__ || false);

  // Load data on mount
  const loadData = useCallback(async () => {
    const [status, recipes] = await Promise.all([
      getScanStatus(),
      loadRecipes(),
    ]);
    setScanStatus(status);
    setRecipeCount(recipes.length);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle dev tap on version (tap 5 times to reveal reset)
  const handleVersionTap = () => {
    const newCount = devTapCount + 1;
    setDevTapCount(newCount);

    if (newCount >= 5 && !showDevReset) {
      setShowDevReset(true);
      Alert.alert('Developer Mode', 'Reset button is now visible.');
    }
  };

  // Handle reset scan count
  const handleResetScans = () => {
    Alert.alert(
      'Reset Scan Count',
      'This will reset your scan count to 0. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetScanCount();
              await loadData();
              Alert.alert('Success', 'Scan count has been reset to 0.');
            } catch {
              Alert.alert('Error', 'Failed to reset scan count. Please try again.');
            }
          },
        },
      ]
    );
  };

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
            <Ionicons name="ribbon" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Stats Card */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recipeCount}</Text>
              <Text style={styles.statLabel}>recipes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{scanStatus?.remaining ?? 0}</Text>
              <Text style={styles.statLabel}>scans left</Text>
            </View>
          </View>
        </View>

        {/* Scan Limit Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="scan-outline" size={24} color="#FF6B35" />
            <Text style={styles.cardTitle}>Scan Limit</Text>
          </View>
          <Text style={styles.cardText}>
            {scanStatus?.count ?? 0} of {MAX_FREE_SCANS} scans used this month
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((scanStatus?.count ?? 0) / MAX_FREE_SCANS) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.cardSubtext}>
            Free users get {MAX_FREE_SCANS} scans per calendar month.
            {'\n'}Resets on the 1st of each month.
          </Text>
        </View>

        {/* Pro Coming Soon Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={24} color="#FF6B35" />
            <Text style={styles.cardTitle}>Recipe Scale Pro</Text>
          </View>
          <Text style={styles.cardText}>
            Unlimited scans, cloud backup, and more!
          </Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={onGoToScanner}>
            <Ionicons name="camera-outline" size={22} color="#3D2B1F" />
            <Text style={styles.linkText}>Scan a Recipe</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          <View style={styles.linkDivider} />
          <TouchableOpacity style={styles.linkRow} onPress={onGoToRecipes}>
            <Ionicons name="book-outline" size={22} color="#3D2B1F" />
            <Text style={styles.linkText}>My Recipes</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Dev Reset Button (visible in __DEV__ or after 5 taps) */}
        {showDevReset && (
          <TouchableOpacity style={styles.devResetButton} onPress={handleResetScans}>
            <Text style={styles.devResetText}>Reset Scans (Dev)</Text>
          </TouchableOpacity>
        )}

        {/* Version */}
        <TouchableOpacity
          style={styles.versionContainer}
          onPress={handleVersionTap}
          activeOpacity={0.7}
        >
          <Text style={styles.versionText}>Recipe Scale {APP_VERSION}</Text>
          <Text style={styles.copyrightText}>Made with love for home cooks</Text>
        </TouchableOpacity>
      </ScrollView>
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
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D2B1F',
  },
  cardText: {
    fontSize: 16,
    color: '#3D2B1F',
    marginBottom: 12,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  comingSoonBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  comingSoonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#3D2B1F',
  },
  linkDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  devResetButton: {
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  devResetText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  copyrightText: {
    color: '#d1d5db',
    fontSize: 12,
    marginTop: 4,
  },
});

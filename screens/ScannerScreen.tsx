import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useScanner } from '../src/features/scanner/useScanner';
import { parseIngredients } from '../src/features/scanner/parseIngredients';
import { scaleIngredients } from '../src/features/scaling/scaleIngredients';
import { saveRecipe } from '../src/features/recipes/storage';
import { getScanStatus, incrementScanCount, type ScanStatus, MAX_FREE_SCANS } from '../src/features/limits/scanLimit';
import type { Ingredient } from '../src/features/recipes/recipeTypes';
import { IngredientList } from '../src/components/IngredientList';
import { ServingsControl } from '../src/components/ServingsControl';
import { SaveRecipeModal } from '../src/components/SaveRecipeModal';
import { LimitReachedView } from '../src/components/LimitReachedView';

interface ScannerScreenProps {
  /** Callback to navigate to recipe list after saving */
  onGoToRecipes?: () => void;
}

/**
 * Scanner screen that captures recipe photos and displays scaled ingredients.
 * Enforces a 5 scans/month free limit.
 */
export default function ScannerScreen({ onGoToRecipes }: ScannerScreenProps) {
  const {
    cameraRef,
    hasPermission,
    isProcessing,
    ocrText,
    error,
    capture,
    reset,
  } = useScanner();

  // Scan limit state
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Servings state
  const [originalServings, setOriginalServings] = useState(4);
  const [targetServings, setTargetServings] = useState(4);

  // Parsed ingredients state
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Camera active state (for showing camera vs scan card)
  const [showCamera, setShowCamera] = useState(false);

  // Load scan status on mount
  const loadScanStatus = useCallback(async () => {
    const status = await getScanStatus();
    setScanStatus(status);
    setIsLoadingStatus(false);
  }, []);

  useEffect(() => {
    loadScanStatus();
  }, [loadScanStatus]);

  // Parse OCR text when it changes
  useEffect(() => {
    if (ocrText) {
      const parsed = parseIngredients(ocrText);
      setIngredients(parsed);
      setShowCamera(false);
    } else {
      setIngredients([]);
    }
  }, [ocrText]);

  // Compute scaled ingredients whenever inputs change
  const scaledIngredients = useMemo(() => {
    return scaleIngredients(ingredients, originalServings, targetServings);
  }, [ingredients, originalServings, targetServings]);

  // Handle capture with limit check
  const handleCapture = async () => {
    try {
      // Re-check limit before scanning
      const status = await getScanStatus();
      if (!status.canScan) {
        setScanStatus(status);
        return;
      }

      // Perform capture
      await capture();

      // Increment count after capture attempt
      await incrementScanCount();

      // Reload status to update counter
      await loadScanStatus();
    } catch {
      // Errors are handled by useScanner hook
      await loadScanStatus();
    }
  };

  // Handle starting the scanner
  const handleStartScan = () => {
    if (scanStatus && !scanStatus.canScan) {
      return; // Limit reached, don't open camera
    }
    setShowCamera(true);
  };

  // Handle closing camera without scanning
  const handleCloseCamera = () => {
    setShowCamera(false);
  };

  // Reset servings when scanning again
  const handleReset = () => {
    setOriginalServings(4);
    setTargetServings(4);
    setIngredients([]);
    setShowCamera(false);
    reset();
  };

  // Handle save recipe
  const handleSaveRecipe = async (title: string) => {
    setIsSaving(true);
    try {
      await saveRecipe({
        title,
        originalServings,
        currentServings: targetServings,
        ingredients,
        rawText: ocrText ?? undefined,
      });

      setShowSaveModal(false);

      Alert.alert(
        'Recipe Saved',
        `"${title}" has been saved to your recipes.`,
        [
          { text: 'OK', onPress: () => {} },
          ...(onGoToRecipes
            ? [{ text: 'View Recipes', onPress: onGoToRecipes }]
            : []),
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle navigation to recipes from limit view
  const handleGoToRecipes = () => {
    if (onGoToRecipes) {
      onGoToRecipes();
    }
  };

  // Loading scan status
  if (isLoadingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // Limit reached - show full screen view
  if (scanStatus && !scanStatus.canScan) {
    return <LimitReachedView onGoToRecipes={handleGoToRecipes} />;
  }

  // Loading state while checking permissions (only when camera is active)
  if (showCamera && hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Checking camera permission...</Text>
      </View>
    );
  }

  // Permission denied state (only when camera is active)
  if (showCamera && hasPermission === false) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF6B35', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="restaurant" size={24} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Recipe Scale</Text>
          </View>
        </LinearGradient>

        <View style={styles.permissionDenied}>
          <Ionicons name="camera-outline" size={64} color="#9ca3af" />
          <Text style={styles.permissionTitle}>Camera Permission Denied</Text>
          <Text style={styles.permissionText}>
            Please enable camera access in your device settings to scan recipes.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleCloseCamera}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Results view with parsed ingredients and scaling
  if (ocrText) {
    const showComparison = originalServings !== targetServings;

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF6B35', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="restaurant" size={24} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Scanned Recipe</Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent}>
          {/* Servings Control Card */}
          <View style={styles.card}>
            <ServingsControl
              originalServings={originalServings}
              targetServings={targetServings}
              onOriginalChange={setOriginalServings}
              onTargetChange={setTargetServings}
            />
          </View>

          {/* Ingredients Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Ingredients
              {showComparison && <Text style={styles.scaledBadge}> (scaled)</Text>}
            </Text>
            <IngredientList
              ingredients={ingredients}
              scaledIngredients={scaledIngredients}
              showComparison={showComparison}
            />
          </View>
        </ScrollView>

        <View style={styles.resultsFooter}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
            <Ionicons name="camera" size={20} color="#FF6B35" />
            <Text style={styles.secondaryButtonText}>Scan Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={() => setShowSaveModal(true)}
            disabled={isSaving || ingredients.length === 0}
          >
            <Ionicons name="bookmark" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Save Recipe</Text>
          </TouchableOpacity>
        </View>

        <SaveRecipeModal
          visible={showSaveModal}
          onSave={handleSaveRecipe}
          onCancel={() => setShowSaveModal(false)}
        />
      </View>
    );
  }

  // Camera view (full screen when active)
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />

        {/* Overlay UI */}
        <View style={styles.cameraOverlay}>
          {/* Header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseCamera}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.scanPill}>
              <Text style={styles.scanPillText}>
                {scanStatus?.remaining ?? 0}/{MAX_FREE_SCANS} scans left
              </Text>
            </View>
          </View>

          {/* Frame overlay */}
          <View style={styles.frameOverlay}>
            <View style={styles.frameCorner} />
            <Text style={styles.frameHint}>Align recipe within frame</Text>
          </View>

          {/* Capture button */}
          <View style={styles.cameraFooter}>
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.buttonDisabled]}
              onPress={handleCapture}
              disabled={isProcessing}
            >
              <Ionicons name="scan" size={32} color="#fff" />
              <Text style={styles.captureButtonText}>Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Processing overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.processingText}>Scanning recipe...</Text>
          </View>
        )}

        {/* Error display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  // Default: Home view with scan card
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
            <Ionicons name="restaurant" size={24} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Recipe Scale</Text>
          <View style={styles.headerSpacer} />
          <View style={styles.scanPill}>
            <Text style={styles.scanPillText}>
              {scanStatus?.remaining ?? 0}/{MAX_FREE_SCANS} scans left
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.homeContent} contentContainerStyle={styles.homeContentContainer}>
        {/* Scan Recipe Card */}
        <TouchableOpacity style={styles.scanCard} onPress={handleStartScan} activeOpacity={0.7}>
          <View style={styles.scanCardIcon}>
            <Ionicons name="camera" size={32} color="#FF6B35" />
          </View>
          <View style={styles.scanCardText}>
            <Text style={styles.scanCardTitle}>Scan Recipe</Text>
            <Text style={styles.scanCardSubtitle}>
              Take a photo of any recipe to extract and scale ingredients
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Point your camera at a printed recipe or cookbook page. The app will extract ingredients automatically.
          </Text>
        </View>
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
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 16,
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
  headerSpacer: {
    flex: 1,
  },
  scanPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scanPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Home content
  homeContent: {
    flex: 1,
  },
  homeContentContainer: {
    padding: 16,
    gap: 16,
  },

  // Scan Card
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scanCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCardText: {
    flex: 1,
  },
  scanCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D2B1F',
  },
  scanCardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },

  // Camera view
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorner: {
    width: 280,
    height: 380,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.6)',
    borderRadius: 12,
  },
  frameHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 16,
  },
  cameraFooter: {
    paddingBottom: 50,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 40,
    gap: 8,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  errorContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },

  // Permission denied
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3D2B1F',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Results view
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D2B1F',
    marginBottom: 16,
  },
  scaledBadge: {
    color: '#FF6B35',
    fontWeight: '400',
  },
  resultsFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FDF7F2',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

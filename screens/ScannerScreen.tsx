import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useScanner } from '../src/features/scanner/useScanner';
import { parseIngredients } from '../src/features/scanner/parseIngredients';
import { scaleIngredients } from '../src/features/scaling/scaleIngredients';
import { saveRecipe } from '../src/features/recipes/storage';
import { getScanStatus, incrementScanCount, type ScanStatus } from '../src/features/limits/scanLimit';
import type { Ingredient } from '../src/features/recipes/recipeTypes';
import { IngredientList } from '../src/components/IngredientList';
import { ServingsControl } from '../src/components/ServingsControl';
import { SaveRecipeModal } from '../src/components/SaveRecipeModal';
import { LimitReachedView } from '../src/components/LimitReachedView';
import { ScanCounter } from '../src/components/ScanCounter';

interface ScannerScreenProps {
  /** Callback to navigate to recipe list after saving */
  onGoToRecipes?: () => void;
}

/**
 * Scanner screen that captures recipe photos and displays scaled ingredients.
 * Enforces a 5 scans/month free limit.
 *
 * Flow:
 * 1. Check scan limit on mount
 * 2. If limit reached, show LimitReachedView
 * 3. If ok, request camera permission
 * 4. Show camera preview when permission granted
 * 5. Capture photo on "Scan" button press (checks limit again)
 * 6. Increment scan count after successful OCR
 * 7. Parse OCR text into ingredients
 * 8. Display ingredients with scaling controls
 * 9. Allow saving recipe or scanning again
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

      // Increment count after capture attempt (count represents scans initiated, not necessarily successful)
      await incrementScanCount();

      // Reload status to update counter
      await loadScanStatus();
    } catch {
      // Errors are handled by useScanner hook (sets error state)
      // Still reload status in case of partial state changes
      await loadScanStatus();
    }
  };

  // Reset servings when scanning again
  const handleReset = () => {
    setOriginalServings(4);
    setTargetServings(4);
    setIngredients([]);
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
    } catch (err) {
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Limit reached - show full screen view
  if (scanStatus && !scanStatus.canScan) {
    return <LimitReachedView onGoToRecipes={handleGoToRecipes} />;
  }

  // Loading state while checking permissions
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Checking camera permission...</Text>
      </View>
    );
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color="#6b7280" />
        <Text style={styles.deniedTitle}>Camera Permission Denied</Text>
        <Text style={styles.deniedText}>
          Please enable camera access in your device settings to scan recipes.
        </Text>
      </View>
    );
  }

  // Results view with parsed ingredients and scaling
  if (ocrText) {
    const showComparison = originalServings !== targetServings;

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <View style={styles.headerSpacer} />
          <Text style={styles.resultsTitle}>Scanned Recipe</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent}>
          {/* Servings Control */}
          <ServingsControl
            originalServings={originalServings}
            targetServings={targetServings}
            onOriginalChange={setOriginalServings}
            onTargetChange={setTargetServings}
          />

          {/* Ingredients Section */}
          <View style={styles.ingredientsSection}>
            <Text style={styles.ingredientsTitle}>
              Ingredients
              {showComparison && (
                <Text style={styles.scaledBadge}> (scaled)</Text>
              )}
            </Text>
            <IngredientList
              ingredients={ingredients}
              scaledIngredients={scaledIngredients}
              showComparison={showComparison}
            />
          </View>
        </ScrollView>

        <View style={styles.resultsFooter}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={handleReset}
              accessibilityLabel="Scan again"
              accessibilityRole="button"
            >
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveRecipeButton, isSaving && styles.saveRecipeButtonDisabled]}
              onPress={() => setShowSaveModal(true)}
              disabled={isSaving || ingredients.length === 0}
              accessibilityLabel="Save recipe"
              accessibilityRole="button"
            >
              <Ionicons name="bookmark" size={22} color="#22c55e" />
              <Text style={styles.saveRecipeText}>Save Recipe</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Recipe Modal */}
        <SaveRecipeModal
          visible={showSaveModal}
          onSave={handleSaveRecipe}
          onCancel={() => setShowSaveModal(false)}
        />
      </View>
    );
  }

  // Camera view with scan button
  return (
    <View style={styles.cameraContainer}>
      {/* Camera preview - no children */}
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      {/* Overlay UI with absolute positioning */}
      <View style={styles.overlay}>
        {/* Header with scan counter */}
        <View style={styles.cameraHeader}>
          {scanStatus && (
            <ScanCounter remaining={scanStatus.remaining} total={5} />
          )}
        </View>

        {/* Frame overlay hint */}
        <View style={styles.frameOverlay}>
          <View style={styles.frameCorner} />
          <Text style={styles.frameHint}>Align recipe within frame</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.cameraFooter}>
          <TouchableOpacity
            style={[styles.scanButton, isProcessing && styles.scanButtonDisabled]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            <Ionicons name="scan" size={32} color="#fff" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Processing overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#22c55e" />
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

const styles = StyleSheet.create({
  // Loading & permission denied states
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  deniedTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  deniedText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },

  // Camera view
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    paddingTop: 60,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },

  // Frame overlay
  frameOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorner: {
    width: 280,
    height: 380,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.6)',
    borderRadius: 12,
  },
  frameHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 16,
  },

  // Processing overlay
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

  // Error display
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

  // Camera footer
  cameraFooter: {
    paddingBottom: 50,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 40,
    gap: 8,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Results view
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  resultsHeader: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    gap: 20,
  },
  ingredientsSection: {
    marginTop: 8,
  },
  ingredientsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scaledBadge: {
    color: '#22c55e',
    fontWeight: '400',
  },
  resultsFooter: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  scanAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveRecipeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveRecipeButtonDisabled: {
    opacity: 0.5,
  },
  saveRecipeText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
});
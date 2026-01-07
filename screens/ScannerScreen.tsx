import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useScanner } from '../src/features/scanner/useScanner';
import { parseIngredients } from '../src/features/scanner/parseIngredients';
import { parseSteps } from '../src/features/scanner/parseSteps';
import { getScanStatus, incrementScanCount, type ScanStatus, MAX_FREE_SCANS } from '../src/features/limits/scanLimit';
import { LimitReachedView } from '../src/components/LimitReachedView';
import type { IngredientV2 } from '../src/features/recipes/recipeTypesV2';

interface ScannerScreenProps {
  /** Callback to navigate to recipe list */
  onGoToRecipes?: () => void;
  /** Callback to navigate to recipe edit screen with scanned data */
  onScanComplete?: (data: {
    title: string;
    ingredients: IngredientV2[];
    steps: string[];
    rawText: string;
  }) => void;
}

/**
 * Scanner screen that captures recipe photos and extracts ingredients/steps.
 * Navigates to RecipeEditScreen after successful scan.
 * Enforces scan limit.
 */
export default function ScannerScreen({ onGoToRecipes, onScanComplete }: ScannerScreenProps) {
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

  // Camera active state
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

  // Handle successful OCR - parse and navigate to edit screen
  useEffect(() => {
    const handleScanSuccess = async () => {
      if (ocrText && !error && onScanComplete) {
        // Parse ingredients and steps
        const parsedIngredients = parseIngredients(ocrText);
        const parsedSteps = parseSteps(ocrText);

        // Map V1 ingredients to V2 format
        const ingredientsV2: IngredientV2[] = parsedIngredients.map((ing) => ({
          quantity: ing.quantity,
          unit: ing.unit,
          name: ing.label,
        }));

        // Increment scan count on success
        await incrementScanCount();
        await loadScanStatus();

        // Generate a default title from first few words of OCR text
        const lines = ocrText.split('\n').filter((l) => l.trim());
        const defaultTitle = lines[0]?.slice(0, 50) || 'Scanned Recipe';

        // Navigate to edit screen
        onScanComplete({
          title: defaultTitle,
          ingredients: ingredientsV2,
          steps: parsedSteps,
          rawText: ocrText,
        });

        // Reset scanner state for next scan
        reset();
        setShowCamera(false);
      }
    };

    handleScanSuccess();
  }, [ocrText, error, onScanComplete, loadScanStatus, reset]);

  // Map error messages to user-friendly text
  const getErrorMessage = (err: string): string => {
    const lowerErr = err.toLowerCase();
    if (lowerErr.includes('network') || lowerErr.includes('internet') || lowerErr.includes('connection')) {
      return 'No internet connection. Please check your network and try again.';
    }
    if (lowerErr.includes('empty') || lowerErr.includes('no text')) {
      return 'No text found in the image. Try taking a clearer photo with better lighting.';
    }
    if (lowerErr.includes('api') || lowerErr.includes('server') || lowerErr.includes('500')) {
      return 'Our servers are having trouble. Please try again in a moment.';
    }
    return 'Could not read the recipe. Please try again with a clearer photo.';
  };

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
    } catch {
      // Errors are handled by useScanner hook
    }
  };

  // Handle retry after error
  const handleRetry = () => {
    reset();
  };

  // Handle starting the scanner
  const handleStartScan = () => {
    if (scanStatus && !scanStatus.canScan) {
      return;
    }
    setShowCamera(true);
  };

  // Handle closing camera
  const handleCloseCamera = () => {
    setShowCamera(false);
    reset();
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

        {/* Error overlay with retry */}
        {error && !isProcessing && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF6B35" />
              </View>
              <Text style={styles.errorTitle}>Scan Failed</Text>
              <Text style={styles.errorMessage}>{getErrorMessage(error)}</Text>
              <View style={styles.errorButtons}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCloseCamera}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
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
            Point your camera at a printed recipe or cookbook page. The app will extract ingredients and steps automatically.
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
  // Error overlay and card
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D2B1F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
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

  buttonDisabled: {
    opacity: 0.5,
  },
});

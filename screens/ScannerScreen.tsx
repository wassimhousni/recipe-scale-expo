import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useScanner } from '../src/features/scanner/useScanner';

/**
 * Scanner screen that captures recipe photos and displays OCR results.
 *
 * Flow:
 * 1. Request camera permission on mount
 * 2. Show camera preview when permission granted
 * 3. Capture photo on "Scan" button press
 * 4. Display OCR text results
 * 5. Allow "Scan Again" to reset and return to camera
 */
export default function ScannerScreen() {
  const {
    cameraRef,
    hasPermission,
    isProcessing,
    ocrText,
    error,
    capture,
    reset,
  } = useScanner();

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

  // OCR results view
  if (ocrText) {
    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <View style={styles.headerSpacer} />
          <Text style={styles.resultsTitle}>Scanned Recipe</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.resultsScroll} contentContainerStyle={styles.resultsContent}>
          <Text style={styles.ocrText}>{ocrText}</Text>
        </ScrollView>

        <View style={styles.resultsFooter}>
          <TouchableOpacity style={styles.scanAgainButton} onPress={reset}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.scanAgainText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
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
        {/* Frame overlay hint */}
        <View style={styles.frameOverlay}>
          <View style={styles.frameCorner} />
          <Text style={styles.frameHint}>Align recipe within frame</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.cameraFooter}>
          <TouchableOpacity
            style={[styles.scanButton, isProcessing && styles.scanButtonDisabled]}
            onPress={capture}
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
    padding: 20,
  },
  ocrText: {
    color: '#e5e7eb',
    fontSize: 16,
    lineHeight: 28,
  },
  resultsFooter: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
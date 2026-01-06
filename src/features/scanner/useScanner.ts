import { useRef, useState, useEffect } from 'react';
import { CameraView } from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import { ocrImage } from '../../services/ocrService';

export interface UseScannerReturn {
  cameraRef: React.RefObject<CameraView | null>;
  hasPermission: boolean | null;
  isProcessing: boolean;
  ocrText: string | null;
  error: string | null;
  capture: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook that manages camera permissions, photo capture, and OCR processing.
 */
export function useScanner(): UseScannerReturn {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Request permission on mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const capture = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture photo');
      }

      const text = await ocrImage(photo.base64);
      setOcrText(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan recipe';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setOcrText(null);
    setError(null);
  };

  return {
    cameraRef,
    hasPermission: permission?.granted ?? null,
    isProcessing,
    ocrText,
    error,
    capture,
    reset,
  };
}
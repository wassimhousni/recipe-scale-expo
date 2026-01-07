/**
 * Application configuration constants.
 */

// Google Cloud Vision API configuration
// Replace YOUR_API_KEY_HERE with your actual Google Cloud Vision API key
export const GOOGLE_VISION_API_KEY = 'AIzaSyBkF6wr8aq8rt6wwBnGCzDlJhGFkkslPIo';
export const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

// Feature flags
// Set to true to use fake recipe, false to use real Google Vision API
export const USE_STUB_OCR = false;

// OCR configuration
export const OCR_TIMEOUT_MS = 10000; // 10 seconds

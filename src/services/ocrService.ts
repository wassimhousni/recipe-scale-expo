import {
  GOOGLE_VISION_API_KEY,
  GOOGLE_VISION_ENDPOINT,
  USE_STUB_OCR,
  OCR_TIMEOUT_MS,
} from '../config/constants';

/**
 * Google Vision API response types
 */
interface VisionApiResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

/**
 * Custom error class for OCR-specific errors
 */
export class OcrError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

/**
 * Stub OCR function for development and testing.
 * Returns fake recipe text after a 1-second delay.
 *
 * @returns Promise resolving to fake recipe text
 */
async function stubOcrImage(): Promise<string> {
  // Simulate network/processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return fake recipe text
  return `Chocolate Cake

Ingredients:
- 2 cups all-purpose flour
- 2 cups sugar
- 3/4 cup unsweetened cocoa powder
- 2 teaspoons baking soda
- 1 teaspoon baking powder
- 1 teaspoon salt
- 2 eggs
- 1 cup buttermilk
- 1 cup hot water
- 1/2 cup vegetable oil
- 2 teaspoons vanilla extract

Instructions:
1. Preheat oven to 350°F (175°C). Grease and flour two 9-inch round cake pans.
2. In a large bowl, combine flour, sugar, cocoa, baking soda, baking powder, and salt.
3. Add eggs, buttermilk, oil, and vanilla. Beat on medium speed for 2 minutes.
4. Stir in hot water (batter will be thin).
5. Pour into prepared pans.
6. Bake 30-35 minutes or until a toothpick inserted in center comes out clean.
7. Cool 10 minutes; remove from pans to wire racks. Cool completely before frosting.`;
}

/**
 * Calls Google Cloud Vision API to extract text from an image.
 *
 * @param base64 - Base64-encoded image string (without data URI prefix)
 * @returns Promise resolving to extracted text
 * @throws OcrError if the API call fails or returns no text
 */
async function callVisionApi(base64: string): Promise<string> {
  // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

  const requestBody = {
    requests: [
      {
        image: {
          content: cleanBase64,
        },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION',
          },
        ],
      },
    ],
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GOOGLE_VISION_ENDPOINT}?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new OcrError(
        `API request failed with status ${response.status}: ${errorText}`,
        'API_ERROR'
      );
    }

    const data: VisionApiResponse = await response.json();

    // Check for API-level errors
    if (data.responses[0]?.error) {
      const error = data.responses[0].error;
      throw new OcrError(
        `Vision API error: ${error.message}`,
        `VISION_${error.code}`
      );
    }

    // Extract text from response
    const text = data.responses[0]?.fullTextAnnotation?.text;

    if (!text) {
      throw new OcrError(
        'No text detected in the image. Please ensure the recipe is clearly visible.',
        'NO_TEXT'
      );
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OcrError(
        'OCR request timed out. Please check your connection and try again.',
        'TIMEOUT'
      );
    }

    // Re-throw OcrError as-is
    if (error instanceof OcrError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new OcrError(
        'Network error. Please check your internet connection.',
        'NETWORK_ERROR'
      );
    }

    // Generic error handling
    throw new OcrError(
      `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Performs OCR on an image to extract recipe text.
 * Uses Google Cloud Vision API in production, stub in development.
 *
 * @param base64 - Base64-encoded image string
 * @returns Promise resolving to the extracted recipe text
 * @throws OcrError if OCR fails
 *
 * @example
 * ```ts
 * try {
 *   const recipeText = await ocrImage(base64ImageString);
 *   console.log(recipeText);
 * } catch (error) {
 *   if (error instanceof OcrError) {
 *     console.error(`OCR failed: ${error.code} - ${error.message}`);
 *   }
 * }
 * ```
 */
export async function ocrImage(base64: string): Promise<string> {
  // Use stub in development mode
  if (USE_STUB_OCR) {
    console.log('[OCR] Using stub OCR (development mode)');
    return stubOcrImage();
  }

  // Validate API key
  if (!GOOGLE_VISION_API_KEY) {
    throw new OcrError(
      'Google Vision API key not configured. Please update GOOGLE_VISION_API_KEY in src/config/constants.ts',
      'NO_API_KEY'
    );
  }

  // Validate input
  if (!base64 || base64.trim() === '') {
    throw new OcrError('No image data provided', 'INVALID_INPUT');
  }

  return callVisionApi(base64);
}

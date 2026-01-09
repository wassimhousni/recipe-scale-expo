/**
 * Service for uploading, deleting, and retrieving recipe photos from Supabase Storage.
 */

import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../services/supabase';

/** Storage bucket name for recipe photos */
const BUCKET_NAME = 'recipe-photos';

/**
 * Generate a unique filename for a photo.
 *
 * @param recipeId - Recipe ID to associate photo with
 * @returns Unique path in format: {recipeId}/{timestamp}_{random}.jpg
 */
function generateFilename(recipeId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${recipeId}/${timestamp}_${random}.jpg`;
}

/**
 * Upload a photo to Supabase Storage.
 *
 * @param uri - Local file URI from image picker
 * @param recipeId - Recipe ID to associate photo with
 * @returns Object with publicUrl on success, or error message
 *
 * @example
 * const result = await uploadPhoto(imageUri, 'recipe-123');
 * if (result.publicUrl) {
 *   console.log('Uploaded to:', result.publicUrl);
 * } else {
 *   console.error('Upload failed:', result.error);
 * }
 */
export async function uploadPhoto(
  uri: string,
  recipeId: string
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    // Read file as base64
    const base64 = await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });

    // Generate unique path
    const path = generateFilename(recipeId);

    // Upload to Supabase Storage using base64
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, decode(base64), {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      return { publicUrl: null, error: 'Failed to upload photo. Please try again.' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    console.log('Photo uploaded successfully. Path:', path);
    console.log('Public URL:', urlData.publicUrl);

    return { publicUrl: urlData.publicUrl, error: null };
  } catch (err) {
    console.error('Unexpected error uploading photo:', err);
    return { publicUrl: null, error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * Extract the storage path from a public URL.
 *
 * @param publicUrl - Full public URL from Supabase Storage
 * @returns Storage path or null if invalid
 *
 * @example
 * const path = getPathFromUrl('https://xxx.supabase.co/storage/v1/object/public/recipe-photos/abc/123.jpg');
 * // Returns: 'abc/123.jpg'
 */
export function getPathFromUrl(publicUrl: string): string | null {
  try {
    // URL format: https://{project}.supabase.co/storage/v1/object/public/recipe-photos/{path}
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const markerIndex = publicUrl.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const path = publicUrl.substring(markerIndex + marker.length);

    // Validate we got a non-empty path
    if (!path || path.length === 0) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

/**
 * Delete a photo from Supabase Storage.
 *
 * @param photoUrl - Full public URL of the photo
 * @returns Object with success boolean and optional error
 *
 * @example
 * const result = await deletePhoto('https://xxx.supabase.co/storage/v1/object/public/recipe-photos/abc/123.jpg');
 * if (result.success) {
 *   console.log('Photo deleted');
 * } else {
 *   console.error('Delete failed:', result.error);
 * }
 */
export async function deletePhoto(
  photoUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Extract path from URL
    const path = getPathFromUrl(photoUrl);

    if (!path) {
      return { success: false, error: 'Invalid photo URL.' };
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (deleteError) {
      console.error('Error deleting photo:', deleteError);
      return { success: false, error: 'Failed to delete photo. Please try again.' };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error deleting photo:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

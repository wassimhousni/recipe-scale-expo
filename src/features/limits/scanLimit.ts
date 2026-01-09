/**
 * Scan limit service for tracking monthly OCR usage.
 * Uses Supabase when logged in, falls back to AsyncStorage when offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';

/** Storage key for the current month string (local fallback) */
const STORAGE_KEY_MONTH = 'SCAN_LIMIT_MONTH';

/** Storage key for the scan count (local fallback) */
const STORAGE_KEY_COUNT = 'SCAN_LIMIT_COUNT';

/** Maximum number of free scans per month */
export const MAX_FREE_SCANS = 5;

/**
 * Status object returned by getScanStatus()
 */
export interface ScanStatus {
  /** Number of scans used this month */
  count: number;
  /** Current month in YYYY-MM format */
  month: string;
  /** Number of free scans remaining */
  remaining: number;
  /** Whether the user can perform a scan */
  canScan: boolean;
}

/**
 * Gets the current month in YYYY-MM format.
 *
 * @returns Current month string (e.g., "2026-01")
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Gets the current authenticated user ID.
 *
 * @returns User ID or null if not logged in
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Local Storage Functions (fallback for offline)
// ============================================================================

/**
 * Loads the stored month and count from AsyncStorage.
 *
 * @returns Object with stored month and count
 */
async function loadLocalData(): Promise<{ storedMonth: string | null; storedCount: number }> {
  try {
    const [monthValue, countValue] = await AsyncStorage.multiGet([
      STORAGE_KEY_MONTH,
      STORAGE_KEY_COUNT,
    ]);

    const storedMonth = monthValue[1];
    const storedCount = countValue[1] ? parseInt(countValue[1], 10) : 0;

    return {
      storedMonth,
      storedCount: isNaN(storedCount) ? 0 : storedCount,
    };
  } catch (error) {
    console.error('Error loading local scan limit data:', error);
    return { storedMonth: null, storedCount: 0 };
  }
}

/**
 * Saves the month and count to AsyncStorage.
 *
 * @param month - Month string in YYYY-MM format
 * @param count - Scan count to store
 */
async function saveLocalData(month: string, count: number): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEY_MONTH, month],
      [STORAGE_KEY_COUNT, count.toString()],
    ]);
  } catch (error) {
    console.error('Error saving local scan limit data:', error);
  }
}

// ============================================================================
// Supabase Functions (cloud storage)
// ============================================================================

/**
 * Fetches scan limit from Supabase for the current user.
 *
 * @param userId - User ID
 * @returns Object with month and count, or null on error
 */
async function fetchCloudData(
  userId: string
): Promise<{ month: string; count: number } | null> {
  try {
    const { data, error } = await supabase
      .from('scan_limits')
      .select('count, month')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows found, which is OK for new users
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching cloud scan limit:', error);
      return null;
    }

    return { month: data.month, count: data.count };
  } catch (error) {
    console.error('Unexpected error fetching cloud scan limit:', error);
    return null;
  }
}

/**
 * Upserts scan limit to Supabase.
 *
 * @param userId - User ID
 * @param month - Month string in YYYY-MM format
 * @param count - Scan count
 * @returns True on success, false on error
 */
async function saveCloudData(
  userId: string,
  month: string,
  count: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scan_limits')
      .upsert(
        {
          user_id: userId,
          month,
          count,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving cloud scan limit:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error saving cloud scan limit:', error);
    return false;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get current scan count and status.
 * Uses Supabase when logged in, falls back to local storage.
 * Auto-resets if month has changed.
 *
 * @returns Promise resolving to scan status object
 *
 * @example
 * const status = await getScanStatus();
 * console.log(`${status.remaining} scans remaining this month`);
 * if (status.canScan) {
 *   // User can perform a scan
 * }
 */
export async function getScanStatus(): Promise<ScanStatus> {
  const currentMonth = getCurrentMonth();
  const userId = await getCurrentUserId();

  let count = 0;

  if (userId) {
    // Try cloud first
    const cloudData = await fetchCloudData(userId);

    if (cloudData) {
      if (cloudData.month === currentMonth) {
        count = cloudData.count;
      } else {
        // Month changed, reset count in cloud
        count = 0;
        await saveCloudData(userId, currentMonth, 0);
      }
    } else {
      // No cloud data, initialize for this user
      await saveCloudData(userId, currentMonth, 0);
      count = 0;
    }

    // Sync to local as backup
    await saveLocalData(currentMonth, count);
  } else {
    // Not logged in, use local storage
    const { storedMonth, storedCount } = await loadLocalData();

    if (storedMonth !== currentMonth) {
      count = 0;
      await saveLocalData(currentMonth, 0);
    } else {
      count = storedCount;
    }
  }

  const remaining = Math.max(0, MAX_FREE_SCANS - count);

  return {
    count,
    month: currentMonth,
    remaining,
    canScan: count < MAX_FREE_SCANS,
  };
}

/**
 * Check if user can perform a scan (count < MAX_FREE_SCANS).
 *
 * @returns Promise resolving to true if user can scan
 *
 * @example
 * if (await canScan()) {
 *   // Perform the scan
 *   await incrementScanCount();
 * } else {
 *   // Show upgrade prompt
 * }
 */
export async function canScan(): Promise<boolean> {
  const status = await getScanStatus();
  return status.canScan;
}

/**
 * Get number of remaining free scans this month.
 *
 * @returns Promise resolving to remaining scan count (0 to MAX_FREE_SCANS)
 *
 * @example
 * const remaining = await getRemainingScans();
 * console.log(`You have ${remaining} free scans left`);
 */
export async function getRemainingScans(): Promise<number> {
  const status = await getScanStatus();
  return status.remaining;
}

/**
 * Increment scan count after successful scan.
 * Uses Supabase when logged in, falls back to local storage.
 * Auto-resets if month has changed before incrementing.
 *
 * @returns Promise resolving to the new count after incrementing
 *
 * @example
 * // After successful OCR scan
 * const newCount = await incrementScanCount();
 * console.log(`Scan ${newCount} of ${MAX_FREE_SCANS} used`);
 */
export async function incrementScanCount(): Promise<number> {
  const currentMonth = getCurrentMonth();
  const userId = await getCurrentUserId();

  let newCount: number;

  if (userId) {
    // Try cloud first
    const cloudData = await fetchCloudData(userId);

    if (cloudData && cloudData.month === currentMonth) {
      newCount = cloudData.count + 1;
    } else {
      // Month changed or no data, reset and increment
      newCount = 1;
    }

    // Save to cloud
    const saved = await saveCloudData(userId, currentMonth, newCount);

    if (!saved) {
      // Cloud save failed, fall back to local
      const { storedMonth, storedCount } = await loadLocalData();
      if (storedMonth !== currentMonth) {
        newCount = 1;
      } else {
        newCount = storedCount + 1;
      }
    }

    // Sync to local as backup
    await saveLocalData(currentMonth, newCount);
  } else {
    // Not logged in, use local storage
    const { storedMonth, storedCount } = await loadLocalData();

    if (storedMonth !== currentMonth) {
      newCount = 1;
    } else {
      newCount = storedCount + 1;
    }

    await saveLocalData(currentMonth, newCount);
  }

  return newCount;
}

/**
 * Reset scan count (for testing or admin purposes).
 * Resets both cloud and local storage.
 *
 * @example
 * // For testing
 * await resetScanCount();
 */
export async function resetScanCount(): Promise<void> {
  const currentMonth = getCurrentMonth();
  const userId = await getCurrentUserId();

  if (userId) {
    await saveCloudData(userId, currentMonth, 0);
  }

  await saveLocalData(currentMonth, 0);
}

/**
 * Sync local scan count to cloud after login.
 * Call this after successful authentication to migrate local usage.
 *
 * @example
 * // After successful login
 * await syncScanLimitToCloud();
 */
export async function syncScanLimitToCloud(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const currentMonth = getCurrentMonth();
  const { storedMonth, storedCount } = await loadLocalData();

  // Only sync if we have local data for current month
  if (storedMonth !== currentMonth) return;

  const cloudData = await fetchCloudData(userId);

  if (cloudData && cloudData.month === currentMonth) {
    // Cloud has data for this month - take the higher count
    const maxCount = Math.max(cloudData.count, storedCount);
    if (maxCount !== cloudData.count) {
      await saveCloudData(userId, currentMonth, maxCount);
    }
  } else {
    // No cloud data for this month, upload local count
    await saveCloudData(userId, currentMonth, storedCount);
  }
}

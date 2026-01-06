import AsyncStorage from '@react-native-async-storage/async-storage';

/** Storage key for the current month string */
const STORAGE_KEY_MONTH = 'SCAN_LIMIT_MONTH';

/** Storage key for the scan count */
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
 * Loads the stored month and count from AsyncStorage.
 * Returns defaults if not found or on error.
 *
 * @returns Object with stored month and count
 */
async function loadStoredData(): Promise<{ storedMonth: string | null; storedCount: number }> {
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
    console.error('Error loading scan limit data:', error);
    return { storedMonth: null, storedCount: 0 };
  }
}

/**
 * Saves the month and count to AsyncStorage.
 *
 * @param month - Month string in YYYY-MM format
 * @param count - Scan count to store
 */
async function saveStoredData(month: string, count: number): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEY_MONTH, month],
      [STORAGE_KEY_COUNT, count.toString()],
    ]);
  } catch (error) {
    console.error('Error saving scan limit data:', error);
  }
}

/**
 * Get current scan count and status.
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
  const { storedMonth, storedCount } = await loadStoredData();

  // Auto-reset if month has changed
  let count = storedCount;
  if (storedMonth !== currentMonth) {
    count = 0;
    await saveStoredData(currentMonth, 0);
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
  const { storedMonth, storedCount } = await loadStoredData();

  // Auto-reset if month has changed, then increment
  let newCount: number;
  if (storedMonth !== currentMonth) {
    newCount = 1; // Reset to 0, then increment to 1
  } else {
    newCount = storedCount + 1;
  }

  await saveStoredData(currentMonth, newCount);

  return newCount;
}

/**
 * Reset scan count (for testing or admin purposes).
 * Sets count to 0 for current month.
 *
 * @example
 * // For testing
 * await resetScanCount();
 */
export async function resetScanCount(): Promise<void> {
  const currentMonth = getCurrentMonth();
  await saveStoredData(currentMonth, 0);
}

/**
 * Device Storage Module
 * 
 * Handles storing and retrieving encryption credentials on the device.
 * Uses localStorage with a simple obfuscation layer.
 * 
 * SECURITY NOTE: This stores sensitive data in browser storage.
 * Only use on personal/trusted devices.
 */

const STORAGE_KEY = 'gf_device_auth';

/**
 * Simple obfuscation (NOT encryption - just prevents casual viewing)
 * For real security, consider using the Web Crypto API to encrypt
 * with a device-bound key, but that adds significant complexity.
 */
function obfuscate(str) {
  return btoa(encodeURIComponent(str).split('').reverse().join(''));
}

function deobfuscate(str) {
  try {
    return decodeURIComponent(atob(str).split('').reverse().join(''));
  } catch {
    return null;
  }
}

/**
 * Store credentials on device
 * @param {string} userId - User's ID
 * @param {string} passphrase - Encryption passphrase
 */
export function storeDeviceCredentials(userId, passphrase) {
  try {
    const data = {
      u: userId,
      p: obfuscate(passphrase),
      t: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('[DeviceStorage] Failed to store:', err);
    return false;
  }
}

/**
 * Retrieve stored credentials
 * @param {string} userId - User's ID to match
 * @returns {{ passphrase: string } | null}
 */
export function getDeviceCredentials(userId) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    
    // Check if it's for the same user
    if (data.u !== userId) {
      return null;
    }

    const passphrase = deobfuscate(data.p);
    if (!passphrase) return null;

    return { passphrase };
  } catch (err) {
    console.error('[DeviceStorage] Failed to retrieve:', err);
    return null;
  }
}

/**
 * Check if device has stored credentials for a user
 * @param {string} userId - User's ID
 * @returns {boolean}
 */
export function hasDeviceCredentials(userId) {
  return getDeviceCredentials(userId) !== null;
}

/**
 * Clear stored credentials (forget device)
 */
export function clearDeviceCredentials() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error('[DeviceStorage] Failed to clear:', err);
    return false;
  }
}

/**
 * Get timestamp of when credentials were stored
 * @returns {Date | null}
 */
export function getCredentialsTimestamp() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    return data.t ? new Date(data.t) : null;
  } catch {
    return null;
  }
}

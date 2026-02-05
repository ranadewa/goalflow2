/**
 * GoalFlow Encryption Module
 * 
 * Uses Web Crypto API for AES-256-GCM encryption.
 * All sensitive data is encrypted on the client before sending to database.
 */

// Used to verify correct passphrase on unlock
const VERIFICATION_PHRASE = 'GOALFLOW_VERIFIED_v1'

/**
 * Generate random salt for key derivation
 * @returns {string} Base64 encoded salt
 */
export function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...salt))
}

/**
 * Derive encryption key from passphrase using PBKDF2
 * @param {string} passphrase - User's passphrase
 * @param {string} saltBase64 - Base64 encoded salt
 * @returns {Promise<CryptoKey>} Derived AES-256-GCM key
 */
export async function deriveKey(passphrase, saltBase64) {
  const encoder = new TextEncoder()
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0))

  // Import passphrase as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a string
 * @param {string} plaintext - Text to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<string>} Base64 encoded ciphertext (IV + encrypted data)
 */
export async function encrypt(plaintext, key) {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a string
 * @param {string} encryptedBase64 - Base64 encoded ciphertext
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(encryptedBase64, key) {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(plaintext)
}

/**
 * Encrypt a JavaScript object
 * @param {Object} data - Object to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<string>} Base64 encoded encrypted JSON
 */
export async function encryptData(data, key) {
  const json = JSON.stringify(data)
  return encrypt(json, key)
}

/**
 * Decrypt to a JavaScript object
 * @param {string} encryptedBase64 - Base64 encoded encrypted JSON
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Object>} Decrypted object
 */
export async function decryptData(encryptedBase64, key) {
  const json = await decrypt(encryptedBase64, key)
  return JSON.parse(json)
}

/**
 * Create verification check for passphrase validation
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<string>} Encrypted verification phrase
 */
export async function createVerificationCheck(key) {
  return encrypt(VERIFICATION_PHRASE, key)
}

/**
 * Verify passphrase is correct
 * @param {CryptoKey} key - Encryption key derived from passphrase
 * @param {string} encryptedCheck - Stored encrypted verification phrase
 * @returns {Promise<boolean>} True if passphrase is correct
 */
export async function verifyPassphrase(key, encryptedCheck) {
  try {
    const decrypted = await decrypt(encryptedCheck, key)
    return decrypted === VERIFICATION_PHRASE
  } catch {
    return false
  }
}

/**
 * Calculate passphrase strength (0-100)
 * @param {string} passphrase - Passphrase to evaluate
 * @returns {number} Strength score
 */
export function getPassphraseStrength(passphrase) {
  let score = 0

  // Length scoring
  if (passphrase.length >= 8) score += 15
  if (passphrase.length >= 12) score += 15
  if (passphrase.length >= 16) score += 10

  // Character variety
  if (/[a-z]/.test(passphrase)) score += 15
  if (/[A-Z]/.test(passphrase)) score += 15
  if (/[0-9]/.test(passphrase)) score += 15
  if (/[^a-zA-Z0-9]/.test(passphrase)) score += 15

  return Math.min(100, score)
}

/**
 * Validate passphrase meets requirements
 * @param {string} passphrase - Passphrase to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePassphrase(passphrase) {
  const errors = []

  if (passphrase.length < 12) {
    errors.push('At least 12 characters')
  }
  if (!/[A-Z]/.test(passphrase)) {
    errors.push('One uppercase letter')
  }
  if (!/[a-z]/.test(passphrase)) {
    errors.push('One lowercase letter')
  }
  if (!/[0-9]/.test(passphrase)) {
    errors.push('One number')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Generate recovery file data
 * @param {string} userId - User ID
 * @param {string} salt - Encryption salt
 * @param {string} encryptionCheck - Encrypted verification phrase
 * @returns {Object} Recovery file contents
 */
export function createRecoveryFile(userId, salt, encryptionCheck) {
  return {
    app: 'GoalFlow',
    version: 1,
    created: new Date().toISOString(),
    userId,
    salt,
    encryptionCheck,
    warning: 'Keep this file safe. Anyone with this file and your passphrase can access your data.'
  }
}

/**
 * Download recovery file to user's device
 * @param {Object} recoveryData - Recovery file contents
 */
export function downloadRecoveryFile(recoveryData) {
  const json = JSON.stringify(recoveryData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'goalflow-recovery.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

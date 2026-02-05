import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deriveKey, verifyPassphrase } from '../lib/encryption'
import { 
  storeDeviceCredentials, 
  getDeviceCredentials,
  hasDeviceCredentials 
} from '../lib/deviceStorage'

export default function UnlockPage() {
  const navigate = useNavigate()
  const { user, userSettings, setEncryptionKey, signOut } = useAuth()

  const [passphrase, setPassphrase] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoUnlocking, setAutoUnlocking] = useState(false)

  // Try auto-unlock on mount if device is remembered
  useEffect(() => {
    if (user && userSettings && hasDeviceCredentials(user.id)) {
      attemptAutoUnlock();
    }
  }, [user, userSettings]);

  async function attemptAutoUnlock() {
    const stored = getDeviceCredentials(user.id);
    if (!stored) return;

    setAutoUnlocking(true);

    try {
      const key = await deriveKey(stored.passphrase, userSettings.encryption_salt);
      const isValid = await verifyPassphrase(key, userSettings.encryption_check);

      if (isValid) {
        setEncryptionKey(key);
        navigate('/');
      } else {
        // Stored passphrase is invalid (maybe changed) - clear it
        console.log('[Unlock] Stored passphrase invalid, clearing...');
        setAutoUnlocking(false);
      }
    } catch (err) {
      console.error('[Unlock] Auto-unlock failed:', err);
      setAutoUnlocking(false);
    }
  }

  async function handleUnlock(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Derive key from passphrase
      const key = await deriveKey(passphrase, userSettings.encryption_salt)

      // 2. Verify passphrase is correct
      const isValid = await verifyPassphrase(key, userSettings.encryption_check)

      if (isValid) {
        // 3. Store on device if requested
        if (rememberDevice) {
          storeDeviceCredentials(user.id, passphrase);
        }

        // 4. Store key and navigate
        setEncryptionKey(key)
        navigate('/')
      } else {
        setError('Incorrect passphrase. Please try again.')
        setPassphrase('')
      }
    } catch (err) {
      console.error('Unlock error:', err)
      setError('Failed to unlock. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Show loading while auto-unlocking
  if (autoUnlocking) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-logo">🔓</span>
            <h1>Unlocking...</h1>
            <p>Using remembered credentials</p>
          </div>
          <div className="loading-container" style={{ minHeight: 'auto', padding: '24px 0' }}>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🔓</span>
          <h1>Unlock Your Data</h1>
          <p>Enter your encryption passphrase</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleUnlock}>
          <div className="form-group">
            <label htmlFor="passphrase">Passphrase</label>
            <input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter your passphrase"
              autoFocus
              required
            />
          </div>

          <label className="checkbox-label remember-device">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
            />
            <span>Remember on this device</span>
          </label>

          {rememberDevice && (
            <div className="remember-warning">
              ⚠️ Only use on your personal device. Anyone with access to this browser can view your data.
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !passphrase}
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>

        <div className="unlock-footer">
          <button onClick={handleSignOut} className="link-button">
            Sign out and use different account
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deriveKey, verifyPassphrase } from '../lib/encryption'

export default function UnlockPage() {
  const navigate = useNavigate()
  const { userSettings, setEncryptionKey, signOut } = useAuth()

  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        // 3. Store key and navigate
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

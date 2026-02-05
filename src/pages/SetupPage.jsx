import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import {
  generateSalt,
  deriveKey,
  createVerificationCheck,
  encryptData,
  getPassphraseStrength,
  validatePassphrase,
  createRecoveryFile,
  downloadRecoveryFile
} from '../lib/encryption'

// Default categories
const DEFAULT_CATEGORIES = [
  { name: 'Health', color: '#10B981', icon: '❤️' },
  { name: 'Relationships', color: '#F59E0B', icon: '👥' },
  { name: 'Professional', color: '#3B82F6', icon: '💼' },
  { name: 'Wealth', color: '#8B5CF6', icon: '💰' },
  { name: 'Personal', color: '#EC4899', icon: '⭐' }
]

export default function SetupPage() {
  const navigate = useNavigate()
  const { user, setEncryptionKey } = useAuth()

  const [step, setStep] = useState(1) // 1 = passphrase, 2 = recovery
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryData, setRecoveryData] = useState(null)
  const [downloaded, setDownloaded] = useState(false)

  const strength = getPassphraseStrength(passphrase)
  const validation = validatePassphrase(passphrase)

  async function handleSetupPassphrase(e) {
    e.preventDefault()
    setError('')

    // Validate
    if (!validation.valid) {
      setError('Please meet all passphrase requirements')
      return
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match')
      return
    }

    setLoading(true)

    try {
      // 1. Generate salt and derive key
      const salt = generateSalt()
      const key = await deriveKey(passphrase, salt)

      // 2. Create verification check
      const encryptionCheck = await createVerificationCheck(key)

      // 3. Create default settings
      const settings = {
        dailyTarget: 50,
        categoryBalanceBonus: 25
      }
      const encryptedSettings = await encryptData(settings, key)

      // 4. Save user_settings to database
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          encryption_salt: salt,
          encryption_check: encryptionCheck,
          data_encrypted: encryptedSettings
        })

      if (settingsError) throw settingsError

      // 5. Create default categories
      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const encrypted = await encryptData(DEFAULT_CATEGORIES[i], key)
        const { error: catError } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            order_num: i + 1,
            data_encrypted: encrypted
          })
        if (catError) throw catError
      }

      // 6. Store key in context
      setEncryptionKey(key)

      // 7. Create recovery file data
      const recovery = createRecoveryFile(user.id, salt, encryptionCheck)
      setRecoveryData(recovery)

      // 8. Move to recovery step
      setStep(2)

    } catch (err) {
      console.error('Setup error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (recoveryData) {
      downloadRecoveryFile(recoveryData)
      setDownloaded(true)
    }
  }

  function handleComplete() {
    navigate('/')
  }

  // Step 1: Passphrase Setup
  if (step === 1) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-logo">🔐</span>
            <h1>Secure Your Data</h1>
            <p>Create an encryption passphrase</p>
          </div>

          <div className="warning-box">
            ⚠️ This passphrase encrypts all your data. It's different from your account password. If you forget it, you'll need the recovery file.
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSetupPassphrase}>
            <div className="form-group">
              <label htmlFor="passphrase">Passphrase</label>
              <input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter a strong passphrase"
              />

              {/* Strength bar */}
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${strength}%`,
                    background: strength >= 80 ? '#10b981' : strength >= 50 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
              <span className="strength-label">
                Strength: {strength >= 80 ? 'Strong' : strength >= 50 ? 'Medium' : 'Weak'}
              </span>

              {/* Requirements */}
              <ul className="requirements">
                <li className={passphrase.length >= 12 ? 'met' : ''}>
                  At least 12 characters
                </li>
                <li className={/[A-Z]/.test(passphrase) ? 'met' : ''}>
                  One uppercase letter
                </li>
                <li className={/[a-z]/.test(passphrase) ? 'met' : ''}>
                  One lowercase letter
                </li>
                <li className={/[0-9]/.test(passphrase) ? 'met' : ''}>
                  One number
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassphrase">Confirm Passphrase</label>
              <input
                id="confirmPassphrase"
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Confirm your passphrase"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !validation.valid || passphrase !== confirmPassphrase}
            >
              {loading ? 'Setting up...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Step 2: Recovery File
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">📁</span>
          <h1>Save Recovery File</h1>
          <p>This is your only way to recover data</p>
        </div>

        <div className="recovery-info">
          <h3>Store this file safely:</h3>
          <ul>
            <li>✓ Password manager</li>
            <li>✓ USB drive</li>
            <li>✓ Secure cloud storage</li>
          </ul>
          <p className="recovery-warning">
            ⚠️ Without this file + passphrase = data lost forever
          </p>
        </div>

        <button
          onClick={handleDownload}
          className={`btn ${downloaded ? 'btn-secondary' : 'btn-primary'}`}
        >
          {downloaded ? '✓ Downloaded' : 'Download Recovery File'}
        </button>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={downloaded}
            onChange={(e) => setDownloaded(e.target.checked)}
          />
          I have saved my recovery file
        </label>

        <button
          onClick={handleComplete}
          className="btn btn-primary"
          disabled={!downloaded}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

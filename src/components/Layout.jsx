import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from './ConfirmModal'
import { clearDeviceCredentials, hasDeviceCredentials } from '../lib/deviceStorage.js'

// Optional imports - only if you've added Phase 4 components
// import OfflineIndicator from './OfflineIndicator'
// import UpdatePrompt from './UpdatePrompt'
// import InstallPrompt from './InstallPrompt'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [showMenu, setShowMenu] = useState(false)

  const isRemembered = user && hasDeviceCredentials(user.id)

  async function handleSignOut() {
    setShowMenu(false)
    await signOut()
    navigate('/login')
  }

  async function handleForgetDevice() {
    setShowMenu(false)
    const ok = await confirm(
        'This will require your passphrase next time you log in. Continue?',
        { title: 'Forget Device', confirmText: 'Forget' }
    )
    if (ok) {
      clearDeviceCredentials()
    }
  }

  return (
      <div className="app-layout">
        {/* Uncomment if you have Phase 2+ components:
      <OfflineIndicator />
      <UpdatePrompt />
      <InstallPrompt />
      */}

        <header className="app-header">
          <div className="header-left">
            <h1>🎯 GoalFlow</h1>
          </div>
          <div className="header-right">
            <span className="user-email">{user.email}</span>

            <div className="header-menu-container">
              <button
                  className="btn btn-secondary btn-small menu-trigger"
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="Menu"
              >
                ☰
              </button>

              {showMenu && (
                  <>
                    <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
                    <div className="header-menu">
                      {isRemembered && (
                          <button className="menu-item" onClick={handleForgetDevice}>
                            <span className="menu-icon">🔒</span>
                            <span>Forget this device</span>
                          </button>
                      )}
                      <button className="menu-item" onClick={handleSignOut}>
                        <span className="menu-icon">🚪</span>
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
              )}
            </div>
          </div>
        </header>

        <main className="app-main">
          {children}
        </main>

        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📊</span>
            <span className="nav-label">Today</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📅</span>
            <span className="nav-label">History</span>
          </NavLink>
          <NavLink to="/goals" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🏔️</span>
            <span className="nav-label">Goals</span>
          </NavLink>
          <NavLink to="/habits" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Habits</span>
          </NavLink>
        </nav>
      </div>
  )
}
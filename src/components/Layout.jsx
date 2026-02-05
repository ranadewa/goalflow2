import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OfflineIndicator from './OfflineIndicator'
import UpdatePrompt from './UpdatePrompt'
import InstallPrompt from './InstallPrompt'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()

  return (
    <div className="app-layout">
      <OfflineIndicator />
      <UpdatePrompt />
      <InstallPrompt />
      
      <header className="app-header">
        <div className="header-left">
          <h1>🎯 GoalFlow</h1>
        </div>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button onClick={signOut} className="btn btn-secondary btn-small">
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">📊</span>
          <span className="nav-label">Today</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">📅</span>
          <span className="nav-label">History</span>
        </NavLink>
        <NavLink to="/habits" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Habits</span>
        </NavLink>
      </nav>
    </div>
  )
}

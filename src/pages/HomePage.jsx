import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>🎯 GoalFlow</h1>
        <p className="success-text">✅ Phase 5 Complete!</p>

        <div className="user-info">
          <p><strong>Logged in as:</strong></p>
          <p>{user?.email}</p>
        </div>

        <p className="status-text">
          ✅ Authenticated<br />
          ✅ Encryption setup complete<br />
          ✅ Data unlocked
        </p>

        <button onClick={signOut} className="btn btn-secondary">
          Sign Out
        </button>

        <p className="next-step">
          Ready for Phase 6: Dashboard & Categories
        </p>
      </div>
    </div>
  )
}

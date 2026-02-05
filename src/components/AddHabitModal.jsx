import { useState } from 'react'

const EFFORT_LEVELS = [
  { points: 5, label: 'Easy', description: 'Quick, simple tasks' },
  { points: 10, label: 'Medium', description: 'Moderate effort' },
  { points: 20, label: 'Hard', description: 'Challenging tasks' }
]

export default function AddHabitModal({ isOpen, onClose, onAdd, categoryName }) {
  const [name, setName] = useState('')
  const [points, setPoints] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter a habit name')
      return
    }

    setLoading(true)
    try {
      await onAdd({ name: name.trim(), points })
      // Reset form
      setName('')
      setPoints(10)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Habit</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-category">
              Adding to: <strong>{categoryName}</strong>
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="habitName">Habit Name</label>
              <input
                id="habitName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning meditation"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Effort Level</label>
              <div className="effort-options">
                {EFFORT_LEVELS.map((level) => (
                  <button
                    key={level.points}
                    type="button"
                    className={`effort-option ${points === level.points ? 'selected' : ''}`}
                    onClick={() => setPoints(level.points)}
                  >
                    <span className="effort-points">{level.points} pts</span>
                    <span className="effort-label">{level.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Adding...' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

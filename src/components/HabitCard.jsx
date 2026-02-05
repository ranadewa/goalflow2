import { useState } from 'react'

export default function HabitCard({ 
  habit, 
  isCompleted, 
  completion,
  onToggle,
  onEdit,
  onDelete
}) {
  const [showMenu, setShowMenu] = useState(false)

  function handleMenuClick(e) {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  function handleEdit(e) {
    e.stopPropagation()
    setShowMenu(false)
    onEdit(habit)
  }

  function handleDelete(e) {
    e.stopPropagation()
    setShowMenu(false)
    if (confirm(`Delete "${habit.data.name}"? This cannot be undone.`)) {
      onDelete(habit)
    }
  }

  return (
    <div className={`habit-card ${isCompleted ? 'completed' : ''}`}>
      <button
        className={`habit-checkbox ${isCompleted ? 'checked' : ''}`}
        onClick={() => onToggle(habit, isCompleted, completion)}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        {isCompleted && '✓'}
      </button>

      <div className="habit-info">
        <span className="habit-name">{habit.data.name}</span>
      </div>

      <span className={`habit-points ${isCompleted ? 'earned' : ''}`}>
        {isCompleted ? '+' : ''}{habit.data.points} pts
      </span>

      <div className="habit-menu-container">
        <button 
          className="habit-menu-btn"
          onClick={handleMenuClick}
          aria-label="Habit options"
        >
          ⋮
        </button>

        {showMenu && (
          <>
            <div className="habit-menu-backdrop" onClick={() => setShowMenu(false)} />
            <div className="habit-menu">
              <button onClick={handleEdit}>
                ✏️ Edit
              </button>
              <button onClick={handleDelete} className="danger">
                🗑️ Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

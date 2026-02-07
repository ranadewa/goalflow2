import { useState } from 'react'
import { useConfirm } from './ConfirmModal'

export default function HabitCard({
                                      habit,
                                      isCompleted,
                                      completion,
                                      onToggle,
                                      onEdit,
                                      onDelete
                                  }) {
    const [showMenu, setShowMenu] = useState(false)
    const confirm = useConfirm()

    function handleMenuClick(e) {
        e.stopPropagation()
        setShowMenu(!showMenu)
    }

    function handleEdit(e) {
        e.stopPropagation()
        setShowMenu(false)
        onEdit(habit)
    }

    async function handleDelete(e) {
        e.stopPropagation()
        setShowMenu(false)
        const ok = await confirm(
            `Delete "${habit.data.name}"? This cannot be undone.`,
            { title: 'Delete Habit', confirmText: 'Delete', danger: true }
        )
        if (ok) {
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
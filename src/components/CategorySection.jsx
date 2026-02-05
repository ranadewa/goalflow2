import HabitCard from './HabitCard'

export default function CategorySection({ 
  category, 
  habits, 
  completions, 
  onToggleHabit,
  onAddHabit,
  onEditHabit,
  onDeleteHabit
}) {
  const categoryHabits = habits.filter(h => h.category_id === category.id)
  const completedIds = completions.map(c => c.habit_id)
  const completedCount = categoryHabits.filter(h => completedIds.includes(h.id)).length

  return (
    <div className="category-section">
      <div 
        className="category-header"
        style={{ borderLeftColor: category.data.color }}
      >
        <div className="category-info">
          <span className="category-icon">{category.data.icon}</span>
          <span className="category-name">{category.data.name}</span>
        </div>
        <span className="category-count">
          {completedCount}/{categoryHabits.length}
        </span>
      </div>

      <div className="category-habits">
        {categoryHabits.map(habit => {
          const isCompleted = completedIds.includes(habit.id)
          const completion = completions.find(c => c.habit_id === habit.id)

          return (
            <HabitCard
              key={habit.id}
              habit={habit}
              isCompleted={isCompleted}
              completion={completion}
              onToggle={onToggleHabit}
              onEdit={onEditHabit}
              onDelete={onDeleteHabit}
            />
          )
        })}

        <button 
          className="add-habit-btn"
          onClick={() => onAddHabit(category.id)}
        >
          + Add habit
        </button>
      </div>
    </div>
  )
}

export default function ScoreCard({ completions, habits, settings }) {
  // Calculate total points earned today
  const totalPoints = completions.reduce((sum, c) => {
    return sum + (c.data?.points || 0)
  }, 0)

  const target = settings?.dailyTarget || 50
  const percentage = Math.min(100, Math.round((totalPoints / target) * 100))
  const completedCount = completions.length
  const totalHabits = habits.length

  return (
    <div className="score-card">
      <div className="score-main">
        <span className="score-current">{totalPoints}</span>
        <span className="score-divider">/</span>
        <span className="score-target">{target} pts</span>
      </div>

      <div className="score-bar">
        <div 
          className="score-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="score-stats">
        <span>{completedCount} / {totalHabits} habits completed</span>
        <span>{percentage}%</span>
      </div>
    </div>
  )
}

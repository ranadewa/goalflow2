import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { decryptData, encryptData } from '../lib/encryption'

// Helper to format date as YYYY-MM-DD in local timezone
function formatDateLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Helper to parse YYYY-MM-DD as local date
function parseDateLocal(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Simple Chart Component
function ProgressChart({ days, getDateStats, target = 50 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 15, bottom: 30, left: 35 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)

    const reversedDays = [...days].reverse()
    const data = reversedDays.map(date => ({
      date,
      points: getDateStats(date).points
    }))

    if (data.length === 0) return

    const maxPoints = Math.max(target, ...data.map(d => d.points))
    const yMax = Math.ceil(maxPoints / 10) * 10 + 10

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()

      const value = Math.round(yMax - (yMax / gridLines) * i)
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(value.toString(), padding.left - 5, y + 3)
    }

    // Draw target line
    const targetY = padding.top + chartHeight * (1 - target / yMax)
    ctx.strokeStyle = '#10b981'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(padding.left, targetY)
    ctx.lineTo(width - padding.right, targetY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#10b981'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Goal', width - padding.right + 3, targetY + 3)

    // Draw data line
    if (data.length > 1) {
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.beginPath()

      data.forEach((d, i) => {
        const x = padding.left + (chartWidth / (data.length - 1)) * i
        const y = padding.top + chartHeight * (1 - d.points / yMax)
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Draw points
      data.forEach((d, i) => {
        const x = padding.left + (chartWidth / (data.length - 1)) * i
        const y = padding.top + chartHeight * (1 - d.points / yMax)
        
        if (d.points >= target) {
          ctx.fillStyle = '#10b981'
        } else if (d.points >= 30) {
          ctx.fillStyle = '#f59e0b'
        } else if (d.points > 0) {
          ctx.fillStyle = '#6366f1'
        } else {
          ctx.fillStyle = '#d1d5db'
        }

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // X axis labels
    const labelCount = Math.min(7, data.length)
    const labelStep = Math.ceil(data.length / labelCount)
    
    ctx.fillStyle = '#999'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'

    for (let i = 0; i < data.length; i += labelStep) {
      const x = padding.left + (chartWidth / (data.length - 1)) * i
      const date = parseDateLocal(data[i].date)
      const label = `${date.getDate()}/${date.getMonth() + 1}`
      ctx.fillText(label, x, height - 10)
    }

  }, [days, getDateStats, target])

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} className="progress-chart" />
    </div>
  )
}

export default function HistoryPage() {
  const { user, encryptionKey } = useAuth()

  const [categories, setCategories] = useState([])
  const [habits, setHabits] = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)

  // Date range state
  const now = new Date()
  const today = formatDateLocal(now)
  
  const defaultStart = new Date(now)
  defaultStart.setDate(now.getDate() - 29)
  
  const [startDate, setStartDate] = useState(formatDateLocal(defaultStart))
  const [endDate, setEndDate] = useState(today)
  const [showRangePicker, setShowRangePicker] = useState(false)

  // Yesterday for editable check
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(now.getDate() - 1)
  const yesterday = formatDateLocal(yesterdayDate)

  // Generate days in range
  const days = []
  const start = parseDateLocal(startDate)
  const end = parseDateLocal(endDate)
  const current = new Date(end)
  while (current >= start) {
    days.push(formatDateLocal(current))
    current.setDate(current.getDate() - 1)
  }

  // Reflections state
  const [grateful, setGrateful] = useState('')
  const [lessons, setLessons] = useState('')
  const [reflectionId, setReflectionId] = useState(null)
  const [savingReflection, setSavingReflection] = useState(false)
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  useEffect(() => {
    if (selectedDate === yesterday) {
      loadReflection(yesterday)
    } else {
      setGrateful('')
      setLessons('')
      setReflectionId(null)
    }
  }, [selectedDate])

  async function loadData() {
    setLoading(true)

    try {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('order_num')

      if (catError) throw catError

      const decryptedCategories = await Promise.all(
        catData.map(async (cat) => ({
          ...cat,
          data: await decryptData(cat.data_encrypted, encryptionKey)
        }))
      )
      setCategories(decryptedCategories)

      const { data: habitData, error: habitError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)

      if (habitError) throw habitError

      const decryptedHabits = await Promise.all(
        (habitData || []).map(async (habit) => ({
          ...habit,
          data: await decryptData(habit.data_encrypted, encryptionKey)
        }))
      )
      setHabits(decryptedHabits)

      const { data: compData, error: compError } = await supabase
        .from('completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (compError) throw compError

      const decryptedCompletions = await Promise.all(
        (compData || []).map(async (comp) => ({
          ...comp,
          data: await decryptData(comp.data_encrypted, encryptionKey)
        }))
      )
      setCompletions(decryptedCompletions)

    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadReflection(date) {
    try {
      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading reflection:', error)
        return
      }

      if (data) {
        const decrypted = await decryptData(data.data_encrypted, encryptionKey)
        setGrateful(decrypted.grateful || '')
        setLessons(decrypted.lessons || '')
        setReflectionId(data.id)
      } else {
        setGrateful('')
        setLessons('')
        setReflectionId(null)
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async function saveReflection(newGrateful, newLessons) {
    if (!newGrateful.trim() && !newLessons.trim()) {
      if (reflectionId) {
        await supabase.from('reflections').delete().eq('id', reflectionId)
        setReflectionId(null)
      }
      return
    }

    setSavingReflection(true)
    setReflectionSaved(false)
    
    try {
      const reflectionData = {
        grateful: newGrateful.trim(),
        lessons: newLessons.trim()
      }
      const encrypted = await encryptData(reflectionData, encryptionKey)

      if (reflectionId) {
        await supabase
          .from('reflections')
          .update({ 
            data_encrypted: encrypted,
            updated_at: new Date().toISOString()
          })
          .eq('id', reflectionId)
      } else {
        const { data } = await supabase
          .from('reflections')
          .insert({
            user_id: user.id,
            date: yesterday,
            data_encrypted: encrypted
          })
          .select()
          .single()
        
        if (data) {
          setReflectionId(data.id)
        }
      }
      
      setReflectionSaved(true)
    } catch (err) {
      console.error('Error saving reflection:', err)
    } finally {
      setSavingReflection(false)
    }
  }

  function handleReflectionChange(field, value) {
    if (field === 'grateful') {
      setGrateful(value)
    } else {
      setLessons(value)
    }

    setReflectionSaved(false)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const g = field === 'grateful' ? value : grateful
      const l = field === 'lessons' ? value : lessons
      saveReflection(g, l)
    }, 1000)
  }

  async function handleToggleHabit(habit, isCompleted, completion) {
    if (selectedDate !== yesterday) return

    try {
      if (isCompleted) {
        const { error } = await supabase
          .from('completions')
          .delete()
          .eq('id', completion.id)

        if (error) throw error

        setCompletions(completions.filter(c => c.id !== completion.id))
      } else {
        const completionData = {
          completed: true,
          points: habit.data.points
        }
        const encrypted = await encryptData(completionData, encryptionKey)

        const { data, error } = await supabase
          .from('completions')
          .insert({
            user_id: user.id,
            habit_id: habit.id,
            date: selectedDate,
            data_encrypted: encrypted
          })
          .select()
          .single()

        if (error) throw error

        setCompletions([...completions, { ...data, data: completionData }])
      }
    } catch (err) {
      console.error('Error toggling habit:', err)
      alert('Failed to update: ' + err.message)
    }
  }

  function handleQuickRange(rangeDays) {
    const newEnd = new Date(now)
    const newStart = new Date(now)
    newStart.setDate(now.getDate() - (rangeDays - 1))
    
    setStartDate(formatDateLocal(newStart))
    setEndDate(formatDateLocal(newEnd))
    setShowRangePicker(false)
    setSelectedDate(null)
  }

  function handleCustomRange() {
    setShowRangePicker(false)
    setSelectedDate(null)
  }

  function getDateStats(date) {
    const dayCompletions = completions.filter(c => c.date === date)
    const points = dayCompletions.reduce((sum, c) => sum + (c.data?.points || 0), 0)
    const count = dayCompletions.length
    return { points, count, completions: dayCompletions }
  }

  function formatDateDisplay(dateStr) {
    const date = parseDateLocal(dateStr)

    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'

    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  function formatRangeLabel() {
    const dayCount = days.length
    if (dayCount === 7) return 'Last 7 days'
    if (dayCount === 30) return 'Last 30 days'
    if (dayCount === 90) return 'Last 90 days'
    
    const startDisplay = parseDateLocal(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endDisplay = parseDateLocal(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${startDisplay} - ${endDisplay}`
  }

  function getScoreColor(points) {
    if (points >= 50) return '#10b981'
    if (points >= 30) return '#f59e0b'
    if (points > 0) return '#6366f1'
    return '#e5e7eb'
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading history...</p>
      </div>
    )
  }

  const selectedStats = selectedDate ? getDateStats(selectedDate) : null
  const isYesterday = selectedDate === yesterday
  const activeHabits = habits.filter(h => h.active)

  const totalPoints = completions.reduce((sum, c) => sum + (c.data?.points || 0), 0)
  const avgPoints = days.length > 0 ? Math.round(totalPoints / days.length) : 0
  const daysAtGoal = days.filter(d => getDateStats(d).points >= 50).length

  return (
    <div className="history-page">
      <div className="page-header-bar">
        <h2>History</h2>
        <button 
          className="range-button"
          onClick={() => setShowRangePicker(!showRangePicker)}
        >
          📅 {formatRangeLabel()}
        </button>
      </div>

      {showRangePicker && (
        <div className="range-picker">
          <div className="range-quick-options">
            <button onClick={() => handleQuickRange(7)}>Last 7 days</button>
            <button onClick={() => handleQuickRange(30)}>Last 30 days</button>
            <button onClick={() => handleQuickRange(90)}>Last 90 days</button>
          </div>
          <div className="range-custom">
            <div className="range-input">
              <label>From</label>
              <input 
                type="date" 
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="range-input">
              <label>To</label>
              <input 
                type="date" 
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-small" onClick={handleCustomRange}>
              Apply
            </button>
          </div>
        </div>
      )}

      <div className="range-summary">
        <div className="summary-stat">
          <span className="summary-value">{totalPoints}</span>
          <span className="summary-label">Total pts</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{avgPoints}</span>
          <span className="summary-label">Daily avg</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value">{daysAtGoal}</span>
          <span className="summary-label">Goals met</span>
        </div>
      </div>

      <ProgressChart days={days} getDateStats={getDateStats} target={50} />

      <div className="history-grid">
        {days.map(date => {
          const stats = getDateStats(date)
          const isSelected = date === selectedDate
          const isToday = date === today
          const isYesterdayDate = date === yesterday

          return (
            <button
              key={date}
              className={`history-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isYesterdayDate ? 'yesterday' : ''}`}
              onClick={() => setSelectedDate(isSelected ? null : date)}
            >
              <span className="history-day-name">
                {parseDateLocal(date).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="history-day-num">
                {parseDateLocal(date).getDate()}
              </span>
              <span 
                className="history-day-dot"
                style={{ background: getScoreColor(stats.points) }}
              />
              <span className="history-day-points">
                {stats.points > 0 ? stats.points : '-'}
              </span>
            </button>
          )
        })}
      </div>

      {selectedDate && selectedStats && (
        <div className="history-detail">
          <div className="history-detail-header">
            <h3>{formatDateDisplay(selectedDate)}</h3>
            <div className="history-detail-right">
              {isYesterday && <span className="edit-badge">✏️ Editable</span>}
              <span className="history-detail-score" style={{ color: getScoreColor(selectedStats.points) }}>
                {selectedStats.points} pts
              </span>
            </div>
          </div>

          {isYesterday ? (
            <div className="history-editable">
              <p className="edit-hint">Tap habits to mark complete/incomplete</p>
              {categories.map(category => {
                const categoryHabits = activeHabits.filter(h => h.category_id === category.id)
                if (categoryHabits.length === 0) return null

                const completedIds = selectedStats.completions.map(c => c.habit_id)

                return (
                  <div key={category.id} className="history-category">
                    <div 
                      className="history-category-header"
                      style={{ borderLeftColor: category.data.color }}
                    >
                      <span>{category.data.icon} {category.data.name}</span>
                    </div>
                    {categoryHabits.map(habit => {
                      const isCompleted = completedIds.includes(habit.id)
                      const completion = selectedStats.completions.find(c => c.habit_id === habit.id)

                      return (
                        <div 
                          key={habit.id} 
                          className={`history-habit-item ${isCompleted ? 'completed' : ''}`}
                          onClick={() => handleToggleHabit(habit, isCompleted, completion)}
                        >
                          <span className={`history-habit-checkbox ${isCompleted ? 'checked' : ''}`}>
                            {isCompleted && '✓'}
                          </span>
                          <span className="history-habit-name">{habit.data.name}</span>
                          <span className={`history-habit-points ${isCompleted ? 'earned' : ''}`}>
                            {isCompleted ? '+' : ''}{habit.data.points}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              <div className="history-reflections">
                <div className="reflections-header">
                  <h4>📝 Reflections</h4>
                  {savingReflection && <span className="saving-indicator">Saving...</span>}
                  {!savingReflection && reflectionSaved && <span className="saved-indicator">✓ Saved</span>}
                </div>

                <div className="reflection-box">
                  <label htmlFor="grateful-yesterday">I was grateful for...</label>
                  <textarea
                    id="grateful-yesterday"
                    value={grateful}
                    onChange={(e) => handleReflectionChange('grateful', e.target.value)}
                    placeholder="What made yesterday good?"
                    rows={2}
                  />
                </div>

                <div className="reflection-box">
                  <label htmlFor="lessons-yesterday">Lessons I learned...</label>
                  <textarea
                    id="lessons-yesterday"
                    value={lessons}
                    onChange={(e) => handleReflectionChange('lessons', e.target.value)}
                    placeholder="What did you learn yesterday?"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {selectedStats.count === 0 ? (
                <p className="history-empty">No habits completed this day</p>
              ) : (
                <div className="history-completions">
                  {selectedStats.completions.map(comp => {
                    const habit = habits.find(h => h.id === comp.habit_id)
                    return (
                      <div key={comp.id} className="history-completion">
                        <span className="history-check">✓</span>
                        <span className="history-habit-name">
                          {habit?.data?.name || 'Unknown habit'}
                        </span>
                        <span className="history-habit-points earned">
                          +{comp.data?.points || 0}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!selectedDate && (
        <div className="history-hint">
          <p>👆 Tap a day to see details</p>
          <p className="hint-small">You can edit yesterday's habits & reflections</p>
        </div>
      )}

      <div className="history-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#10b981' }} />
          <span>50+ pts</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f59e0b' }} />
          <span>30-49 pts</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#6366f1' }} />
          <span>1-29 pts</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#e5e7eb' }} />
          <span>No activity</span>
        </div>
      </div>
    </div>
  )
}

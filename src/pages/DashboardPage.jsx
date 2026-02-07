import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { decryptData, encryptData } from '../lib/encryption'
import useHabitsData from '../hooks/useHabitsData'
import { useToast } from '../components/Toast'
import ScoreCard from '../components/ScoreCard'
import DailyReflections from '../components/DailyReflections'

export default function DashboardPage() {
    const { user, encryptionKey } = useAuth()
    const toast = useToast()
    const {
        categories,
        habits,
        loading: habitsLoading,
        error: habitsError,
        reload: reloadHabits
    } = useHabitsData()

    const [completions, setCompletions] = useState([])
    const [settings, setSettings] = useState(null)
    const [extraLoading, setExtraLoading] = useState(true)
    const [extraError, setExtraError] = useState(null)

    // Get today's date in YYYY-MM-DD format (local timezone)
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    useEffect(() => {
        loadDashboardData()
    }, [])

    async function loadDashboardData() {
        setExtraLoading(true)
        setExtraError(null)

        try {
            // Load today's completions
            const { data: compData, error: compError } = await supabase
                .from('completions')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)

            if (compError) throw compError

            const decryptedCompletions = await Promise.all(
                (compData || []).map(async (comp) => ({
                    ...comp,
                    data: await decryptData(comp.data_encrypted, encryptionKey)
                }))
            )
            setCompletions(decryptedCompletions)

            // Load settings
            const { data: settingsData } = await supabase
                .from('user_settings')
                .select('data_encrypted')
                .eq('user_id', user.id)
                .single()

            if (settingsData?.data_encrypted) {
                const decryptedSettings = await decryptData(
                    settingsData.data_encrypted,
                    encryptionKey
                )
                setSettings(decryptedSettings)
            }

        } catch (err) {
            console.error('Error loading dashboard data:', err)
            setExtraError(err.message)
        } finally {
            setExtraLoading(false)
        }
    }

    async function handleToggleHabit(habit, isCompleted, completion) {
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
                        date: today,
                        data_encrypted: encrypted
                    })
                    .select()
                    .single()

                if (error) throw error

                setCompletions([...completions, { ...data, data: completionData }])
            }
        } catch (err) {
            console.error('Error toggling habit:', err)
            toast.error('Failed to update habit: ' + err.message)
        }
    }

    const displayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    })

    const loading = habitsLoading || extraLoading
    const error = habitsError || extraError

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading your habits...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>Something went wrong</h2>
                <p>{error}</p>
                <button onClick={() => { reloadHabits(); loadDashboardData() }} className="btn btn-primary">
                    Try Again
                </button>
            </div>
        )
    }

    const completedIds = completions.map(c => c.habit_id)

    return (
        <div className="dashboard-content">
            <div className="page-header-bar">
                <div>
                    <h2>Today</h2>
                    <p>{displayDate}</p>
                </div>
            </div>

            <ScoreCard
                completions={completions}
                habits={habits}
                settings={settings}
            />

            {habits.length === 0 ? (
                <div className="empty-state">
                    <p>🎯 No habits yet!</p>
                    <p>Go to the Habits tab to add some.</p>
                    <Link to="/habits" className="btn btn-primary">
                        Manage Habits
                    </Link>
                </div>
            ) : (
                <>
                    <div className="daily-habits">
                        {categories.map(category => {
                            const categoryHabits = habits.filter(h => h.category_id === category.id)
                            if (categoryHabits.length === 0) return null

                            const completedCount = categoryHabits.filter(h => completedIds.includes(h.id)).length

                            return (
                                <div key={category.id} className="daily-category">
                                    <div
                                        className="daily-category-header"
                                        style={{ borderLeftColor: category.data.color }}
                                    >
                                        <span>{category.data.icon} {category.data.name}</span>
                                        <span className="category-count">{completedCount}/{categoryHabits.length}</span>
                                    </div>

                                    {categoryHabits.map(habit => {
                                        const isCompleted = completedIds.includes(habit.id)
                                        const completion = completions.find(c => c.habit_id === habit.id)

                                        return (
                                            <div
                                                key={habit.id}
                                                className={`daily-habit ${isCompleted ? 'completed' : ''}`}
                                                onClick={() => handleToggleHabit(habit, isCompleted, completion)}
                                            >
                        <span className={`daily-checkbox ${isCompleted ? 'checked' : ''}`}>
                          {isCompleted && '✓'}
                        </span>
                                                <span className="daily-habit-name">{habit.data.name}</span>
                                                <span className={`daily-habit-points ${isCompleted ? 'earned' : ''}`}>
                          {isCompleted ? '+' : ''}{habit.data.points}
                        </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>

                    <DailyReflections date={today} />
                </>
            )}
        </div>
    )
}
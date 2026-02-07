import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { decryptData } from '../lib/encryption'

/**
 * Shared hook for fetching and decrypting categories and active habits.
 * Used by DashboardPage, HabitsPage, and any future page that needs this data.
 *
 * @returns {{ categories, setCategories, habits, setHabits, loading, error, reload }}
 */
export default function useHabitsData() {
    const { user, encryptionKey } = useAuth()

    const [categories, setCategories] = useState([])
    const [habits, setHabits] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            // Load categories
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

            // Load active habits
            const { data: habitData, error: habitError } = await supabase
                .from('habits')
                .select('*')
                .eq('user_id', user.id)
                .eq('active', true)

            if (habitError) throw habitError

            const decryptedHabits = await Promise.all(
                (habitData || []).map(async (habit) => ({
                    ...habit,
                    data: await decryptData(habit.data_encrypted, encryptionKey)
                }))
            )
            setHabits(decryptedHabits)
        } catch (err) {
            console.error('Error loading habits data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [user.id, encryptionKey])

    useEffect(() => {
        loadData()
    }, [loadData])

    return {
        categories,
        setCategories,
        habits,
        setHabits,
        loading,
        error,
        reload: loadData
    }
}
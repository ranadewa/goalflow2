import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { decryptData, encryptData } from '../lib/encryption'

/**
 * Goal type hierarchy for determining child types
 */
const CHILD_TYPE = {
    yearly: 'quarterly',
    quarterly: 'monthly',
    monthly: 'weekly',
    weekly: null
}

const TYPE_LABELS = {
    yearly: 'Yearly Goal',
    quarterly: 'Quarterly Milestone',
    monthly: 'Monthly Target',
    weekly: 'Weekly Task'
}

/**
 * Get the current quarter (1-4) and its label
 */
function getCurrentQuarter() {
    const month = new Date().getMonth() // 0-11
    const quarter = Math.floor(month / 3) + 1
    return { quarter, label: `Q${quarter}` }
}

/**
 * Get quarter number for a given date
 */
function getQuarterForDate(dateStr) {
    const date = new Date(dateStr)
    return Math.floor(date.getMonth() / 3) + 1
}

/**
 * Build a tree from flat goals array.
 * Each goal gets a `children` array and computed `progress`.
 */
function buildGoalTree(flatGoals) {
    const map = {}
    const roots = []

    // Index all goals by id
    flatGoals.forEach(goal => {
        map[goal.id] = { ...goal, children: [] }
    })

    // Link children to parents
    flatGoals.forEach(goal => {
        if (goal.parent_id && map[goal.parent_id]) {
            map[goal.parent_id].children.push(map[goal.id])
        } else if (!goal.parent_id) {
            roots.push(map[goal.id])
        }
    })

    // Sort children by created_at
    Object.values(map).forEach(goal => {
        goal.children.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    })

    return roots
}

/**
 * Calculate progress for a goal node (recursive).
 * - If goal has children: average of children's progress
 * - If goal is completed: 100
 * - Otherwise: manual percentage from data.progress or 0
 */
function computeProgress(goalNode) {
    if (goalNode.status === 'completed') return 100

    if (goalNode.children && goalNode.children.length > 0) {
        const childProgress = goalNode.children.map(c => computeProgress(c))
        const avg = childProgress.reduce((sum, p) => sum + p, 0) / childProgress.length
        return Math.round(avg)
    }

    // Manual progress stored in encrypted data
    return goalNode.data?.progress || 0
}

/**
 * Find the "current focus" child for a yearly goal.
 * Returns the active quarterly goal for the current quarter,
 * or the first active child if none match.
 */
function findCurrentFocus(yearlyGoal) {
    if (!yearlyGoal.children || yearlyGoal.children.length === 0) return null

    const { quarter } = getCurrentQuarter()
    const activeChildren = yearlyGoal.children.filter(c => c.status === 'active')

    // Try to find one matching current quarter by creation date or order
    // For now, use simple index: Q1 = first child, Q2 = second, etc.
    const quarterChild = activeChildren[quarter - 1] || activeChildren[0]
    return quarterChild || null
}

/**
 * Shared hook for fetching, decrypting, and managing goals.
 * Follows the same pattern as useHabitsData.
 *
 * @returns {{ goals, goalTree, loading, error, reload, createGoal, updateGoal, deleteGoal, toggleGoalStatus }}
 */
export default function useGoals() {
    const { user, encryptionKey } = useAuth()

    const [goals, setGoals] = useState([])       // flat array
    const [goalTree, setGoalTree] = useState([])  // nested tree (yearly roots)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadGoals = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const { data: goalsData, error: goalsError } = await supabase
                .from('goals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at')

            if (goalsError) throw goalsError

            // Decrypt all goals
            const decrypted = await Promise.all(
                (goalsData || []).map(async (goal) => ({
                    ...goal,
                    data: await decryptData(goal.data_encrypted, encryptionKey)
                }))
            )

            setGoals(decrypted)

            // Build tree and compute progress
            const tree = buildGoalTree(decrypted)
            tree.forEach(root => {
                root.computedProgress = computeProgress(root)
                root.currentFocus = findCurrentFocus(root)
                if (root.currentFocus) {
                    root.currentFocus.computedProgress = computeProgress(root.currentFocus)
                }
            })
            setGoalTree(tree)

        } catch (err) {
            console.error('Error loading goals:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [user.id, encryptionKey])

    useEffect(() => {
        loadGoals()
    }, [loadGoals])

    /**
     * Create a new goal.
     * @param {Object} goalInput - { name, description, goal_type, parent_id?, linked_habit_id?, target_min?, target_max?, intention_when?, intention_where? }
     * @returns {Object} The created goal with decrypted data
     */
    async function createGoal(goalInput) {
        const { goal_type, parent_id, linked_habit_id, target_min, target_max, ...encryptedFields } = goalInput

        const encrypted = await encryptData(encryptedFields, encryptionKey)

        const { data, error: insertError } = await supabase
            .from('goals')
            .insert({
                user_id: user.id,
                goal_type,
                parent_id: parent_id || null,
                linked_habit_id: linked_habit_id || null,
                target_min: target_min || null,
                target_max: target_max || null,
                status: 'active',
                data_encrypted: encrypted
            })
            .select()
            .single()

        if (insertError) throw insertError

        const newGoal = { ...data, data: encryptedFields }

        // Update local state
        const updatedGoals = [...goals, newGoal]
        setGoals(updatedGoals)
        rebuildTree(updatedGoals)

        return newGoal
    }

    /**
     * Update an existing goal's encrypted data and/or plain fields.
     */
    async function updateGoal(goalId, updates) {
        const { target_min, target_max, status, linked_habit_id, ...encryptedFields } = updates

        const updatePayload = { updated_at: new Date().toISOString() }

        // Only re-encrypt if there are encrypted field changes
        if (Object.keys(encryptedFields).length > 0) {
            // Merge with existing encrypted data
            const existing = goals.find(g => g.id === goalId)
            const mergedData = { ...existing?.data, ...encryptedFields }
            updatePayload.data_encrypted = await encryptData(mergedData, encryptionKey)
        }

        if (target_min !== undefined) updatePayload.target_min = target_min
        if (target_max !== undefined) updatePayload.target_max = target_max
        if (status !== undefined) updatePayload.status = status
        if (linked_habit_id !== undefined) updatePayload.linked_habit_id = linked_habit_id

        const { error: updateError } = await supabase
            .from('goals')
            .update(updatePayload)
            .eq('id', goalId)

        if (updateError) throw updateError

        // Update local state
        const updatedGoals = goals.map(g => {
            if (g.id !== goalId) return g
            return {
                ...g,
                ...updatePayload,
                data: Object.keys(encryptedFields).length > 0
                    ? { ...g.data, ...encryptedFields }
                    : g.data
            }
        })
        setGoals(updatedGoals)
        rebuildTree(updatedGoals)
    }

    /**
     * Delete a goal (cascade deletes children via DB foreign key).
     */
    async function deleteGoal(goalId) {
        const { error: deleteError } = await supabase
            .from('goals')
            .delete()
            .eq('id', goalId)

        if (deleteError) throw deleteError

        // Remove goal and all descendants from local state
        const idsToRemove = getDescendantIds(goalId, goals)
        idsToRemove.add(goalId)

        const updatedGoals = goals.filter(g => !idsToRemove.has(g.id))
        setGoals(updatedGoals)
        rebuildTree(updatedGoals)
    }

    /**
     * Toggle goal status between active and completed.
     */
    async function toggleGoalStatus(goalId) {
        const goal = goals.find(g => g.id === goalId)
        if (!goal) return

        const newStatus = goal.status === 'completed' ? 'active' : 'completed'
        await updateGoal(goalId, { status: newStatus })
    }

    // Helper: rebuild tree from flat goals
    function rebuildTree(flatGoals) {
        const tree = buildGoalTree(flatGoals)
        tree.forEach(root => {
            root.computedProgress = computeProgress(root)
            root.currentFocus = findCurrentFocus(root)
            if (root.currentFocus) {
                root.currentFocus.computedProgress = computeProgress(root.currentFocus)
            }
        })
        setGoalTree(tree)
    }

    // Helper: get all descendant IDs for cascade removal
    function getDescendantIds(parentId, allGoals) {
        const ids = new Set()
        const children = allGoals.filter(g => g.parent_id === parentId)
        children.forEach(child => {
            ids.add(child.id)
            const grandchildren = getDescendantIds(child.id, allGoals)
            grandchildren.forEach(id => ids.add(id))
        })
        return ids
    }

    return {
        goals,
        goalTree,
        loading,
        error,
        reload: loadGoals,
        createGoal,
        updateGoal,
        deleteGoal,
        toggleGoalStatus
    }
}

// Export helpers for use in components
export { CHILD_TYPE, TYPE_LABELS, getCurrentQuarter, computeProgress, findCurrentFocus }
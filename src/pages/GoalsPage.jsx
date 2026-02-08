import { useState } from 'react'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import useGoals, { CHILD_TYPE, TYPE_LABELS } from '../hooks/useGoals'
import useHabitsData from '../hooks/useHabitsData'
import GoalCard from '../components/GoalCard'
import GoalFormModal from '../components/GoalFormModal'

/**
 * GoalsPage - Main page for the Goals tab.
 *
 * Displays yearly goals as expandable cards with three-layer drill-down.
 * Uses GoalFormModal for creating/editing goals with implementation
 * intentions, range targets, and linked habits.
 */
export default function GoalsPage() {
    const toast = useToast()
    const confirm = useConfirm()
    const {
        goalTree,
        goals,
        loading,
        error,
        reload,
        createGoal,
        updateGoal,
        deleteGoal,
        toggleGoalStatus
    } = useGoals()

    const {
        habits,
        loading: habitsLoading
    } = useHabitsData()

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('create')
    const [editingGoal, setEditingGoal] = useState(null)
    const [modalParentId, setModalParentId] = useState(null)
    const [modalGoalType, setModalGoalType] = useState('yearly')

    // Filter: show archived goals
    const [showArchived, setShowArchived] = useState(false)

    // ============ Modal Handlers ============

    function openCreateModal(parentId = null, goalType = 'yearly') {
        setModalMode('create')
        setEditingGoal(null)
        setModalParentId(parentId)
        setModalGoalType(goalType)
        setShowModal(true)
    }

    function openEditModal(goal) {
        setModalMode('edit')
        setEditingGoal(goal)
        setModalParentId(goal.parent_id)
        setModalGoalType(goal.goal_type)
        setShowModal(true)
    }

    function closeModal() {
        setShowModal(false)
        setEditingGoal(null)
    }

    /**
     * Unified save handler called by GoalFormModal.
     * Routes to createGoal or updateGoal based on mode.
     */
    async function handleModalSave(goalData, existingGoal) {
        if (existingGoal) {
            // Edit mode — separate encrypted fields from plain fields
            const { goal_type, parent_id, ...updates } = goalData
            await updateGoal(existingGoal.id, updates)
            toast.success('Goal updated')
        } else {
            // Create mode
            await createGoal(goalData)
            toast.success(`${TYPE_LABELS[goalData.goal_type]} created`)
        }
    }

    // ============ Action Handlers ============

    async function handleDelete(goal) {
        const childCount = countDescendants(goal)
        const message = childCount > 0
            ? `Delete "${goal.data?.name}" and its ${childCount} sub-goal(s)? This cannot be undone.`
            : `Delete "${goal.data?.name}"? This cannot be undone.`

        const ok = await confirm(message, {
            title: 'Delete Goal',
            confirmText: 'Delete',
            danger: true
        })
        if (!ok) return

        try {
            await deleteGoal(goal.id)
            toast.success('Goal deleted')
        } catch (err) {
            console.error('Error deleting goal:', err)
            toast.error('Failed to delete: ' + err.message)
        }
    }

    async function handleToggle(goalId) {
        try {
            await toggleGoalStatus(goalId)
        } catch (err) {
            console.error('Error toggling goal:', err)
            toast.error('Failed to update: ' + err.message)
        }
    }

    function handleAddChild(parentId, childType) {
        openCreateModal(parentId, childType)
    }

    // ============ Helpers ============

    function countDescendants(goal) {
        if (!goal.children) return 0
        let count = goal.children.length
        goal.children.forEach(child => {
            count += countDescendants(child)
        })
        return count
    }

    // Filter goals
    const activeGoals = goalTree.filter(g => g.status !== 'archived')
    const archivedGoals = goalTree.filter(g => g.status === 'archived')

    // ============ Render ============

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading your goals...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>Something went wrong</h2>
                <p>{error}</p>
                <button onClick={reload} className="btn btn-primary">
                    Try Again
                </button>
            </div>
        )
    }

    return (
        <div className="goals-page">
            <div className="page-header-bar">
                <div>
                    <h2>Goals</h2>
                    <p>Yearly goals with cascading milestones</p>
                </div>
                <button
                    className="btn btn-primary btn-small"
                    onClick={() => openCreateModal()}
                >
                    + Goal
                </button>
            </div>

            {activeGoals.length === 0 ? (
                <div className="empty-state">
                    <p>🎯 No goals yet!</p>
                    <p>Set your first yearly goal to get started.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => openCreateModal()}
                    >
                        Set a Yearly Goal
                    </button>
                </div>
            ) : (
                <div className="goals-list">
                    {activeGoals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onAddChild={handleAddChild}
                            onEdit={openEditModal}
                            onDelete={handleDelete}
                            onToggle={handleToggle}
                        />
                    ))}
                </div>
            )}

            {/* Archived goals */}
            {archivedGoals.length > 0 && (
                <div className="goals-archived-section">
                    <button
                        className="goals-archived-toggle"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? 'Hide' : 'Show'} archived ({archivedGoals.length})
                    </button>

                    {showArchived && (
                        <div className="goals-list archived">
                            {archivedGoals.map(goal => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    onAddChild={handleAddChild}
                                    onEdit={openEditModal}
                                    onDelete={handleDelete}
                                    onToggle={handleToggle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Goal Form Modal */}
            <GoalFormModal
                isOpen={showModal}
                onClose={closeModal}
                onSave={handleModalSave}
                mode={modalMode}
                goalType={modalGoalType}
                editingGoal={editingGoal}
                parentId={modalParentId}
                habits={habits}
            />
        </div>
    )
}
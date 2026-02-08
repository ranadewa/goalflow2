import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmModal'
import useGoals, { CHILD_TYPE, TYPE_LABELS } from '../hooks/useGoals'
import GoalCard from '../components/GoalCard'

/**
 * GoalsPage - Main page for the Goals tab.
 *
 * Displays yearly goals as expandable cards with three-layer drill-down.
 * Includes a creation modal for adding new goals at any level.
 */
export default function GoalsPage() {
    const { user } = useAuth()
    const toast = useToast()
    const confirm = useConfirm()
    const {
        goalTree,
        loading,
        error,
        reload,
        createGoal,
        updateGoal,
        deleteGoal,
        toggleGoalStatus
    } = useGoals()

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
    const [editingGoal, setEditingGoal] = useState(null)
    const [modalParentId, setModalParentId] = useState(null)
    const [modalGoalType, setModalGoalType] = useState('yearly')

    // Form state
    const [formName, setFormName] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [saving, setSaving] = useState(false)

    // Filter: show archived goals
    const [showArchived, setShowArchived] = useState(false)

    // ============ Modal Handlers ============

    function openCreateModal(parentId = null, goalType = 'yearly') {
        setModalMode('create')
        setEditingGoal(null)
        setModalParentId(parentId)
        setModalGoalType(goalType)
        setFormName('')
        setFormDescription('')
        setShowModal(true)
    }

    function openEditModal(goal) {
        setModalMode('edit')
        setEditingGoal(goal)
        setModalParentId(goal.parent_id)
        setModalGoalType(goal.goal_type)
        setFormName(goal.data?.name || '')
        setFormDescription(goal.data?.description || '')
        setShowModal(true)
    }

    function closeModal() {
        setShowModal(false)
        setEditingGoal(null)
        setFormName('')
        setFormDescription('')
    }

    async function handleSave() {
        if (!formName.trim()) {
            toast.warning('Please enter a goal name')
            return
        }

        setSaving(true)

        try {
            if (modalMode === 'edit' && editingGoal) {
                await updateGoal(editingGoal.id, {
                    name: formName.trim(),
                    description: formDescription.trim()
                })
                toast.success('Goal updated')
            } else {
                await createGoal({
                    goal_type: modalGoalType,
                    parent_id: modalParentId,
                    name: formName.trim(),
                    description: formDescription.trim()
                })
                toast.success(`${TYPE_LABELS[modalGoalType]} created`)
            }
            closeModal()
        } catch (err) {
            console.error('Error saving goal:', err)
            toast.error('Failed to save: ' + err.message)
        } finally {
            setSaving(false)
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>
                                {modalMode === 'edit'
                                    ? `Edit ${TYPE_LABELS[modalGoalType]}`
                                    : `New ${TYPE_LABELS[modalGoalType]}`}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label htmlFor="goalName">
                                    {modalGoalType === 'yearly' ? "What's your big goal for the year?" : 'Name'}
                                </label>
                                <input
                                    id="goalName"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder={
                                        modalGoalType === 'yearly' ? 'e.g., Run a marathon'
                                            : modalGoalType === 'quarterly' ? 'e.g., Complete half-marathon training'
                                                : modalGoalType === 'monthly' ? 'e.g., Run 80km this month'
                                                    : 'e.g., Run 3 times this week'
                                    }
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && !saving && handleSave()}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="goalDescription">Description (optional)</label>
                                <input
                                    id="goalDescription"
                                    type="text"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="One sentence to stay focused"
                                />
                            </div>

                            {modalGoalType !== 'yearly' && (
                                <div className="goal-modal-context">
                                    <span className="goal-modal-type-badge">{TYPE_LABELS[modalGoalType]}</span>
                                    <span className="goal-modal-hint">
                    {modalGoalType === 'quarterly' && 'A milestone toward your yearly goal'}
                                        {modalGoalType === 'monthly' && 'A concrete target for this month'}
                                        {modalGoalType === 'weekly' && 'A specific action for this week'}
                  </span>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeModal}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving || !formName.trim()}
                            >
                                {saving ? 'Saving...' : (modalMode === 'edit' ? 'Save Changes' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
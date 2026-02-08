import { useState, useEffect, useMemo } from 'react'
import { TYPE_LABELS, CHILD_TYPE } from '../hooks/useGoals.jsx'

/**
 * GoalFormModal - Full-featured goal creation and editing modal.
 *
 * Features:
 * - Implementation intentions (when/where fields for weekly tasks)
 * - Range targets (minimum / stretch)
 * - Linked habit dropdown (weekly goals only)
 * - Live intention sentence preview
 * - Context-aware placeholders per goal type
 *
 * Props:
 *   isOpen         - boolean
 *   onClose        - () => void
 *   onSave         - (goalData) => Promise<void>
 *   mode           - 'create' | 'edit'
 *   goalType       - 'yearly' | 'quarterly' | 'monthly' | 'weekly'
 *   editingGoal    - goal object when editing (null for create)
 *   parentId       - parent goal ID for sub-goal creation
 *   habits         - array of active habits (for linked habit picker)
 */
export default function GoalFormModal({
                                          isOpen,
                                          onClose,
                                          onSave,
                                          mode = 'create',
                                          goalType = 'yearly',
                                          editingGoal = null,
                                          parentId = null,
                                          habits = []
                                      }) {
    // Form state
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [intentionWhen, setIntentionWhen] = useState('')
    const [intentionWhere, setIntentionWhere] = useState('')
    const [targetMin, setTargetMin] = useState('')
    const [targetMax, setTargetMax] = useState('')
    const [linkedHabitId, setLinkedHabitId] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Show/hide optional sections
    const [showIntentions, setShowIntentions] = useState(false)
    const [showTargets, setShowTargets] = useState(false)

    // Pre-fill form when editing
    useEffect(() => {
        if (mode === 'edit' && editingGoal) {
            setName(editingGoal.data?.name || '')
            setDescription(editingGoal.data?.description || '')
            setIntentionWhen(editingGoal.data?.intention_when || '')
            setIntentionWhere(editingGoal.data?.intention_where || '')
            setTargetMin(editingGoal.target_min?.toString() || '')
            setTargetMax(editingGoal.target_max?.toString() || '')
            setLinkedHabitId(editingGoal.linked_habit_id || '')
            // Open sections if data exists
            setShowIntentions(!!(editingGoal.data?.intention_when || editingGoal.data?.intention_where))
            setShowTargets(!!(editingGoal.target_min || editingGoal.target_max))
        } else {
            resetForm()
            // Auto-show intentions for weekly tasks (where they're most useful)
            setShowIntentions(goalType === 'weekly')
            setShowTargets(goalType === 'weekly' || goalType === 'monthly')
        }
    }, [mode, editingGoal, goalType, isOpen])

    function resetForm() {
        setName('')
        setDescription('')
        setIntentionWhen('')
        setIntentionWhere('')
        setTargetMin('')
        setTargetMax('')
        setLinkedHabitId('')
        setError('')
        setSaving(false)
    }

    // Compose intention sentence preview
    const intentionSentence = useMemo(() => {
        if (!name.trim()) return null
        const parts = [`I will ${name.trim()}`]
        if (intentionWhen.trim()) parts.push(`at ${intentionWhen.trim()}`)
        if (intentionWhere.trim()) parts.push(`in ${intentionWhere.trim()}`)
        // Only show if at least one intention field is filled
        if (!intentionWhen.trim() && !intentionWhere.trim()) return null
        return parts.join(' ')
    }, [name, intentionWhen, intentionWhere])

    // Progress bar preview for range targets
    const targetPreview = useMemo(() => {
        const min = parseInt(targetMin) || 0
        const max = parseInt(targetMax) || 0
        if (min <= 0 && max <= 0) return null
        return { min, max: max > min ? max : 0 }
    }, [targetMin, targetMax])

    async function handleSubmit(e) {
        if (e) e.preventDefault()
        setError('')

        if (!name.trim()) {
            setError('Please enter a goal name')
            return
        }

        if (targetMin && targetMax && parseInt(targetMax) < parseInt(targetMin)) {
            setError('Stretch target must be ≥ minimum target')
            return
        }

        setSaving(true)

        try {
            const goalData = {
                goal_type: goalType,
                parent_id: parentId,
                name: name.trim(),
                description: description.trim() || undefined,
                intention_when: intentionWhen.trim() || undefined,
                intention_where: intentionWhere.trim() || undefined,
                target_min: targetMin ? parseInt(targetMin) : undefined,
                target_max: targetMax ? parseInt(targetMax) : undefined,
                linked_habit_id: linkedHabitId || undefined
            }

            await onSave(goalData, mode === 'edit' ? editingGoal : null)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const isWeekly = goalType === 'weekly'
    const showHabitLink = isWeekly && habits.length > 0

    // Placeholders per goal type
    const placeholders = {
        yearly: { name: 'e.g., Run a marathon', desc: 'Why this matters to you' },
        quarterly: { name: 'e.g., Complete half-marathon training', desc: 'A milestone for this quarter' },
        monthly: { name: 'e.g., Run 80km this month', desc: 'Concrete monthly target' },
        weekly: { name: 'e.g., Run 3 times this week', desc: 'Specific weekly action' }
    }

    const ph = placeholders[goalType] || placeholders.yearly

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal goal-form-modal">
                <div className="modal-header">
                    <h2>
                        {mode === 'edit'
                            ? `Edit ${TYPE_LABELS[goalType]}`
                            : `New ${TYPE_LABELS[goalType]}`}
                    </h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Context badge for sub-goals */}
                        {goalType !== 'yearly' && mode === 'create' && (
                            <div className="goal-modal-context">
                                <span className="goal-modal-type-badge">{TYPE_LABELS[goalType]}</span>
                                <span className="goal-modal-hint">
                  {goalType === 'quarterly' && 'A milestone toward your yearly goal'}
                                    {goalType === 'monthly' && 'A concrete target for this month'}
                                    {goalType === 'weekly' && 'A specific action for this week'}
                </span>
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}

                        {/* Name */}
                        <div className="form-group">
                            <label htmlFor="gf-name">
                                {goalType === 'yearly' ? "What's your big goal for the year?" : 'Name'}
                            </label>
                            <input
                                id="gf-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={ph.name}
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label htmlFor="gf-desc">Description <span className="form-optional">(optional)</span></label>
                            <input
                                id="gf-desc"
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={ph.desc}
                            />
                        </div>

                        {/* === Implementation Intentions === */}
                        {!showIntentions ? (
                            <button
                                type="button"
                                className="goal-form-toggle"
                                onClick={() => setShowIntentions(true)}
                            >
                                <span className="goal-form-toggle-icon">📍</span>
                                Add when & where (implementation intention)
                            </button>
                        ) : (
                            <div className="goal-form-section">
                                <div className="goal-form-section-header">
                                    <span className="goal-form-section-label">📍 Implementation Intention</span>
                                    <button
                                        type="button"
                                        className="goal-form-section-close"
                                        onClick={() => {
                                            setShowIntentions(false)
                                            setIntentionWhen('')
                                            setIntentionWhere('')
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="goal-form-row">
                                    <div className="form-group">
                                        <label htmlFor="gf-when">When</label>
                                        <input
                                            id="gf-when"
                                            type="text"
                                            value={intentionWhen}
                                            onChange={(e) => setIntentionWhen(e.target.value)}
                                            placeholder="e.g., 7am before work"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="gf-where">Where</label>
                                        <input
                                            id="gf-where"
                                            type="text"
                                            value={intentionWhere}
                                            onChange={(e) => setIntentionWhere(e.target.value)}
                                            placeholder="e.g., at the park"
                                        />
                                    </div>
                                </div>

                                {/* Live intention sentence */}
                                {intentionSentence && (
                                    <div className="goal-intention-preview">
                                        <span className="goal-intention-quote">"</span>
                                        <span className="goal-intention-text">{intentionSentence}</span>
                                        <span className="goal-intention-quote">"</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === Range Targets === */}
                        {!showTargets ? (
                            <button
                                type="button"
                                className="goal-form-toggle"
                                onClick={() => setShowTargets(true)}
                            >
                                <span className="goal-form-toggle-icon">🎯</span>
                                Add target range (minimum & stretch)
                            </button>
                        ) : (
                            <div className="goal-form-section">
                                <div className="goal-form-section-header">
                                    <span className="goal-form-section-label">🎯 Target Range</span>
                                    <button
                                        type="button"
                                        className="goal-form-section-close"
                                        onClick={() => {
                                            setShowTargets(false)
                                            setTargetMin('')
                                            setTargetMax('')
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="goal-form-row">
                                    <div className="form-group">
                                        <label htmlFor="gf-min">Minimum</label>
                                        <input
                                            id="gf-min"
                                            type="number"
                                            min="0"
                                            value={targetMin}
                                            onChange={(e) => setTargetMin(e.target.value)}
                                            placeholder="e.g., 3"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="gf-max">Stretch <span className="form-optional">(optional)</span></label>
                                        <input
                                            id="gf-max"
                                            type="number"
                                            min="0"
                                            value={targetMax}
                                            onChange={(e) => setTargetMax(e.target.value)}
                                            placeholder="e.g., 5"
                                        />
                                    </div>
                                </div>

                                {/* Target preview bar */}
                                {targetPreview && (
                                    <div className="goal-target-preview">
                                        <div className="goal-target-bar">
                                            <div className="goal-target-bar-bg" />
                                            <div
                                                className="goal-target-bar-min"
                                                style={{ width: targetPreview.max > 0
                                                        ? `${(targetPreview.min / targetPreview.max) * 100}%`
                                                        : '100%'
                                                }}
                                            />
                                            {targetPreview.max > 0 && (
                                                <div className="goal-target-bar-max" style={{ width: '100%' }} />
                                            )}
                                        </div>
                                        <div className="goal-target-labels">
                      <span className="goal-target-label-min">
                        ✓ Minimum: {targetPreview.min}
                      </span>
                                            {targetPreview.max > 0 && (
                                                <span className="goal-target-label-max">
                          🌟 Stretch: {targetPreview.max}
                        </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === Linked Habit (weekly only) === */}
                        {showHabitLink && (
                            <div className="form-group">
                                <label htmlFor="gf-habit">
                                    Link to habit <span className="form-optional">(optional — auto-tracks progress)</span>
                                </label>
                                <select
                                    id="gf-habit"
                                    value={linkedHabitId}
                                    onChange={(e) => setLinkedHabitId(e.target.value)}
                                    className="goal-form-select"
                                >
                                    <option value="">No linked habit</option>
                                    {habits.map(h => (
                                        <option key={h.id} value={h.id}>
                                            {h.data?.name} ({h.data?.points} pts)
                                        </option>
                                    ))}
                                </select>
                                {linkedHabitId && (
                                    <p className="goal-form-hint">
                                        Progress will auto-update from habit completions
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !name.trim()}
                        >
                            {saving ? 'Saving...' : (mode === 'edit' ? 'Save Changes' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
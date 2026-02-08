import { useState } from 'react'
import { CHILD_TYPE, TYPE_LABELS, computeProgress } from '../hooks/useGoals'

/**
 * GoalCard - Expandable card showing a yearly goal with three-layer drill-down.
 *
 * Collapsed: goal name + overall progress percentage
 * Expanded: current focus (quarterly/monthly) + weekly tasks with checkboxes
 *           + range target bars + implementation intention text
 *
 * Props:
 *   goal       - yearly goal node from goalTree (has .children, .computedProgress, .currentFocus)
 *   onAddChild - (parentId, childType) => void
 *   onEdit     - (goal) => void
 *   onDelete   - (goal) => void
 *   onToggle   - (goalId) => void - toggle completed status
 */
export default function GoalCard({ goal, onAddChild, onEdit, onDelete, onToggle }) {
    const [expanded, setExpanded] = useState(false)
    const [showAllMilestones, setShowAllMilestones] = useState(false)

    const progress = goal.computedProgress || 0
    const focus = goal.currentFocus
    const childType = CHILD_TYPE[goal.goal_type]
    const hasChildren = goal.children && goal.children.length > 0
    const isCompleted = goal.status === 'completed'

    return (
        <div className={`goal-card ${isCompleted ? 'goal-completed' : ''}`}>
            {/* Collapsed header - always visible */}
            <div className="goal-card-header" onClick={() => setExpanded(!expanded)}>
                <div className="goal-card-left">
          <span className={`goal-expand-icon ${expanded ? 'expanded' : ''}`}>
            ›
          </span>
                    <div className="goal-card-title-area">
                        <h3 className="goal-card-title">{goal.data?.name || 'Untitled Goal'}</h3>
                        {goal.data?.description && !expanded && (
                            <p className="goal-card-description">{goal.data.description}</p>
                        )}
                    </div>
                </div>
                <div className="goal-card-right">
                    <div className="goal-progress-ring">
                        <svg viewBox="0 0 36 36" className="goal-progress-svg">
                            <path
                                className="goal-progress-bg"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                                className="goal-progress-fill"
                                strokeDasharray={`${progress}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <span className="goal-progress-text">{progress}%</span>
                    </div>
                </div>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="goal-card-body">
                    {/* Description (shown only when expanded) */}
                    {goal.data?.description && (
                        <p className="goal-card-description expanded">{goal.data.description}</p>
                    )}

                    {/* Range target bar for this goal */}
                    {(goal.target_min || goal.target_max) && (
                        <RangeTargetBar
                            targetMin={goal.target_min}
                            targetMax={goal.target_max}
                            progress={progress}
                        />
                    )}

                    {/* Current Focus section */}
                    {focus && (
                        <div className="goal-focus-section">
                            <div className="goal-focus-label">Current Focus</div>
                            <div className="goal-focus-card">
                                <div className="goal-focus-header">
                                    <span className="goal-focus-type">{TYPE_LABELS[focus.goal_type]}</span>
                                    <span className="goal-focus-progress">
                    {focus.computedProgress || computeProgress(focus)}%
                  </span>
                                </div>
                                <div className="goal-focus-name">{focus.data?.name}</div>

                                {/* Focus range target */}
                                {(focus.target_min || focus.target_max) && (
                                    <RangeTargetBar
                                        targetMin={focus.target_min}
                                        targetMax={focus.target_max}
                                        progress={focus.computedProgress || computeProgress(focus)}
                                    />
                                )}

                                {/* Plain progress bar when no range target */}
                                {!focus.target_min && !focus.target_max && (
                                    <div className="goal-progress-bar">
                                        <div
                                            className="goal-progress-bar-fill"
                                            style={{ width: `${focus.computedProgress || computeProgress(focus)}%` }}
                                        />
                                    </div>
                                )}

                                {/* Weekly tasks under current focus */}
                                {focus.children && focus.children.length > 0 && (
                                    <div className="goal-weekly-tasks">
                                        {focus.children.map(child => (
                                            <div key={child.id}>
                                                <WeeklyTaskItem task={child} onToggle={onToggle} />
                                                {/* Leaf weekly tasks under monthly children */}
                                                {child.children && child.children.length > 0 && (
                                                    <div className="goal-weekly-tasks nested">
                                                        {child.children.map(leaf => (
                                                            <WeeklyTaskItem key={leaf.id} task={leaf} onToggle={onToggle} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add child to current focus */}
                                {CHILD_TYPE[focus.goal_type] && (
                                    <button
                                        className="goal-add-child-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onAddChild(focus.id, CHILD_TYPE[focus.goal_type])
                                        }}
                                    >
                                        + Add {TYPE_LABELS[CHILD_TYPE[focus.goal_type]]}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* All milestones (hidden by default) */}
                    {hasChildren && !focus && (
                        <div className="goal-milestones">
                            {goal.children.map(child => (
                                <MilestoneItem
                                    key={child.id}
                                    milestone={child}
                                    onToggle={onToggle}
                                    onAddChild={onAddChild}
                                />
                            ))}
                        </div>
                    )}

                    {hasChildren && focus && (
                        <>
                            <button
                                className="goal-show-all-btn"
                                onClick={() => setShowAllMilestones(!showAllMilestones)}
                            >
                                {showAllMilestones ? 'Hide milestones' : `View all ${goal.children.length} milestones →`}
                            </button>

                            {showAllMilestones && (
                                <div className="goal-milestones">
                                    {goal.children.map(child => (
                                        <MilestoneItem
                                            key={child.id}
                                            milestone={child}
                                            onToggle={onToggle}
                                            onAddChild={onAddChild}
                                            isCurrent={focus && child.id === focus.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Break this down prompt */}
                    {!hasChildren && childType && (
                        <button
                            className="goal-breakdown-btn"
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddChild(goal.id, childType)
                            }}
                        >
                            <span className="goal-breakdown-icon">↓</span>
                            Break this down into {TYPE_LABELS[childType].toLowerCase()}s?
                        </button>
                    )}

                    {/* Add child when goal already has children */}
                    {hasChildren && childType && (
                        <button
                            className="goal-add-child-btn"
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddChild(goal.id, childType)
                            }}
                        >
                            + Add {TYPE_LABELS[childType]}
                        </button>
                    )}

                    {/* Action buttons */}
                    <div className="goal-card-actions">
                        <button
                            className="btn-icon-small"
                            onClick={(e) => { e.stopPropagation(); onEdit(goal) }}
                            title="Edit goal"
                        >
                            ✏️
                        </button>
                        <button
                            className={`btn-icon-small ${isCompleted ? 'completed' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggle(goal.id) }}
                            title={isCompleted ? 'Mark active' : 'Mark completed'}
                        >
                            {isCompleted ? '↩️' : '✅'}
                        </button>
                        <button
                            className="btn-icon-small danger"
                            onClick={(e) => { e.stopPropagation(); onDelete(goal) }}
                            title="Delete goal"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * RangeTargetBar - Visual progress bar with min/max markers.
 *
 * Green fill to target_min, gold extension to target_max.
 * Status text: below min = "X more to go", at min = "✓ Goal met", at max = "🌟 Stretch hit"
 */
function RangeTargetBar({ targetMin, targetMax, progress }) {
    const min = targetMin || 0
    const max = targetMax || min
    const ceiling = max > min ? max : min
    if (ceiling <= 0) return null

    // progress is 0-100 percentage; convert to "units" relative to ceiling
    const currentUnits = Math.round((progress / 100) * ceiling)
    const minPct = ceiling > 0 ? (min / ceiling) * 100 : 100
    const currentPct = Math.min(100, ceiling > 0 ? (currentUnits / ceiling) * 100 : 0)
    const metMin = currentUnits >= min
    const metMax = max > min && currentUnits >= max

    let statusText, statusClass
    if (metMax) {
        statusText = '🌟 Stretch hit!'
        statusClass = 'stretch'
    } else if (metMin) {
        statusText = '✓ Goal met'
        statusClass = 'met'
    } else {
        statusText = `${min - currentUnits} more to go`
        statusClass = 'pending'
    }

    return (
        <div className="goal-range-bar">
            <div className="goal-range-track">
                {/* Min marker line */}
                {max > min && (
                    <div className="goal-range-min-marker" style={{ left: `${minPct}%` }} />
                )}
                {/* Green fill up to min */}
                <div
                    className={`goal-range-fill-min ${metMin ? 'filled' : ''}`}
                    style={{ width: `${Math.min(currentPct, minPct)}%` }}
                />
                {/* Gold fill from min to max */}
                {max > min && currentPct > minPct && (
                    <div
                        className={`goal-range-fill-max ${metMax ? 'filled' : ''}`}
                        style={{
                            left: `${minPct}%`,
                            width: `${Math.min(currentPct - minPct, 100 - minPct)}%`
                        }}
                    />
                )}
            </div>
            <div className={`goal-range-status ${statusClass}`}>
                {statusText}
            </div>
        </div>
    )
}

/**
 * MilestoneItem - A quarterly/monthly child shown in the "all milestones" list
 */
function MilestoneItem({ milestone, onToggle, onAddChild, isCurrent }) {
    const progress = computeProgress(milestone)
    const isCompleted = milestone.status === 'completed'
    const childType = CHILD_TYPE[milestone.goal_type]

    return (
        <div className={`goal-milestone ${isCurrent ? 'milestone-current' : ''} ${isCompleted ? 'milestone-completed' : ''}`}>
            <div className="milestone-header">
                <div className="milestone-info">
                    <span className="milestone-type">{TYPE_LABELS[milestone.goal_type]}</span>
                    <span className="milestone-name">{milestone.data?.name}</span>
                </div>
                <div className="milestone-right">
                    <span className="milestone-progress">{progress}%</span>
                    <button
                        className="milestone-check"
                        onClick={() => onToggle(milestone.id)}
                        title={isCompleted ? 'Mark active' : 'Mark complete'}
                    >
                        {isCompleted ? '✓' : '○'}
                    </button>
                </div>
            </div>

            {/* Range or plain progress bar */}
            {(milestone.target_min || milestone.target_max) ? (
                <RangeTargetBar
                    targetMin={milestone.target_min}
                    targetMax={milestone.target_max}
                    progress={progress}
                />
            ) : (
                <div className="goal-progress-bar small">
                    <div className="goal-progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
            )}

            {/* Show children (weekly tasks) */}
            {milestone.children && milestone.children.length > 0 && (
                <div className="goal-weekly-tasks nested">
                    {milestone.children.map(child => (
                        <WeeklyTaskItem key={child.id} task={child} onToggle={onToggle} />
                    ))}
                </div>
            )}

            {childType && (
                <button
                    className="goal-add-child-btn small"
                    onClick={() => onAddChild(milestone.id, childType)}
                >
                    + {TYPE_LABELS[childType]}
                </button>
            )}
        </div>
    )
}

/**
 * WeeklyTaskItem - A leaf-level weekly task with checkbox
 * Shows implementation intention and range target status
 */
function WeeklyTaskItem({ task, onToggle }) {
    const isCompleted = task.status === 'completed'
    const hasIntention = task.data?.intention_when || task.data?.intention_where
    const hasTargets = task.target_min || task.target_max

    // Range target status for weekly tasks
    let targetStatus = null
    if (hasTargets) {
        const min = task.target_min || 0
        const max = task.target_max || min
        // For weekly tasks, progress is manual or 0/100 from completed status
        const current = isCompleted ? max : (task.data?.progress || 0)
        const metMin = current >= min
        const metMax = max > min && current >= max

        if (metMax) targetStatus = { text: '🌟', cls: 'stretch' }
        else if (metMin) targetStatus = { text: '✓', cls: 'met' }
        else targetStatus = { text: `${current}/${min}`, cls: 'pending' }
    }

    return (
        <div
            className={`goal-weekly-task ${isCompleted ? 'task-completed' : ''}`}
            onClick={() => onToggle(task.id)}
        >
      <span className={`goal-task-checkbox ${isCompleted ? 'checked' : ''}`}>
        {isCompleted && '✓'}
      </span>
            <div className="goal-task-info">
                <span className="goal-task-name">{task.data?.name}</span>
                {hasIntention && (
                    <span className="goal-task-intention">
            {task.data.intention_when && task.data.intention_where
                ? `${task.data.intention_when} · ${task.data.intention_where}`
                : task.data.intention_when || task.data.intention_where}
          </span>
                )}
            </div>
            {targetStatus && (
                <span className={`goal-task-target-badge ${targetStatus.cls}`}>
          {targetStatus.text}
        </span>
            )}
        </div>
    )
}
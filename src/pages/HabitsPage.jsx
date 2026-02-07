import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { encryptData } from '../lib/encryption'
import useHabitsData from '../hooks/useHabitsData'
import AddHabitModal from '../components/AddHabitModal'
import EditHabitModal from '../components/EditHabitModal'

// Default colors for new categories
const CATEGORY_COLORS = [
  '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899',
  '#EF4444', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
]

// Default icons
const CATEGORY_ICONS = ['❤️', '👥', '💼', '💰', '⭐', '🎯', '📚', '🏃', '🧘', '🎨', '🍎', '💪', '🧠', '🌱', '🔥']

export default function HabitsPage() {
  const { user, encryptionKey } = useAuth()
  const {
    categories,
    setCategories,
    habits,
    setHabits,
    loading,
    error,
    reload
  } = useHabitsData()

  // Habit modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedHabit, setSelectedHabit] = useState(null)

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0])
  const [categoryIcon, setCategoryIcon] = useState(CATEGORY_ICONS[0])
  const [savingCategory, setSavingCategory] = useState(false)

  // ============ Habit Functions ============

  function handleAddHabit(categoryId) {
    setSelectedCategoryId(categoryId)
    setShowAddModal(true)
  }

  async function handleCreateHabit(habitData) {
    const encrypted = await encryptData(habitData, encryptionKey)

    const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          category_id: selectedCategoryId,
          active: true,
          data_encrypted: encrypted
        })
        .select()
        .single()

    if (error) throw error

    setHabits([...habits, { ...data, data: habitData }])
  }

  function handleEditHabit(habit) {
    setSelectedHabit(habit)
    setShowEditModal(true)
  }

  async function handleSaveHabit(habit, newData) {
    const encrypted = await encryptData(newData, encryptionKey)

    const { error } = await supabase
        .from('habits')
        .update({ data_encrypted: encrypted })
        .eq('id', habit.id)

    if (error) throw error

    setHabits(habits.map(h =>
        h.id === habit.id ? { ...h, data: newData } : h
    ))
  }

  async function handleDeleteHabit(habit) {
    if (!confirm(`Delete "${habit.data.name}"? This cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
          .from('habits')
          .delete()
          .eq('id', habit.id)

      if (error) throw error

      setHabits(habits.filter(h => h.id !== habit.id))
    } catch (err) {
      console.error('Error deleting habit:', err)
      alert('Failed to delete habit: ' + err.message)
    }
  }

  // ============ Category Functions ============

  function openAddCategory() {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryColor(CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length])
    setCategoryIcon(CATEGORY_ICONS[0])
    setShowCategoryModal(true)
  }

  function openEditCategory(category) {
    setEditingCategory(category)
    setCategoryName(category.data.name)
    setCategoryColor(category.data.color)
    setCategoryIcon(category.data.icon)
    setShowCategoryModal(true)
  }

  async function handleSaveCategory() {
    if (!categoryName.trim()) {
      alert('Please enter a category name')
      return
    }

    setSavingCategory(true)

    try {
      const categoryData = {
        name: categoryName.trim(),
        color: categoryColor,
        icon: categoryIcon
      }
      const encrypted = await encryptData(categoryData, encryptionKey)

      if (editingCategory) {
        // Update existing
        const { error } = await supabase
            .from('categories')
            .update({ data_encrypted: encrypted })
            .eq('id', editingCategory.id)

        if (error) throw error

        setCategories(categories.map(c =>
            c.id === editingCategory.id ? { ...c, data: categoryData } : c
        ))
      } else {
        // Create new
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.order_num), 0)

        const { data, error } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              order_num: maxOrder + 1,
              data_encrypted: encrypted
            })
            .select()
            .single()

        if (error) throw error

        setCategories([...categories, { ...data, data: categoryData }])
      }

      setShowCategoryModal(false)
    } catch (err) {
      console.error('Error saving category:', err)
      alert('Failed to save category: ' + err.message)
    } finally {
      setSavingCategory(false)
    }
  }

  async function handleDeleteCategory(category) {
    const categoryHabits = habits.filter(h => h.category_id === category.id)

    const message = categoryHabits.length > 0
        ? `Delete "${category.data.name}" and its ${categoryHabits.length} habit(s)? This cannot be undone.`
        : `Delete "${category.data.name}"? This cannot be undone.`

    if (!confirm(message)) {
      return
    }

    try {
      const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id)

      if (error) throw error

      setCategories(categories.filter(c => c.id !== category.id))
      setHabits(habits.filter(h => h.category_id !== category.id))
    } catch (err) {
      console.error('Error deleting category:', err)
      alert('Failed to delete category: ' + err.message)
    }
  }

  function closeModal() {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowCategoryModal(false)
    setSelectedCategoryId(null)
    setSelectedHabit(null)
    setEditingCategory(null)
  }

  const selectedCategory = categories.find(c => c.id === selectedCategoryId)

  if (loading) {
    return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading habits...</p>
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
      <div className="habits-page">
        <div className="page-header-bar">
          <div>
            <h2>Manage Habits</h2>
            <p>Add, edit, or remove habits & categories</p>
          </div>
          <button className="btn btn-primary btn-small" onClick={openAddCategory}>
            + Category
          </button>
        </div>

        <div className="habits-list">
          {categories.map(category => {
            const categoryHabits = habits.filter(h => h.category_id === category.id)

            return (
                <div key={category.id} className="habits-category">
                  <div
                      className="habits-category-header"
                      style={{ borderLeftColor: category.data.color }}
                  >
                    <div className="category-header-left">
                      <span className="category-icon">{category.data.icon}</span>
                      <span className="category-name">{category.data.name}</span>
                      <span className="category-count">{categoryHabits.length}</span>
                    </div>
                    <div className="category-header-actions">
                      <button
                          className="btn-icon-small"
                          onClick={() => openEditCategory(category)}
                          title="Edit category"
                      >
                        ✏️
                      </button>
                      <button
                          className="btn-icon-small danger"
                          onClick={() => handleDeleteCategory(category)}
                          title="Delete category"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="habits-category-list">
                    {categoryHabits.length === 0 ? (
                        <p className="no-habits">No habits in this category</p>
                    ) : (
                        categoryHabits.map(habit => (
                            <div key={habit.id} className="habit-item">
                              <div className="habit-item-info">
                                <span className="habit-item-name">{habit.data.name}</span>
                                <span className="habit-item-points">{habit.data.points} pts</span>
                              </div>
                              <div className="habit-item-actions">
                                <button
                                    className="btn-icon"
                                    onClick={() => handleEditHabit(habit)}
                                    title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                    className="btn-icon danger"
                                    onClick={() => handleDeleteHabit(habit)}
                                    title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                        ))
                    )}

                    <button
                        className="add-habit-btn"
                        onClick={() => handleAddHabit(category.id)}
                    >
                      + Add habit to {category.data.name}
                    </button>
                  </div>
                </div>
            )
          })}

          {categories.length === 0 && (
              <div className="empty-state">
                <p>📁 No categories yet!</p>
                <p>Click "+ Category" to create one.</p>
              </div>
          )}
        </div>

        {/* Add Habit Modal */}
        <AddHabitModal
            isOpen={showAddModal}
            onClose={closeModal}
            onAdd={handleCreateHabit}
            categoryName={selectedCategory?.data?.name || ''}
        />

        {/* Edit Habit Modal */}
        <EditHabitModal
            isOpen={showEditModal}
            onClose={closeModal}
            onSave={handleSaveHabit}
            habit={selectedHabit}
        />

        {/* Category Modal */}
        {showCategoryModal && (
            <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeModal()}>
              <div className="modal">
                <div className="modal-header">
                  <h2>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                  <button className="modal-close" onClick={closeModal}>×</button>
                </div>

                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="categoryName">Name</label>
                    <input
                        id="categoryName"
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g., Health, Learning"
                        autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Icon</label>
                    <div className="icon-picker">
                      {CATEGORY_ICONS.map(icon => (
                          <button
                              key={icon}
                              type="button"
                              className={`icon-option ${categoryIcon === icon ? 'selected' : ''}`}
                              onClick={() => setCategoryIcon(icon)}
                          >
                            {icon}
                          </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <div className="color-picker">
                      {CATEGORY_COLORS.map(color => (
                          <button
                              key={color}
                              type="button"
                              className={`color-option ${categoryColor === color ? 'selected' : ''}`}
                              style={{ background: color }}
                              onClick={() => setCategoryColor(color)}
                          />
                      ))}
                    </div>
                  </div>

                  <div className="category-preview">
                    <span>Preview:</span>
                    <div
                        className="preview-category"
                        style={{ borderLeftColor: categoryColor }}
                    >
                      <span>{categoryIcon}</span>
                      <span>{categoryName || 'Category Name'}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                      className="btn btn-primary"
                      onClick={handleSaveCategory}
                      disabled={savingCategory || !categoryName.trim()}
                  >
                    {savingCategory ? 'Saving...' : (editingCategory ? 'Save Changes' : 'Add Category')}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}
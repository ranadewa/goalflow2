import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { encryptData, decryptData } from '../lib/encryption'

export default function DailyReflections({ date }) {
  const { user, encryptionKey } = useAuth()
  
  const [grateful, setGrateful] = useState('')
  const [lessons, setLessons] = useState('')
  const [reflectionId, setReflectionId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    loadReflection()
  }, [date])

  async function loadReflection() {
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
    // Don't save if both are empty
    if (!newGrateful.trim() && !newLessons.trim()) {
      // If there was a reflection before, delete it
      if (reflectionId) {
        await supabase.from('reflections').delete().eq('id', reflectionId)
        setReflectionId(null)
      }
      return
    }

    setSaving(true)
    try {
      const reflectionData = {
        grateful: newGrateful.trim(),
        lessons: newLessons.trim()
      }
      const encrypted = await encryptData(reflectionData, encryptionKey)

      if (reflectionId) {
        // Update existing
        await supabase
          .from('reflections')
          .update({ 
            data_encrypted: encrypted,
            updated_at: new Date().toISOString()
          })
          .eq('id', reflectionId)
      } else {
        // Create new
        const { data } = await supabase
          .from('reflections')
          .insert({
            user_id: user.id,
            date: date,
            data_encrypted: encrypted
          })
          .select()
          .single()
        
        if (data) {
          setReflectionId(data.id)
        }
      }
      
      setLastSaved(new Date())
    } catch (err) {
      console.error('Error saving reflection:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(field, value) {
    if (field === 'grateful') {
      setGrateful(value)
    } else {
      setLessons(value)
    }

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const g = field === 'grateful' ? value : grateful
      const l = field === 'lessons' ? value : lessons
      saveReflection(g, l)
    }, 1000)
  }

  return (
    <div className="reflections-section">
      <div className="reflections-header">
        <h3>📝 Daily Reflections</h3>
        {saving && <span className="saving-indicator">Saving...</span>}
        {!saving && lastSaved && <span className="saved-indicator">✓ Saved</span>}
      </div>

      <div className="reflection-box">
        <label htmlFor="grateful">I'm grateful for today because...</label>
        <textarea
          id="grateful"
          value={grateful}
          onChange={(e) => handleChange('grateful', e.target.value)}
          placeholder="What made today good? What are you thankful for?"
          rows={3}
        />
      </div>

      <div className="reflection-box">
        <label htmlFor="lessons">Lessons I learned today...</label>
        <textarea
          id="lessons"
          value={lessons}
          onChange={(e) => handleChange('lessons', e.target.value)}
          placeholder="What did you learn? What would you do differently?"
          rows={3}
        />
      </div>
    </div>
  )
}

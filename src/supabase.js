import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Create a .env file with:')
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

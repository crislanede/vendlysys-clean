import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('URL SUPABASE:', supabaseUrl)
console.log('KEY EXISTE:', !!supabaseKey)
console.log('KEY COMEÇA COM:', supabaseKey?.slice(0, 20))

export const supabase = createClient(supabaseUrl, supabaseKey)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sin estas variables createClient falla con un mensaje que no dice nada útil.
// Fallamos temprano y explicando qué falta.
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. Definí VITE_SUPABASE_URL y ' +
    'VITE_SUPABASE_ANON_KEY en frontend/.env antes de levantar la app.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

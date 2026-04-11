import { createClient } from '@/lib/supabase/server'
import { apiSuccess } from '@/lib/api'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return apiSuccess({ message: 'Logout realizado com sucesso' })
}

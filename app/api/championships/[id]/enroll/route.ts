import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAdmin } from '@/lib/api'
import { NextRequest } from 'next/server'

// Admin enroll users into a championship
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { userIds } = body
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return apiError('userIds deve ser um array não vazio')
    }

    const supabase = await createClient()
    const rows = userIds.map((uid: string) => ({
      user_id: uid,
      championship_id: id,
    }))

    const { data, error: dbError } = await supabase
      .from('user_championships')
      .upsert(rows, { onConflict: 'user_id,championship_id' })
      .select()

    if (dbError) return apiError(dbError.message, 500)
    return apiSuccess({ enrolled: data })
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

// Remove user from championship
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return apiError('userId é obrigatório')

  const supabase = await createClient()
  const { error: dbError } = await supabase
    .from('user_championships')
    .delete()
    .eq('championship_id', id)
    .eq('user_id', userId)

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess({ message: 'Usuário removido do campeonato' })
}

import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function PATCH(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const { nickname, photoUrl } = body

    const updates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (nickname !== undefined) updates.nickname = nickname
    if (photoUrl !== undefined) updates.photo_url = photoUrl

    const supabase = createServiceClient()
    const { data, error: dbError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user!.id)
      .select()
      .single()

    if (dbError) return apiError(dbError.message, 500)

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'PROFILE_UPDATED',
      entityType: 'users',
      entityId: user!.id,
      changes: updates,
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess({ user: data })
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

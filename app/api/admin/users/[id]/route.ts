import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { status, role, nickname } = body

    const validStatuses = ['pending', 'active', 'inactive', 'blocked']
    const validRoles = ['user', 'admin']
    if (status && !validStatuses.includes(status)) return apiError('Status inválido')
    if (role && !validRoles.includes(role)) return apiError('Role inválida')

    const updates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (role) updates.role = role
    if (nickname) updates.nickname = nickname

    const supabase = createServiceClient()
    const { data, error: dbError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, nickname, status, role, photo_url, created_at, updated_at')
      .single()

    if (dbError) return apiError(dbError.message, 500)

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'USER_STATUS_CHANGED',
      entityType: 'users',
      entityId: id,
      changes: updates,
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess(data)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from('championships')
    .select(`*, created_by_user:users!championships_created_by_fkey(id, nickname, email)`)
    .eq('id', id)
    .single()

  if (dbError || !data) return apiError('Campeonato não encontrado', 404)
  return apiSuccess(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { name, description, status } = body

    const supabase = await createClient()
    const { data, error: dbError } = await supabase
      .from('championships')
      .update({ name, description, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (dbError) return apiError(dbError.message, 500)

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'CHAMPIONSHIP_UPDATED',
      entityType: 'championships',
      entityId: id,
      changes: { name, description, status },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess(data)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  const supabase = await createClient()
  const { error: dbError } = await supabase.from('championships').delete().eq('id', id)
  if (dbError) return apiError(dbError.message, 500)

  const { ip, userAgent } = getRequestMeta(request)
  await createAuditLog({
    userId: user!.id,
    action: 'CHAMPIONSHIP_DELETED',
    entityType: 'championships',
    entityId: id,
    ipAddress: ip,
    userAgent,
  })

  return apiSuccess({ message: 'Campeonato excluído com sucesso' })
}

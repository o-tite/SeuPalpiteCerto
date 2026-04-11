import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from('rounds')
    .select(`
      *,
      championship:championships(id, name, status),
      matches(
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
        result:results(*)
      )
    `)
    .eq('id', id)
    .single()

  if (dbError || !data) return apiError('Rodada não encontrada', 404)

  const now = new Date()
  return apiSuccess({ ...data, isOpen: new Date(data.closing_at) > now })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { description, closingAt, status } = body

    const supabase = await createClient()
    const { data, error: dbError } = await supabase
      .from('rounds')
      .update({ description, closing_at: closingAt, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (dbError) return apiError(dbError.message, 500)

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'ROUND_UPDATED',
      entityType: 'rounds',
      entityId: id,
      changes: body,
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
  const { error: dbError } = await supabase.from('rounds').delete().eq('id', id)
  if (dbError) return apiError(dbError.message, 500)

  const { ip, userAgent } = getRequestMeta(request)
  await createAuditLog({
    userId: user!.id,
    action: 'ROUND_DELETED',
    entityType: 'rounds',
    entityId: id,
    ipAddress: ip,
    userAgent,
  })

  return apiSuccess({ message: 'Rodada excluída' })
}

import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { closeExpiredRound } from '@/lib/round'
import { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const supabase = createServiceClient()
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

  const status = await closeExpiredRound(supabase, data.id, data.closing_at, data.status)
  return apiSuccess({ ...data, status, isOpen: status === 'open' })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { description, closingAt, status } = body

    const supabase = createServiceClient()

    if (status === 'finished') {
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id, result:results(id)')
        .eq('round_id', id)

      if (matchesError) return apiError('Erro ao verificar jogos da rodada', 500)
      if (!matches || matches.length === 0) return apiError('Não é possível finalizar uma rodada sem jogos', 400)

      const hasUnfinished = matches.some(
        (m: { result: { id: string }[] | { id: string } | null }) =>
          !m.result || (Array.isArray(m.result) && m.result.length === 0)
      )
      if (hasUnfinished) return apiError('Não é possível finalizar a rodada — há jogos sem resultado registrado', 400)
    }

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

  const supabase = createServiceClient()

  const { data: matchIds, error: matchIdsError } = await supabase
    .from('matches')
    .select('id')
    .eq('round_id', id)

  if (matchIdsError) return apiError('Erro ao verificar jogos da rodada', 500)

  const ids = (matchIds ?? []).map((m: { id: string }) => m.id)
  if (ids.length > 0) {
    const { count: betsCount, error: betsError } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true })
      .in('match_id', ids)

    if (betsError) return apiError('Erro ao verificar palpites', 500)
    if (betsCount && betsCount > 0) return apiError('Não é possível excluir rodada com palpites existentes', 409)
  }

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

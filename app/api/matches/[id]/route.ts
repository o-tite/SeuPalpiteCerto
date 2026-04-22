import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { homeTeamId, awayTeamId, matchNumber, description } = body

    if (homeTeamId === awayTeamId) return apiError('Os times devem ser diferentes')

    const supabase = createServiceClient()

    // Get current match data for audit log
    const { data: currentMatch, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) return apiError('Jogo não encontrado', 404)

    const updates: any = {}
    if (homeTeamId !== undefined) updates.home_team_id = homeTeamId
    if (awayTeamId !== undefined) updates.away_team_id = awayTeamId
    if (matchNumber !== undefined) updates.match_number = matchNumber
    if (description !== undefined) updates.description = description

    const { data, error: dbError } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
      `)
      .single()

    if (dbError) {
      if (dbError.message.includes('unique')) return apiError('Número do jogo já existe nesta rodada', 409)
      return apiError(dbError.message, 500)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'MATCH_UPDATED',
      entityType: 'matches',
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const supabase = createServiceClient()

    // Get current match data for audit log
    const { data: currentMatch, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) return apiError('Jogo não encontrado', 404)

    // Check if match has bets
    const { count, error: countError } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', id)

    if (countError) return apiError('Erro ao verificar palpites', 500)
    if (count && count > 0) return apiError('Não é possível excluir jogo com palpites existentes', 409)

    const { error: dbError } = await supabase
      .from('matches')
      .delete()
      .eq('id', id)

    if (dbError) return apiError(dbError.message, 500)

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'MATCH_DELETED',
      entityType: 'matches',
      entityId: id,
      changes: { deleted: true },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess({ success: true })
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}
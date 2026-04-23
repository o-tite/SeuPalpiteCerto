import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const supabase = createServiceClient()
  const { data, error: dbError } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
      result:results(*)
    `)
    .eq('round_id', id)
    .order('match_number')

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { homeTeamId, awayTeamId, matchNumber, description } = body
    if (!homeTeamId || !awayTeamId || !matchNumber) {
      return apiError('Times e número do jogo são obrigatórios')
    }
    if (homeTeamId === awayTeamId) return apiError('Os times devem ser diferentes')

    const supabase = createServiceClient()

    // Validate teams belong to the championship of this round
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('championship_id')
      .eq('id', id)
      .single()

    if (roundError || !round) return apiError('Rodada não encontrada', 404)

    const { count: teamsCount, error: teamsError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('championship_id', round.championship_id)
      .in('id', [homeTeamId, awayTeamId])

    if (teamsError) return apiError('Erro ao validar times', 500)
    if (teamsCount !== 2) return apiError('Os times devem pertencer ao campeonato desta rodada', 400)

    const { data, error: dbError } = await supabase
      .from('matches')
      .insert({
        round_id: id,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_number: matchNumber,
        description,
        status: 'scheduled',
      })
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
      action: 'MATCH_CREATED',
      entityType: 'matches',
      entityId: data.id,
      changes: { round_id: id, homeTeamId, awayTeamId, matchNumber },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess(data, 201)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

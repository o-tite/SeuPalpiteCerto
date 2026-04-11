import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

// Save bets for a round
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const { roundId, bets } = body

    if (!roundId || !Array.isArray(bets)) {
      return apiError('roundId e bets são obrigatórios')
    }

    const supabase = createServiceClient()

    // Check round is still open
    const { data: round } = await supabase
      .from('rounds')
      .select('closing_at, status')
      .eq('id', roundId)
      .single()

    if (!round) return apiError('Rodada não encontrada', 404)
    if (new Date(round.closing_at) <= new Date()) {
      return apiError('Rodada encerrada — palpites não são mais aceitos', 403)
    }

    // Validate each bet references a match in the round
    const matchIds = bets.map((b: { matchId: string }) => b.matchId)
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .eq('round_id', roundId)
      .in('id', matchIds)

    if (!matches || matches.length !== matchIds.length) {
      return apiError('Um ou mais jogos não pertencem a esta rodada', 400)
    }

    // Upsert bets
    const betRows = bets.map((b: { matchId: string; homeScore: number; awayScore: number }) => ({
      user_id: user!.id,
      match_id: b.matchId,
      home_score: b.homeScore,
      away_score: b.awayScore,
      updated_at: new Date().toISOString(),
    }))

    const { data: savedBets, error: dbError } = await supabase
      .from('bets')
      .upsert(betRows, { onConflict: 'user_id,match_id' })
      .select()

    if (dbError) return apiError(dbError.message, 500)

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'BETS_SAVED',
      entityType: 'bets',
      entityId: user!.id,
      changes: { roundId, betCount: bets.length },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess({ bets: savedBets })
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

// Get my bets for a round
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const url = new URL(request.url)
  const roundId = url.searchParams.get('roundId')
  if (!roundId) return apiError('roundId é obrigatório')

  const supabase = createServiceClient()
  const { data: round } = await supabase
    .from('rounds')
    .select('*, championship:championships(id, name)')
    .eq('id', roundId)
    .single()

  if (!round) return apiError('Rodada não encontrada', 404)

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, name, logo_url),
      result:results(*)
    `)
    .eq('round_id', roundId)
    .order('match_number')

  const { data: bets } = await supabase
    .from('bets')
    .select('*, score:scores(*)')
    .eq('user_id', user!.id)
    .in('match_id', (matches ?? []).map((m: { id: string }) => m.id))

  const betsByMatch: Record<string, typeof bets[0]> = {}
  ;(bets ?? []).forEach((b: { match_id: string }) => {
    betsByMatch[b.match_id] = b as typeof bets[0]
  })

  const isOpen = new Date(round.closing_at) > new Date()

  return apiSuccess({
    round,
    isOpen,
    matches: (matches ?? []).map((m: { id: string }) => ({
      ...m,
      myBet: betsByMatch[m.id] ?? null,
    })),
  })
}

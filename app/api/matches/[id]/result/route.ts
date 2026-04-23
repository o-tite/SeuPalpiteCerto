import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { calcResultType, calcScore } from '@/lib/scoring'
import { finishRoundIfAllMatchesFinished } from '@/lib/round'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { homeScore, awayScore } = body
    if (homeScore === undefined || awayScore === undefined) {
      return apiError('Placar do mandante e visitante são obrigatórios')
    }
    if (homeScore < 0 || awayScore < 0) return apiError('Placar não pode ser negativo')

    const supabase = createServiceClient()
    const resultType = calcResultType(homeScore, awayScore)

    // Upsert result
    const { data: result, error: dbError } = await supabase
      .from('results')
      .upsert({
        match_id: id,
        home_score: homeScore,
        away_score: awayScore,
        result_type: resultType,
        entered_by: user!.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id' })
      .select()
      .single()

    if (dbError) return apiError(dbError.message, 500)

    // Determine the round before updating the match
    const { data: matchRow, error: matchError } = await supabase
      .from('matches')
      .select('round_id')
      .eq('id', id)
      .single()

    if (matchError || !matchRow) return apiError('Jogo não encontrado', 404)

    // Update match status to finished
    await supabase
      .from('matches')
      .update({ status: 'finished', updated_at: new Date().toISOString() })
      .eq('id', id)

    // Calculate scores for all bets on this match
    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', id)

    if (bets && bets.length > 0) {
      const scoreRows = bets.map((bet: { id: string; home_score: number; away_score: number }) => {
        const { points, exactMatch, winnerMatch, drawMatch, homeGoalsMatch, awayGoalsMatch } = calcScore(
          bet.home_score,
          bet.away_score,
          homeScore,
          awayScore
        )
        return {
          bet_id: bet.id,
          points,
          exact_match: exactMatch,
          winner_match: winnerMatch,
          draw_match: drawMatch,
          home_goals_match: homeGoalsMatch,
          away_goals_match: awayGoalsMatch,
          updated_at: new Date().toISOString(),
        }
      })

      await supabase
        .from('scores')
        .upsert(scoreRows, { onConflict: 'bet_id' })
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'RESULT_ENTERED',
      entityType: 'results',
      entityId: result.id,
      changes: { match_id: id, homeScore, awayScore, resultType },
      ipAddress: ip,
      userAgent,
    })

    await finishRoundIfAllMatchesFinished(supabase, matchRow.round_id)

    return apiSuccess(result, 201)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

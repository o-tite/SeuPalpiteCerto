import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const url = new URL(request.url)
  const championshipId = url.searchParams.get('championshipId')
  const roundId = url.searchParams.get('roundId')

  const supabase = createServiceClient()

  // Helper: busca participantes inscritos no campeonato como base do ranking
  async function getEnrolledUsers(champId: string) {
    const { data } = await supabase
      .from('user_championships')
      .select('user:users(id, nickname, photo_url)')
      .eq('championship_id', champId)
    return (data ?? []).map((row: { user: { id: string; nickname: string; photo_url: string } }) => row.user)
  }

  if (roundId) {
    // Ranking de uma rodada específica
    const { data: round } = await supabase
      .from('rounds')
      .select('*, championship:championships(id, name)')
      .eq('id', roundId)
      .single()

    if (!round) return apiError('Rodada não encontrada', 404)

    // Participantes inscritos no campeonato desta rodada (base do ranking)
    const enrolledUsers = await getEnrolledUsers(round.championship.id)

    // Partidas da rodada
    const { data: matchIds } = await supabase
      .from('matches')
      .select('id')
      .eq('round_id', roundId)

    const ids = (matchIds ?? []).map((m: { id: string }) => m.id)

    // Palpites existentes (pode ser vazio)
    const { data: bets } = ids.length > 0
      ? await supabase
          .from('bets')
          .select(`
            *,
            user:users(id, nickname, photo_url),
            score:scores(*),
            match:matches(
              id, match_number,
              home_team:teams!matches_home_team_id_fkey(id, name),
              away_team:teams!matches_away_team_id_fkey(id, name),
              result:results(*)
            )
          `)
          .in('match_id', ids)
      : { data: [] }

    // Inicializa mapa com TODOS os participantes zerados
    const userMap: Record<string, {
      user: { id: string; nickname: string; photo_url: string }
      totalPoints: number
      exactMatches: number
      bets: unknown[]
    }> = {}

    enrolledUsers.forEach(u => {
      userMap[u.id] = { user: u, totalPoints: 0, exactMatches: 0, bets: [] }
    })

    // Acumula pontos de quem tem palpites
    ;(bets ?? []).forEach((b: {
      user: { id: string; nickname: string; photo_url: string }
      score?: { points: number; exact_match: boolean }
      [key: string]: unknown
    }) => {
      const uid = b.user.id
      if (!userMap[uid]) {
        userMap[uid] = { user: b.user, totalPoints: 0, exactMatches: 0, bets: [] }
      }
      userMap[uid].totalPoints += b.score?.points ?? 0
      if (b.score?.exact_match) userMap[uid].exactMatches++
      userMap[uid].bets.push(b)
    })

    const rankings = Object.values(userMap)
      .sort((a, b) => b.totalPoints - a.totalPoints || b.exactMatches - a.exactMatches)
      .map((entry, i) => ({ position: i + 1, ...entry }))

    return apiSuccess({ round, rankings })
  }

  if (championshipId) {
    // Ranking geral do campeonato
    const { data: championship } = await supabase
      .from('championships')
      .select('*')
      .eq('id', championshipId)
      .single()

    if (!championship) return apiError('Campeonato não encontrado', 404)

    // Participantes inscritos como base (garante que aparecem mesmo sem palpites)
    const enrolledUsers = await getEnrolledUsers(championshipId)

    // Rodadas do campeonato
    const { data: rounds } = await supabase
      .from('rounds')
      .select('id')
      .eq('championship_id', championshipId)

    const roundIds = (rounds ?? []).map((r: { id: string }) => r.id)

    // Partidas de todas as rodadas
    const { data: matchIds } = roundIds.length > 0
      ? await supabase.from('matches').select('id').in('round_id', roundIds)
      : { data: [] }

    const ids = (matchIds ?? []).map((m: { id: string }) => m.id)

    // Palpites existentes (pode ser vazio)
    const { data: bets } = ids.length > 0
      ? await supabase
          .from('bets')
          .select('user_id, user:users(id, nickname, photo_url), score:scores(points, exact_match)')
          .in('match_id', ids)
      : { data: [] }

    // Inicializa mapa com TODOS os participantes zerados
    const userMap: Record<string, {
      user: { id: string; nickname: string; photo_url: string }
      totalPoints: number
      exactMatches: number
    }> = {}

    enrolledUsers.forEach(u => {
      userMap[u.id] = { user: u, totalPoints: 0, exactMatches: 0 }
    })

    // Acumula pontos de quem tem palpites
    ;(bets ?? []).forEach((b: {
      user: { id: string; nickname: string; photo_url: string }
      score?: { points: number; exact_match: boolean }
    }) => {
      const uid = b.user.id
      if (!userMap[uid]) {
        userMap[uid] = { user: b.user, totalPoints: 0, exactMatches: 0 }
      }
      userMap[uid].totalPoints += b.score?.points ?? 0
      if (b.score?.exact_match) userMap[uid].exactMatches++
    })

    const rankings = Object.values(userMap)
      .sort((a, b) => b.totalPoints - a.totalPoints || b.exactMatches - a.exactMatches)
      .map((entry, i) => ({ position: i + 1, ...entry }))

    return apiSuccess({ championship, rankings })
  }

  return apiError('Informe championshipId ou roundId', 400)
}

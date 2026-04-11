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
      .select('user_id, users(id, nickname, photo_url)')
      .eq('championship_id', champId)
    return (data ?? []).map((row: { user_id: string; users: { id: string; nickname: string; photo_url: string } | { id: string; nickname: string; photo_url: string }[] | null }) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users
      return u ?? { id: row.user_id, nickname: 'Usuário', photo_url: null }
    }).filter(Boolean) as { id: string; nickname: string; photo_url: string }[]
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
      user_id: string
      user: { id: string; nickname: string; photo_url: string } | { id: string; nickname: string; photo_url: string }[] | null
      score?: { points: number; exact_match: boolean } | { points: number; exact_match: boolean }[] | null
      [key: string]: unknown
    }) => {
      const userRaw = Array.isArray(b.user) ? b.user[0] : b.user
      if (!userRaw) return
      const scoreRaw = Array.isArray(b.score) ? b.score[0] : b.score
      const uid = userRaw.id
      if (!userMap[uid]) {
        userMap[uid] = { user: userRaw, totalPoints: 0, exactMatches: 0, bets: [] }
      }
      userMap[uid].totalPoints += scoreRaw?.points ?? 0
      if (scoreRaw?.exact_match) userMap[uid].exactMatches++
      userMap[uid].bets.push(b)
    })

    // Se a rodada ainda está aberta, não revelar palpites de outros participantes
    const isRoundOpen = round.status === 'open'

    const rankings = Object.values(userMap)
      .sort((a, b) => b.totalPoints - a.totalPoints || b.exactMatches - a.exactMatches)
      .map((entry, i) => ({
        position: i + 1,
        user: entry.user,
        totalPoints: entry.totalPoints,
        exactMatches: entry.exactMatches,
        // Só inclui bets detalhados se a rodada estiver fechada
        ...(isRoundOpen ? {} : { bets: entry.bets }),
      }))

    return apiSuccess({ round, rankings, canViewBets: !isRoundOpen })
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
      user_id: string
      user: { id: string; nickname: string; photo_url: string } | { id: string; nickname: string; photo_url: string }[] | null
      score?: { points: number; exact_match: boolean } | { points: number; exact_match: boolean }[] | null
    }) => {
      const userRaw = Array.isArray(b.user) ? b.user[0] : b.user
      if (!userRaw) return
      const scoreRaw = Array.isArray(b.score) ? b.score[0] : b.score
      const uid = userRaw.id
      if (!userMap[uid]) {
        userMap[uid] = { user: userRaw, totalPoints: 0, exactMatches: 0 }
      }
      userMap[uid].totalPoints += scoreRaw?.points ?? 0
      if (scoreRaw?.exact_match) userMap[uid].exactMatches++
    })

    const rankings = Object.values(userMap)
      .sort((a, b) => b.totalPoints - a.totalPoints || b.exactMatches - a.exactMatches)
      .map((entry, i) => ({ position: i + 1, ...entry }))

    return apiSuccess({ championship, rankings })
  }

  return apiError('Informe championshipId ou roundId', 400)
}

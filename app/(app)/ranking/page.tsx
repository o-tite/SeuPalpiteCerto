'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trophy, Medal, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type UserEntry = {
  position: number
  user: { id: string; nickname: string; photo_url?: string }
  totalPoints: number
  exactMatches: number
  bets?: {
    match: {
      id: string
      match_number: number
      home_team: { name: string }
      away_team: { name: string }
      result?: { home_score: number; away_score: number }
    }
    home_score: number
    away_score: number
    score?: { points: number; exact_match: boolean }
  }[]
}

type Championship = { id: string; name: string }
type Round = { id: string; round_number: number; description?: string; isOpen: boolean }

function RankingContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [championships, setChampionships] = useState<Championship[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [selectedChampionship, setSelectedChampionship] = useState(searchParams.get('championshipId') ?? '')
  const [selectedRound, setSelectedRound] = useState('')
  const [rankingData, setRankingData] = useState<{ rankings: UserEntry[]; championship?: Championship; round?: Round } | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/championships').then(r => r.ok ? r.json() : []).then(setChampionships)
  }, [])

  useEffect(() => {
    if (selectedChampionship) {
      fetch(`/api/championships/${selectedChampionship}/rounds`)
        .then(r => r.ok ? r.json() : [])
        .then(setRounds)
    }
  }, [selectedChampionship])

  useEffect(() => {
    if (!selectedChampionship) return
    const query = selectedRound
      ? `?roundId=${selectedRound}`
      : `?championshipId=${selectedChampionship}`
    setLoading(true)
    fetch(`/api/rankings${query}`)
      .then(r => r.ok ? r.json() : null)
      .then(setRankingData)
      .finally(() => setLoading(false))
  }, [selectedChampionship, selectedRound])

  const positionIcon = (pos: number) => {
    if (pos === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (pos === 2) return <Medal className="w-5 h-5 text-slate-400" />
    if (pos === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{pos}</span>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ranking</h1>
        <p className="text-muted-foreground mt-1">Veja a classificação por campeonato ou rodada</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedChampionship} onValueChange={(v) => { setSelectedChampionship(v); setSelectedRound(''); setRankingData(null) }}>
          <SelectTrigger className="sm:w-64">
            <SelectValue placeholder="Selecione o campeonato" />
          </SelectTrigger>
          <SelectContent>
            {championships.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRound} onValueChange={setSelectedRound} disabled={!selectedChampionship}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Geral (todas as rodadas)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Geral (todas as rodadas)</SelectItem>
            {rounds.map(r => (
              <SelectItem key={r.id} value={r.id}>
                Rodada {r.round_number} {r.description ? `— ${r.description}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />)}
        </div>
      )}

      {!loading && rankingData && (
        <>
          {rankingData.rankings.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground/30" />
                <p className="font-medium text-foreground">Sem dados de ranking ainda</p>
                <p className="text-sm text-muted-foreground">Os dados aparecerão quando houver resultados registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rankingData.rankings.map((entry) => {
                const isMe = entry.user.id === user?.id
                const isExpanded = expandedUser === entry.user.id
                const initials = entry.user.nickname?.slice(0, 2).toUpperCase() ?? '??'

                return (
                  <div key={entry.user.id}>
                    <Card
                      className={cn(
                        'border-border cursor-pointer transition-colors',
                        isMe && 'border-primary/40 bg-primary/5',
                        isExpanded && 'rounded-b-none border-b-0'
                      )}
                      onClick={() => entry.bets && setExpandedUser(isExpanded ? null : entry.user.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Position */}
                          <div className="w-7 flex items-center justify-center shrink-0">
                            {positionIcon(entry.position)}
                          </div>

                          {/* Avatar */}
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarImage src={entry.user.photo_url ?? undefined} />
                            <AvatarFallback className="bg-secondary text-foreground text-xs font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn('font-semibold text-foreground truncate', isMe && 'text-primary')}>
                                {entry.user.nickname}
                              </span>
                              {isMe && <Badge className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0">Você</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {entry.exactMatches} placar{entry.exactMatches !== 1 ? 'es' : ''} exato{entry.exactMatches !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Points */}
                          <div className="text-right shrink-0">
                            <div className="text-xl font-bold text-foreground">{entry.totalPoints}</div>
                            <div className="text-xs text-muted-foreground">pontos</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Expanded bets detail */}
                    {isExpanded && entry.bets && (
                      <Card className="border-border rounded-t-none border-t-0">
                        <CardContent className="px-4 pb-4 pt-0">
                          <div className="border-t border-border pt-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Palpites desta rodada</p>
                            {entry.bets.map((bet, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                                <span className="text-sm text-foreground">
                                  {bet.match.home_team.name} × {bet.match.away_team.name}
                                </span>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="text-muted-foreground">
                                    {bet.home_score} — {bet.away_score}
                                  </span>
                                  {bet.match.result && (
                                    <span className="text-foreground font-medium">
                                      ({bet.match.result.home_score} — {bet.match.result.away_score})
                                    </span>
                                  )}
                                  {bet.score && (
                                    <Badge className={cn(
                                      'text-xs font-bold',
                                      bet.score.points > 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'
                                    )}>
                                      {bet.score.points}pts
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RankingPage() {
  return (
    <Suspense>
      <RankingContent />
    </Suspense>
  )
}

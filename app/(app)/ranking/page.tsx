'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trophy, Medal, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

type BetEntry = {
  home_score: number
  away_score: number
  match: {
    id: string
    match_number: number
    home_team: { name: string }
    away_team: { name: string }
    result?: { home_score: number; away_score: number } | null
  }
  score?: { points: number; exact_match: boolean } | null
}

type UserEntry = {
  position: number
  user: { id: string; nickname: string; photo_url?: string }
  totalPoints: number
  exactMatches: number
  bets?: BetEntry[]
}

type Championship = { id: string; name: string }
type Round = { id: string; round_number: number; description?: string; status: string; closing_at?: string; championship?: { id: string; name: string } }

const ALL_ROUNDS = '__all__'

// ─── helpers ────────────────────────────────────────────────────────────────

function positionIcon(pos: number) {
  if (pos === 1) return (
    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
      <Trophy className="w-4 h-4 text-yellow-500" />
    </div>
  )
  if (pos === 2) return (
    <div className="w-8 h-8 rounded-full bg-slate-400/10 flex items-center justify-center shrink-0">
      <Medal className="w-4 h-4 text-slate-400" />
    </div>
  )
  if (pos === 3) return (
    <div className="w-8 h-8 rounded-full bg-amber-600/10 flex items-center justify-center shrink-0">
      <Medal className="w-4 h-4 text-amber-600" />
    </div>
  )
  return (
    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-muted-foreground">{pos}</span>
    </div>
  )
}

// ─── subcomponents ──────────────────────────────────────────────────────────

function RankingRow({ entry, isMe, hasRoundBets, betsVisible }: { entry: UserEntry; isMe: boolean; hasRoundBets: boolean; betsVisible: boolean }) {
  const [open, setOpen] = useState(false)
  const initials = entry.user.nickname?.slice(0, 2).toUpperCase() ?? '??'
  const canExpand = hasRoundBets && betsVisible && (entry.bets?.length ?? 0) > 0

  return (
    <div className="rounded-xl border overflow-hidden transition-colors"
      style={{ borderColor: isMe ? 'hsl(var(--primary) / 0.35)' : undefined }}>

      {/* Accent bar for top 3 */}
      {entry.position <= 3 && (
        <div className={cn('h-0.5', {
          'bg-yellow-500': entry.position === 1,
          'bg-slate-400':  entry.position === 2,
          'bg-amber-600':  entry.position === 3,
        })} />
      )}

      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          isMe && 'bg-primary/5',
          canExpand && 'cursor-pointer select-none'
        )}
        onClick={() => canExpand && setOpen(v => !v)}
      >
        {/* Position icon */}
        {positionIcon(entry.position)}

        {/* Avatar */}
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={entry.user.photo_url ?? undefined} />
          <AvatarFallback className="bg-secondary text-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name + stat */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-semibold text-foreground text-sm leading-snug', isMe && 'text-primary')}>
              {entry.user.nickname}
            </span>
            {isMe && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10 shrink-0 leading-none py-0">
                Você
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {entry.exactMatches} placar{entry.exactMatches !== 1 ? 'es' : ''} exato{entry.exactMatches !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Points */}
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            <div className={cn(
              'text-2xl font-bold leading-none tabular-nums',
              entry.totalPoints > 0 ? 'text-foreground' : 'text-muted-foreground/50'
            )}>
              {entry.totalPoints}
            </div>
            <div className="text-xs text-muted-foreground text-right">pts</div>
          </div>
          {canExpand && (
            <div className="text-muted-foreground ml-1">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>

      {/* Expanded bets */}
      {open && entry.bets && entry.bets.length > 0 && (
        <div className="border-t border-border bg-secondary/30 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Palpites desta rodada
          </p>
          {entry.bets.map((bet, i) => {
            const scoreRaw = Array.isArray(bet.score) ? bet.score[0] : bet.score
            const resultRaw = Array.isArray(bet.match?.result) ? bet.match.result[0] : bet.match?.result
            const matchRaw = Array.isArray(bet.match) ? bet.match[0] : bet.match
            return (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                {/* Match number */}
                <span className="text-xs text-muted-foreground w-5 shrink-0 text-center font-bold">
                  {matchRaw?.match_number}
                </span>
                {/* Teams */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground leading-snug">
                    {matchRaw?.home_team?.name} × {matchRaw?.away_team?.name}
                  </span>
                </div>
                {/* Scores */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Palpite */}
                  <span className="text-xs font-bold text-foreground bg-background border border-border rounded px-1.5 py-0.5 tabular-nums">
                    {bet.home_score} – {bet.away_score}
                  </span>
                  {/* Resultado oficial */}
                  {resultRaw && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ({resultRaw.home_score}–{resultRaw.away_score})
                    </span>
                  )}
                  {/* Pontuação */}
                  {scoreRaw != null && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-bold px-1.5 py-0 leading-5',
                        scoreRaw.points > 0
                          ? 'border-primary/30 text-primary bg-primary/10'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      {scoreRaw.points}pts
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── main page ──────────────────────────────────────────────────────────────

function RankingContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [championships, setChampionships] = useState<Championship[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [selectedChampionship, setSelectedChampionship] = useState(searchParams.get('championshipId') ?? '')
  const [selectedRound, setSelectedRound] = useState(ALL_ROUNDS)
  const [rankingData, setRankingData] = useState<{ rankings: UserEntry[]; betsVisible?: boolean; championship?: Championship; round?: Round } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/championships').then(r => r.ok ? r.json() : []).then(data => {
      setChampionships(data)
      setSelectedChampionship(prev => prev || (data.length > 0 ? data[0].id : ''))
    })
  }, [])

  useEffect(() => {
    if (!selectedChampionship) return
    setSelectedRound(ALL_ROUNDS)
    setRounds([])
    fetch(`/api/championships/${selectedChampionship}/rounds`)
      .then(r => r.ok ? r.json() : [])
      .then(setRounds)
  }, [selectedChampionship])

  useEffect(() => {
    if (!selectedChampionship) return
    const isSpecificRound = selectedRound !== ALL_ROUNDS
    const query = isSpecificRound
      ? `?roundId=${selectedRound}`
      : `?championshipId=${selectedChampionship}`
    setLoading(true)
    setRankingData(null)
    fetch(`/api/rankings${query}`)
      .then(r => r.ok ? r.json() : null)
      .then(setRankingData)
      .finally(() => setLoading(false))
  }, [selectedChampionship, selectedRound])

  const hasRoundBets = selectedRound !== ALL_ROUNDS
  const betsVisible = rankingData?.betsVisible ?? false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Ranking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Classificação por campeonato ou rodada</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          value={selectedChampionship}
          onValueChange={v => { setSelectedChampionship(v); setSelectedRound(ALL_ROUNDS); setRankingData(null) }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Campeonato" />
          </SelectTrigger>
          <SelectContent>
            {championships.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={selectedRound}
          onValueChange={setSelectedRound}
          disabled={!selectedChampionship}
        >
          <SelectTrigger>
            <SelectValue placeholder="Geral — todas as rodadas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROUNDS}>Geral — todas as rodadas</SelectItem>
            {rounds.map(r => (
              <SelectItem key={r.id} value={r.id}>
                Rodada {r.round_number}{r.description ? ` — ${r.description}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Context badge */}
      {!loading && rankingData && (
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {(rankingData.championship?.name) ??
             (Array.isArray(rankingData.round?.championship)
               ? rankingData.round?.championship?.[0]?.name
               : (rankingData.round?.championship as { name?: string } | undefined)?.name) ??
             ''}
          </span>
          {hasRoundBets && rankingData.round && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">Rodada {rankingData.round?.round_number}</span>
            </>
          )}
          <Badge variant="secondary" className="text-xs ml-auto">
            {rankingData.rankings.length} participante{rankingData.rankings.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[4.5rem] rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && rankingData && rankingData.rankings.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground/20" />
            <p className="font-semibold text-foreground">Nenhum participante inscrito</p>
            <p className="text-sm text-muted-foreground">
              O ranking aparece assim que participantes forem adicionados ao campeonato
            </p>
          </CardContent>
        </Card>
      )}

      {/* No championship selected */}
      {!loading && !rankingData && !selectedChampionship && (
        <Card className="border-border">
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Selecione um campeonato para ver o ranking</p>
          </CardContent>
        </Card>
      )}

      {/* Bets locked notice */}
      {!loading && rankingData && hasRoundBets && !betsVisible && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Os palpites dos jogadores serão exibidos após o encerramento do prazo de apostas desta rodada.
          </p>
        </div>
      )}

      {/* Rankings list */}
      {!loading && rankingData && rankingData.rankings.length > 0 && (
        <div className="space-y-2">
          {rankingData.rankings.map(entry => (
            <RankingRow
              key={entry.user.id}
              entry={entry}
              isMe={entry.user.id === user?.id}
              hasRoundBets={hasRoundBets}
              betsVisible={betsVisible}
            />
          ))}
        </div>
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

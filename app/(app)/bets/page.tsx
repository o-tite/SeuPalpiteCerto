'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Lock, Trophy, Clock, CheckCircle, AlertCircle, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

type Team = { id: string; name: string; logo_url?: string }
type Result = { home_score: number; away_score: number; result_type: string }
type MyBet = { id: string; home_score: number; away_score: number; score?: { points: number; exact_match: boolean; winner_match: boolean; draw_match: boolean } }
type Match = { id: string; match_number: number; home_team: Team; away_team: Team; result?: Result | null; myBet?: MyBet | null; status: string }
type Round = { id: string; round_number: number; description?: string; closing_at: string; isOpen: boolean; status: string; championship: { id: string; name: string } }
type Championship = { id: string; name: string }

function BetsContent() {
  const searchParams = useSearchParams()
  const championshipId = searchParams.get('championshipId')
  const roundId = searchParams.get('roundId')

  const [championships, setChampionships] = useState<Championship[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [selectedChampionship, setSelectedChampionship] = useState(championshipId ?? '')
  const [selectedRound, setSelectedRound] = useState(roundId ?? '')
  const [roundData, setRoundData] = useState<{ round: Round; matches: Match[]; isOpen: boolean } | null>(null)
  const [bets, setBets] = useState<Record<string, { home: string; away: string }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
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

  const loadRound = useCallback(async (rid: string) => {
    if (!rid) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bets?roundId=${rid}`)
      if (res.ok) {
        const data = await res.json()
        setRoundData(data)
        const initial: Record<string, { home: string; away: string }> = {}
        data.matches.forEach((m: Match) => {
          initial[m.id] = {
            home: m.myBet?.home_score?.toString() ?? '',
            away: m.myBet?.away_score?.toString() ?? '',
          }
        })
        setBets(initial)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedRound) loadRound(selectedRound)
  }, [selectedRound, loadRound])

  const handleSave = async () => {
    if (!roundData || !selectedRound) return
    setSaving(true)
    setError('')
    try {
      const betList = Object.entries(bets)
        .filter(([, v]) => v.home !== '' && v.away !== '')
        .map(([matchId, v]) => ({
          matchId,
          homeScore: parseInt(v.home),
          awayScore: parseInt(v.away),
        }))

      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: selectedRound, bets: betList }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      loadRound(selectedRound)
    } finally {
      setSaving(false)
    }
  }

  const countFilled = Object.values(bets).filter(v => v.home !== '' && v.away !== '').length

  return (
    <div className="space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Meus Palpites</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Selecione uma rodada e registre seus palpites</p>
      </div>

      {/* Selectors — full width on mobile, inline on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          value={selectedChampionship}
          onValueChange={(v) => { setSelectedChampionship(v); setSelectedRound(''); setRoundData(null) }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Campeonato" />
          </SelectTrigger>
          <SelectContent>
            {championships.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRound} onValueChange={setSelectedRound} disabled={!selectedChampionship}>
          <SelectTrigger>
            <SelectValue placeholder="Rodada" />
          </SelectTrigger>
          <SelectContent>
            {rounds.map(r => (
              <SelectItem key={r.id} value={r.id}>
                Rodada {r.round_number}{' '}
                {r.isOpen ? '— aberta' : r.status === 'finished' ? '— finalizada' : '— fechada'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary rounded-xl animate-pulse" />)}
        </div>
      )}

      {roundData && !loading && (
        <>
          {/* Round banner */}
          <div className={cn(
            'rounded-xl border px-4 py-3 flex flex-col gap-1',
            roundData.isOpen
              ? 'bg-primary/5 border-primary/20'
              : 'bg-secondary border-border'
          )}>
            <div className="flex items-center gap-2 flex-wrap">
              <Trophy className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground text-sm">{roundData.round.championship?.name}</span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-foreground text-sm font-medium">Rodada {roundData.round.round_number}</span>
            </div>
            {roundData.round.description && (
              <p className="text-xs text-muted-foreground">{roundData.round.description}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              {roundData.isOpen ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs text-primary font-medium">
                    Fecha em{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(roundData.round.closing_at))}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {roundData.round.status === 'finished' ? 'Finalizada' : 'Fechada — palpites encerrados'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Matches */}
          <div className="space-y-3">
            {roundData.matches.map((match) => (
              <MatchBetCard
                key={match.id}
                match={match}
                bet={bets[match.id] ?? { home: '', away: '' }}
                isOpen={roundData.isOpen}
                onChange={(home, away) => setBets(prev => ({ ...prev, [match.id]: { home, away } }))}
              />
            ))}
          </div>

          {/* Save bar — sticky on mobile */}
          {roundData.isOpen && (
            <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-card border-t border-border flex flex-col gap-2 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:rounded-xl sm:border sm:p-4">
              {error && (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Palpites salvos com sucesso!
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{countFilled}</span>/{roundData.matches.length} preenchidos
                </span>
                <Button
                  onClick={handleSave}
                  disabled={saving || countFilled === 0}
                  className="gap-2 shrink-0"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar palpites'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!roundData && !loading && selectedRound && (
        <Card className="border-border">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nenhum jogo encontrado nesta rodada
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MatchBetCard({
  match,
  bet,
  isOpen,
  onChange,
}: {
  match: Match
  bet: { home: string; away: string }
  isOpen: boolean
  onChange: (home: string, away: string) => void
}) {
  const hasBet = bet.home !== '' && bet.away !== ''
  const hasResult = match.result != null
  const score = match.myBet?.score

  return (
    <Card className={cn(
      'border transition-colors',
      isOpen && hasBet ? 'border-primary/40 bg-primary/5' : 'border-border'
    )}>
      <CardContent className="p-4">
        {/* Teams row — central layout, score inputs on the right */}
        <div className="flex items-center gap-3">

          {/* Match number */}
          <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">
            {match.match_number}
          </span>

          {/* Teams: home — VS — away */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {/* Home team */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="font-semibold text-foreground text-sm leading-tight text-right truncate">
                  {match.home_team.name}
                </span>
                {match.home_team.logo_url && (
                  <img src={match.home_team.logo_url} alt={match.home_team.name} className="w-6 h-6 object-contain shrink-0" />
                )}
              </div>

              {/* VS divider */}
              <span className="text-xs text-muted-foreground shrink-0 px-1">×</span>

              {/* Away team */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {match.away_team.logo_url && (
                  <img src={match.away_team.logo_url} alt={match.away_team.name} className="w-6 h-6 object-contain shrink-0" />
                )}
                <span className="font-semibold text-foreground text-sm leading-tight truncate">
                  {match.away_team.name}
                </span>
              </div>
            </div>

            {/* Result row (when available) */}
            {hasResult && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="text-xs text-muted-foreground">Resultado oficial:</span>
                <span className="text-xs font-bold text-foreground bg-secondary px-2 py-0.5 rounded">
                  {match.result!.home_score} × {match.result!.away_score}
                </span>
              </div>
            )}
          </div>

          {/* Right side: inputs or palpite display */}
          <div className="shrink-0">
            {isOpen ? (
              /* Score inputs */
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="99"
                  className="w-11 h-11 text-center rounded-lg border border-border bg-background text-foreground text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={bet.home}
                  onChange={e => onChange(e.target.value, bet.away)}
                  placeholder="–"
                />
                <span className="text-muted-foreground text-sm">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="99"
                  className="w-11 h-11 text-center rounded-lg border border-border bg-background text-foreground text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={bet.away}
                  onChange={e => onChange(bet.home, e.target.value)}
                  placeholder="–"
                />
              </div>
            ) : match.myBet ? (
              /* Locked bet display */
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 bg-secondary rounded-lg px-3 py-1.5">
                  <span className="text-base font-bold text-foreground">{match.myBet.home_score}</span>
                  <span className="text-muted-foreground text-xs">–</span>
                  <span className="text-base font-bold text-foreground">{match.myBet.away_score}</span>
                </div>
                {score && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-bold px-2',
                      score.points > 0 ? 'border-primary/30 text-primary bg-primary/10' : 'text-muted-foreground'
                    )}
                  >
                    {score.points} pts
                  </Badge>
                )}
              </div>
            ) : (
              /* No bet */
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 bg-secondary rounded-lg px-3 py-1.5 opacity-40">
                  <span className="text-base font-bold text-foreground">–</span>
                  <span className="text-muted-foreground text-xs">–</span>
                  <span className="text-base font-bold text-foreground">–</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" /> sem palpite
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BetsPage() {
  return (
    <Suspense>
      <BetsContent />
    </Suspense>
  )
}

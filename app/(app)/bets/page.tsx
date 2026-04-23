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
type Match = { id: string; match_number: number; home_team: Team; away_team: Team; description?: string; result?: Result | null; myBet?: MyBet | null; status: string }
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
    fetch('/api/championships').then(r => r.ok ? r.json() : []).then(data => {
      setChampionships(data)
      setSelectedChampionship(prev => prev || (data.length > 0 ? data[0].id : ''))
    })
  }, [])

  useEffect(() => {
    if (selectedChampionship) {
      fetch(`/api/championships/${selectedChampionship}/rounds`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          setRounds(data)
          setSelectedRound(prev => {
            if (prev) return prev
            const openRound = data.find((r: Round) => r.isOpen) ?? data[0]
            return openRound ? openRound.id : ''
          })
        })
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
              <div key={match.id} className="space-y-2">
                {match.description && (
                  <p className="text-sm text-muted-foreground px-3">{match.description}</p>
                )}
                <MatchBetCard
                  match={match}
                  bet={bets[match.id] ?? { home: '', away: '' }}
                  isOpen={roundData.isOpen}
                  onChange={(home, away) => setBets(prev => ({ ...prev, [match.id]: { home, away } }))}
                />
              </div>
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
      'border transition-colors overflow-hidden',
      isOpen && hasBet ? 'border-primary/40' : 'border-border'
    )}>
      {/* Thin accent bar on top when bet is filled */}
      {isOpen && hasBet && (
        <div className="h-0.5 w-full bg-primary" />
      )}

      <CardContent className="p-0">

        {/* ── LINHA 1: número do jogo + times ── */}
        <div className="flex items-stretch">

          {/* Número do jogo */}
          <div className="flex items-center justify-center px-3 bg-secondary/60 border-r border-border shrink-0 min-w-[2.5rem]">
            <span className="text-xs font-bold text-muted-foreground">{match.match_number}</span>
          </div>

          {/* Time da casa */}
          <div className="flex-1 flex items-center gap-2 px-3 py-3 border-r border-border">
            {match.home_team.logo_url ? (
              <img
                src={match.home_team.logo_url}
                alt={match.home_team.name}
                className="w-7 h-7 object-contain shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {match.home_team.name.slice(0, 1)}
              </div>
            )}
            <span className="font-semibold text-foreground text-sm leading-tight">
              {match.home_team.name}
            </span>
          </div>

          {/* Separador central */}
          <div className="flex items-center justify-center px-2 shrink-0">
            <span className="text-xs font-bold text-muted-foreground">×</span>
          </div>

          {/* Time visitante */}
          <div className="flex-1 flex items-center gap-2 px-3 py-3 border-l border-border">
            {match.away_team.logo_url ? (
              <img
                src={match.away_team.logo_url}
                alt={match.away_team.name}
                className="w-7 h-7 object-contain shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {match.away_team.name.slice(0, 1)}
              </div>
            )}
            <span className="font-semibold text-foreground text-sm leading-tight">
              {match.away_team.name}
            </span>
          </div>
        </div>

        {/* Divisor */}
        <div className="h-px bg-border" />

        {/* ── LINHA 2: inputs / palpite / placar ── */}
        <div className="flex items-stretch">

          {/* Espaço alinhado com o número do jogo */}
          <div className="shrink-0 min-w-[2.5rem] bg-secondary/30 border-r border-border" />

          {/* Conteúdo central dos palpites */}
          <div className="flex-1 flex items-center justify-center gap-3 px-3 py-2.5">
            {isOpen ? (
              /* Inputs ativos */
              <>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="99"
                  className={cn(
                    'w-14 h-12 text-center rounded-lg border bg-background text-foreground text-2xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                    bet.home !== '' ? 'border-primary/50 bg-primary/5' : 'border-border'
                  )}
                  value={bet.home}
                  onChange={e => onChange(e.target.value, bet.away)}
                  placeholder="–"
                />
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <span className="text-base font-bold text-muted-foreground">×</span>
                  {hasResult && (
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {match.result!.home_score}–{match.result!.away_score}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="99"
                  className={cn(
                    'w-14 h-12 text-center rounded-lg border bg-background text-foreground text-2xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                    bet.away !== '' ? 'border-primary/50 bg-primary/5' : 'border-border'
                  )}
                  value={bet.away}
                  onChange={e => onChange(bet.home, e.target.value)}
                  placeholder="–"
                />
              </>
            ) : match.myBet ? (
              /* Palpite registrado (rodada fechada) */
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground w-8 text-center">{match.myBet.home_score}</span>
                  <span className="text-base font-bold text-muted-foreground">–</span>
                  <span className="text-2xl font-bold text-foreground w-8 text-center">{match.myBet.away_score}</span>
                </div>
                <div className="flex items-center gap-2">
                  {score ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-bold px-2.5',
                        score.points > 0
                          ? 'border-primary/40 text-primary bg-primary/10'
                          : 'text-muted-foreground border-border'
                      )}
                    >
                      {score.points} pts
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">aguardando resultado</span>
                  )}
                  {hasResult && (
                    <span className="text-xs text-muted-foreground">
                      Resultado: {match.result!.home_score}–{match.result!.away_score}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Sem palpite (rodada fechada) */
              <div className="flex items-center gap-1.5 text-muted-foreground/50 py-1">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-sm">sem palpite registrado</span>
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

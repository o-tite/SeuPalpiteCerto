'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Lock, Trophy, Clock, CheckCircle, AlertCircle, Save } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type Team = { id: string; name: string; logo_url?: string }
type Result = { home_score: number; away_score: number; result_type: string }
type MyBet = { id: string; home_score: number; away_score: number; score?: { points: number; exact_match: boolean; winner_match: boolean; draw_match: boolean } }
type Match = { id: string; match_number: number; home_team: Team; away_team: Team; result?: Result | null; myBet?: MyBet | null; status: string }
type Round = { id: string; round_number: number; description?: string; closing_at: string; isOpen: boolean; championship: { id: string; name: string } }
type Championship = { id: string; name: string }

function BetsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
      if (!res.ok) {
        setError(data.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      loadRound(selectedRound)
    } finally {
      setSaving(false)
    }
  }

  const countFilled = Object.values(bets).filter(v => v.home !== '' && v.away !== '').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meus Palpites</h1>
        <p className="text-muted-foreground mt-1">Selecione uma rodada e registre seus palpites</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedChampionship} onValueChange={(v) => { setSelectedChampionship(v); setSelectedRound(''); setRoundData(null) }}>
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
            <SelectValue placeholder="Selecione a rodada" />
          </SelectTrigger>
          <SelectContent>
            {rounds.map(r => (
              <SelectItem key={r.id} value={r.id}>
                Rodada {r.round_number} {r.isOpen ? '— aberta' : r.status === 'finished' ? '— finalizada' : '— fechada'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />)}
        </div>
      )}

      {roundData && !loading && (
        <>
          {/* Round header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-secondary border border-border">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{roundData.round.championship?.name}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-foreground">Rodada {roundData.round.round_number}</span>
              </div>
              {roundData.round.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{roundData.round.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {roundData.isOpen ? (
                <>
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">
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
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {roundData.round.status === 'finished' ? 'Finalizada' : 'Fechada'}
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

          {/* Save button */}
          {roundData.isOpen && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-card border border-border">
              <div className="text-sm text-muted-foreground">
                {countFilled} de {roundData.matches.length} jogos com palpite
              </div>
              <div className="flex items-center gap-3">
                {error && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                {saved && (
                  <div className="flex items-center gap-1.5 text-sm text-primary">
                    <CheckCircle className="w-4 h-4" />
                    Palpites salvos!
                  </div>
                )}
                <Button onClick={handleSave} disabled={saving || countFilled === 0} className="gap-2">
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
          <CardContent className="py-12 text-center text-muted-foreground">
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
    <Card className={cn('border-border', hasBet && isOpen && 'border-primary/30')}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Match info */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4">{match.match_number}</span>
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium text-foreground text-sm truncate">{match.home_team.name}</span>
                <span className="text-muted-foreground text-xs shrink-0">vs</span>
                <span className="font-medium text-foreground text-sm truncate">{match.away_team.name}</span>
              </div>
            </div>
          </div>

          {/* Result (if available) */}
          {hasResult && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Resultado:</span>
              <span className="font-bold text-foreground">
                {match.result!.home_score} — {match.result!.away_score}
              </span>
            </div>
          )}

          {/* Bet inputs or locked */}
          {isOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="99"
                className="w-12 h-10 text-center rounded-md border border-border bg-input text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                value={bet.home}
                onChange={e => onChange(e.target.value, bet.away)}
                placeholder="—"
              />
              <span className="text-muted-foreground font-bold">×</span>
              <input
                type="number"
                min="0"
                max="99"
                className="w-12 h-10 text-center rounded-md border border-border bg-input text-foreground text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                value={bet.away}
                onChange={e => onChange(bet.home, e.target.value)}
                placeholder="—"
              />
            </div>
          ) : match.myBet ? (
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Seu palpite: </span>
                <span className="font-bold text-foreground">
                  {match.myBet.home_score} — {match.myBet.away_score}
                </span>
              </div>
              {score && (
                <Badge
                  className={cn(
                    'text-xs font-bold',
                    score.points > 0
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {score.points} pts
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              Sem palpite
            </div>
          )}
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

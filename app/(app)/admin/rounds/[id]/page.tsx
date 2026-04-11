'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, CheckCircle, Trophy } from 'lucide-react'

type Team = { id: string; name: string; logo_url?: string }
type Result = { home_score: number; away_score: number; result_type: string }
type Match = {
  id: string
  match_number: number
  home_team: Team
  away_team: Team
  result?: Result | null
  status: string
}
type Round = {
  id: string
  round_number: number
  description?: string
  closing_at: string
  isOpen: boolean
  championship: { id: string; name: string }
  matches: Match[]
}

export default function AdminRoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [round, setRound] = useState<Round | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  // Match form
  const [showMatch, setShowMatch] = useState(false)
  const [matchForm, setMatchForm] = useState({ homeTeamId: '', awayTeamId: '', matchNumber: '', description: '' })

  // Result form
  const [resultTarget, setResultTarget] = useState<Match | null>(null)
  const [resultForm, setResultForm] = useState({ homeScore: '', awayScore: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const res = await fetch(`/api/rounds/${id}`)
    if (res.ok) {
      const data = await res.json()
      setRound(data)
      // Load teams for the championship
      const tRes = await fetch(`/api/championships/${data.championship.id}/teams`)
      if (tRes.ok) setTeams(await tRes.json())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleCreateMatch = async () => {
    setSaving(true); setError('')
    const res = await fetch(`/api/rounds/${id}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeTeamId: matchForm.homeTeamId,
        awayTeamId: matchForm.awayTeamId,
        matchNumber: parseInt(matchForm.matchNumber),
        description: matchForm.description,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShowMatch(false)
    setMatchForm({ homeTeamId: '', awayTeamId: '', matchNumber: '', description: '' })
    load(); setSaving(false)
  }

  const handleSaveResult = async () => {
    if (!resultTarget) return
    setSaving(true); setError('')
    const res = await fetch(`/api/matches/${resultTarget.id}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeScore: parseInt(resultForm.homeScore),
        awayScore: parseInt(resultForm.awayScore),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setResultTarget(null)
    setResultForm({ homeScore: '', awayScore: '' })
    load(); setSaving(false)
  }

  if (loading) return <div className="h-32 bg-secondary rounded animate-pulse" />

  const nextMatchNumber = (round?.matches?.length ?? 0) + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{round?.championship?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Rodada {round?.round_number}</h1>
          <p className="text-xs text-muted-foreground">
            Fecha: {round && new Date(round.closing_at).toLocaleString('pt-BR')}
            {round && (round.isOpen
              ? <span className="ml-2 text-primary">(Aberta)</span>
              : <span className="ml-2">(Encerrada)</span>
            )}
          </p>
        </div>
      </div>

      {/* Matches list */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Jogos ({round?.matches?.length ?? 0})
        </h2>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => {
            setMatchForm(f => ({ ...f, matchNumber: String(nextMatchNumber) }))
            setShowMatch(true)
            setError('')
          }}
        >
          <Plus className="w-4 h-4" /> Novo Jogo
        </Button>
      </div>

      {(!round?.matches || round.matches.length === 0) ? (
        <p className="text-muted-foreground text-sm text-center py-8">Nenhum jogo cadastrado ainda</p>
      ) : (
        <div className="space-y-3">
          {round.matches.map(m => (
            <Card key={m.id} className="border-border">
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6">{m.match_number}</span>
                  <span className="font-medium text-foreground">{m.home_team.name}</span>
                  <span className="text-muted-foreground text-sm">vs</span>
                  <span className="font-medium text-foreground">{m.away_team.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {m.result ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground text-lg">
                        {m.result.home_score} — {m.result.away_score}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          setResultTarget(m)
                          setResultForm({ homeScore: String(m.result!.home_score), awayScore: String(m.result!.away_score) })
                          setError('')
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => {
                        setResultTarget(m)
                        setResultForm({ homeScore: '', awayScore: '' })
                        setError('')
                      }}
                    >
                      <Plus className="w-3 h-3" /> Resultado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Match Dialog */}
      <Dialog open={showMatch} onOpenChange={setShowMatch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Jogo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mandante</Label>
                <Select value={matchForm.homeTeamId} onValueChange={v => setMatchForm(f => ({ ...f, homeTeamId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger>
                  <SelectContent>
                    {teams.filter(t => t.id !== matchForm.awayTeamId).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Visitante</Label>
                <Select value={matchForm.awayTeamId} onValueChange={v => setMatchForm(f => ({ ...f, awayTeamId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Time" /></SelectTrigger>
                  <SelectContent>
                    {teams.filter(t => t.id !== matchForm.homeTeamId).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Número do jogo</Label>
              <Input type="number" min="1" value={matchForm.matchNumber} onChange={e => setMatchForm(f => ({ ...f, matchNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input value={matchForm.description} onChange={e => setMatchForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowMatch(false)}>Cancelar</Button>
            <Button onClick={handleCreateMatch} disabled={saving || !matchForm.homeTeamId || !matchForm.awayTeamId || !matchForm.matchNumber}>
              {saving ? 'Criando...' : 'Criar Jogo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultTarget !== null} onOpenChange={() => setResultTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {resultTarget?.result ? 'Editar resultado' : 'Registrar resultado'}
            </DialogTitle>
          </DialogHeader>
          {resultTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground text-center font-medium">
                {resultTarget.home_team.name} vs {resultTarget.away_team.name}
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex items-center gap-3 justify-center">
                <div className="space-y-1.5 text-center">
                  <Label className="text-xs">{resultTarget.home_team.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    className="w-16 text-center text-2xl font-bold h-14"
                    value={resultForm.homeScore}
                    onChange={e => setResultForm(f => ({ ...f, homeScore: e.target.value }))}
                  />
                </div>
                <span className="text-2xl font-bold text-muted-foreground mt-5">×</span>
                <div className="space-y-1.5 text-center">
                  <Label className="text-xs">{resultTarget.away_team.name}</Label>
                  <Input
                    type="number"
                    min="0"
                    className="w-16 text-center text-2xl font-bold h-14"
                    value={resultForm.awayScore}
                    onChange={e => setResultForm(f => ({ ...f, awayScore: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResultTarget(null)}>Cancelar</Button>
            <Button onClick={handleSaveResult} disabled={saving || resultForm.homeScore === '' || resultForm.awayScore === ''}>
              {saving ? 'Salvando...' : 'Confirmar resultado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

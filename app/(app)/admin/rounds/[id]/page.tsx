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
import { ArrowLeft, Plus, CheckCircle, Trophy, Pencil } from 'lucide-react'
import { toDatetimeLocal } from '@/lib/utils'

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
  status: 'open' | 'closed' | 'finished'
  isOpen: boolean
  championship: { id: string; name: string }
  matches: Match[]
}

const statusOptions = [
  { value: 'open',     label: 'Aberta' },
  { value: 'closed',   label: 'Fechada' },
  { value: 'finished', label: 'Finalizada' },
]

const statusBadge: Record<string, 'default' | 'secondary' | 'outline'> = {
  open:     'default',
  closed:   'secondary',
  finished: 'outline',
}

export default function AdminRoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [round, setRound] = useState<Round | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  // Edit round form
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ description: '', closing_at: '', status: 'open' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

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
      setEditForm({
        description: data.description ?? '',
        closing_at: data.closing_at ? toDatetimeLocal(data.closing_at) : '',
        status: data.status ?? 'open',
      })
      // Load teams for the championship
      const tRes = await fetch(`/api/championships/${data.championship.id}/teams`)
      if (tRes.ok) setTeams(await tRes.json())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleSaveRound = async () => {
    setEditSaving(true)
    setEditError('')
    const res = await fetch(`/api/rounds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: editForm.description || undefined,
        closing_at: editForm.closing_at ? new Date(editForm.closing_at).toISOString() : undefined,
        status: editForm.status,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setEditError(data.error ?? 'Erro ao salvar'); setEditSaving(false); return }
    setRound(data)
    setShowEdit(false)
    setEditSaving(false)
  }

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
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" className="mt-0.5 shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground truncate">{round?.championship?.name}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Rodada {round?.round_number}</h1>
          {round?.description && (
            <p className="text-sm text-muted-foreground">{round.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Encerra: {round && new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(round.closing_at))}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {round && (
            <Badge variant={statusBadge[round.status] ?? 'default'}>
              {statusOptions.find(s => s.value === round.status)?.label ?? round.status}
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
          </Button>
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

      {/* Edit Round Dialog */}
      <Dialog open={showEdit} onOpenChange={v => { setShowEdit(v); if (!v) setEditError('') }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Rodada {round?.round_number}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                placeholder="Ex: Semifinal, Fase de grupos..."
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data/hora de encerramento</Label>
              <Input
                type="datetime-local"
                value={editForm.closing_at}
                onChange={e => setEditForm(f => ({ ...f, closing_at: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Após esse momento nenhum palpite poderá ser feito.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEdit(false)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={handleSaveRound} disabled={editSaving}>
              {editSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

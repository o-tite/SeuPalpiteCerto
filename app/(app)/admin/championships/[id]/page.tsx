'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ArrowLeft, Plus, Pencil, Trash2, Trophy, Users, ChevronRight, Lock, Clock, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ImageUpload } from '@/components/image-upload'
import { toUtcISOStringFromLocal } from '@/lib/utils'

type Championship = { id: string; name: string; status: string; description?: string }
type Round = { id: string; round_number: number; description?: string; closing_at: string; isOpen: boolean; matches: { count: number }[] }
type Team = { id: string; name: string; logo_url?: string }
type DbUser = { id: string; email: string; nickname?: string; status: string }

export default function ChampionshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [championship, setChampionship] = useState<Championship | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [allUsers, setAllUsers] = useState<DbUser[]>([])
  const [enrolledUsers, setEnrolledUsers] = useState<{ user_id: string }[]>([])
  const [loading, setLoading] = useState(true)

  // Round form
  const [showRound, setShowRound] = useState(false)
  const [editRound, setEditRound] = useState<Round | null>(null)
  const [roundForm, setRoundForm] = useState({ roundNumber: '', description: '', closingAt: '' })
  const [showDatePicker, setShowDatePicker] = useState(false)
  // Team form — criar
  const [showTeam, setShowTeam] = useState(false)
  const [teamForm, setTeamForm] = useState({ name: '', logoUrl: '' })
  // Team form — editar
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [editTeamForm, setEditTeamForm] = useState({ name: '', logoUrl: '' })
  const [editTeamSaving, setEditTeamSaving] = useState(false)
  const [editTeamError, setEditTeamError] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedClosingDate = roundForm.closingAt ? roundForm.closingAt.slice(0, 10) : ''
  const selectedClosingTime = roundForm.closingAt ? roundForm.closingAt.slice(11, 16) : '00:00'
  const selectedClosingAtDate = roundForm.closingAt ? new Date(roundForm.closingAt) : undefined
  const closingAtLabel = roundForm.closingAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(roundForm.closingAt))
    : 'Selecionar data e hora'
  const todayLocalDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  const setClosingDate = (date?: Date) => {
    if (!date) return
    const dateIso = date.toISOString().slice(0, 10)
    setRoundForm(f => ({
      ...f,
      closingAt: `${dateIso}T${f.closingAt?.slice(11, 16) ?? '00:00'}`,
    }))
  }

  const setClosingTime = (time: string) => {
    const dateIso = selectedClosingDate || todayLocalDate
    setRoundForm(f => ({ ...f, closingAt: `${dateIso}T${time}` }))
  }

  const load = async () => {
    const [cRes, rRes, tRes, uRes, eRes] = await Promise.all([
      fetch(`/api/championships/${id}`),
      fetch(`/api/championships/${id}/rounds`),
      fetch(`/api/championships/${id}/teams`),
      fetch(`/api/admin/users`),
      fetch(`/api/championships/${id}/enroll`),
    ])
    if (cRes.ok) setChampionship(await cRes.json())
    if (rRes.ok) setRounds(await rRes.json())
    if (tRes.ok) setTeams(await tRes.json())
    if (uRes.ok) setAllUsers(await uRes.json())
    if (eRes.ok) setEnrolledUsers(await eRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleCreateRound = async () => {
    setSaving(true); setError('')
    const res = await fetch(`/api/championships/${id}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roundNumber: parseInt(roundForm.roundNumber),
        description: roundForm.description,
        closingAt: toUtcISOStringFromLocal(roundForm.closingAt),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShowRound(false); setShowDatePicker(false); setRoundForm({ roundNumber: '', description: '', closingAt: '' }); load(); setSaving(false)
  }

  const handleDeleteRound = async (rid: string) => {
    if (!confirm('Excluir esta rodada?')) return
    await fetch(`/api/rounds/${rid}`, { method: 'DELETE' }); load()
  }

  const handleCreateTeam = async () => {
    setSaving(true); setError('')
    const res = await fetch(`/api/championships/${id}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamForm.name, logoUrl: teamForm.logoUrl }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShowTeam(false); setTeamForm({ name: '', logoUrl: '' }); load(); setSaving(false)
  }

  const openEditTeam = (t: Team) => {
    setEditTeam(t)
    setEditTeamForm({ name: t.name, logoUrl: t.logo_url ?? '' })
    setEditTeamError('')
  }

  const handleSaveTeam = async () => {
    if (!editTeam) return
    setEditTeamSaving(true); setEditTeamError('')
    const res = await fetch(`/api/teams/${editTeam.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editTeamForm.name, logoUrl: editTeamForm.logoUrl }),
    })
    const data = await res.json()
    if (!res.ok) { setEditTeamError(data.error ?? 'Erro ao salvar'); setEditTeamSaving(false); return }
    setEditTeam(null)
    setEditTeamSaving(false)
    load()
  }

  const handleEnrollUser = async (userId: string) => {
    await fetch(`/api/championships/${id}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [userId] }),
    }); load()
  }

  const handleUnenrollUser = async (userId: string) => {
    await fetch(`/api/championships/${id}/enroll?userId=${userId}`, { method: 'DELETE' }); load()
  }

  if (loading) return <div className="h-32 bg-secondary rounded animate-pulse" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{championship?.name}</h1>
          {championship?.description && (
            <p className="text-muted-foreground mt-0.5 text-sm">{championship.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="rounds">
        <TabsList className="bg-secondary">
          <TabsTrigger value="rounds">Rodadas ({rounds.length})</TabsTrigger>
          <TabsTrigger value="teams">Times ({teams.length})</TabsTrigger>
          <TabsTrigger value="participants">Participantes ({enrolledUsers.length})</TabsTrigger>
        </TabsList>

        {/* Rounds */}
        <TabsContent value="rounds" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setShowRound(true); setError('') }}>
              <Plus className="w-4 h-4" /> Nova Rodada
            </Button>
          </div>
          {rounds.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhuma rodada criada</p>
          ) : rounds.map(r => (
            <Card key={r.id} className="border-border">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Rodada {r.round_number}</span>
                    {r.isOpen
                      ? <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Aberta</Badge>
                      : <Badge className="text-xs bg-muted text-muted-foreground">Encerrada</Badge>
                    }
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Fecha: {new Date(r.closing_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/admin/rounds/${r.id}`}>
                      Jogos <ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRound(r.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Teams */}
        <TabsContent value="teams" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setShowTeam(true); setError('') }}>
              <Plus className="w-4 h-4" /> Novo Time
            </Button>
          </div>
          {teams.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum time cadastrado</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {teams.map(t => (
                <Card key={t.id} className="border-border group">
                  <CardContent className="p-3 flex flex-col items-center gap-2 text-center relative">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.name} className="w-12 h-12 object-contain rounded" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center text-xl font-bold text-muted-foreground">
                        {t.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <p className="font-medium text-sm text-foreground leading-tight">{t.name}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1.5 right-1.5 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openEditTeam(t)}
                      aria-label={`Editar ${t.name}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Participants */}
        <TabsContent value="participants" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Adicione ou remova participantes ativos neste campeonato. Somente usuários com status <strong className="text-foreground">Ativo</strong> aparecem na lista.
          </p>
          {allUsers.filter(u => u.status === 'active').length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-10 text-center">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum usuário ativo no sistema ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allUsers.filter(u => u.status === 'active').map(u => {
                const isEnrolled = enrolledUsers.some(e => e.user_id === u.id)
                return (
                  <Card key={u.id} className={`border transition-colors ${isEnrolled ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isEnrolled ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{u.nickname || u.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isEnrolled ? 'destructive' : 'outline'}
                        className="shrink-0"
                        onClick={() => isEnrolled ? handleUnenrollUser(u.id) : handleEnrollUser(u.id)}
                      >
                        {isEnrolled ? 'Remover' : 'Adicionar'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Round dialog */}
      <Dialog open={showRound} onOpenChange={v => { setShowRound(v); if (!v) setShowDatePicker(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Rodada</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label>Número da rodada</Label>
              <Input type="number" min="1" value={roundForm.roundNumber} onChange={e => setRoundForm(f => ({ ...f, roundNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input value={roundForm.description} onChange={e => setRoundForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de fechamento</Label>
              <div className="grid gap-2">
                <div className="sm:hidden">
                  <Input type="datetime-local" value={roundForm.closingAt} onChange={e => setRoundForm(f => ({ ...f, closingAt: e.target.value }))} />
                </div>
                <div className="hidden sm:block">
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between px-4 py-3 text-left">
                        <span className={roundForm.closingAt ? 'text-foreground' : 'text-muted-foreground'}>{closingAtLabel}</span>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" />
                          <Clock className="w-4 h-4" />
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(28rem,100vw)]">
                      <Calendar
                        mode="single"
                        selected={selectedClosingAtDate}
                        onSelect={setClosingDate}
                      />
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          type="time"
                          value={selectedClosingTime}
                          onChange={e => setClosingTime(e.target.value)}
                        />
                        <Button variant="secondary" className="sm:ml-auto" onClick={() => setShowDatePicker(false)}>
                          Feito
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Selecione a data no calendário e ajuste o horário para finalizar.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowRound(false); setShowDatePicker(false) }}>Cancelar</Button>
            <Button onClick={handleCreateRound} disabled={saving || !roundForm.roundNumber || !roundForm.closingAt}>
              {saving ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team dialog */}
      <Dialog open={showTeam} onOpenChange={v => { setShowTeam(v); if (!v) { setTeamForm({ name: '', logoUrl: '' }); setError('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Time</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label>Nome do time</Label>
              <Input value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Flamengo" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Label className="self-start">Escudo do time <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <ImageUpload
                value={teamForm.logoUrl || null}
                onChange={url => setTeamForm(f => ({ ...f, logoUrl: url ?? '' }))}
                folder="teams"
                shape="square"
                size="md"
                placeholder="Escudo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTeam(false)}>Cancelar</Button>
            <Button onClick={handleCreateTeam} disabled={saving || !teamForm.name}>
              {saving ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Team dialog */}
      <Dialog open={!!editTeam} onOpenChange={v => { if (!v) { setEditTeam(null); setEditTeamError('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Time</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {editTeamError && <p className="text-sm text-destructive">{editTeamError}</p>}
            <div className="space-y-1.5">
              <Label>Nome do time</Label>
              <Input
                value={editTeamForm.name}
                onChange={e => setEditTeamForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Flamengo"
              />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Label className="self-start">Escudo do time <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <ImageUpload
                value={editTeamForm.logoUrl || null}
                onChange={url => setEditTeamForm(f => ({ ...f, logoUrl: url ?? '' }))}
                folder="teams"
                shape="square"
                size="md"
                placeholder="Escudo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTeam(null)} disabled={editTeamSaving}>Cancelar</Button>
            <Button onClick={handleSaveTeam} disabled={editTeamSaving || !editTeamForm.name.trim()}>
              {editTeamSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

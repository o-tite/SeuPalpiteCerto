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
import { ArrowLeft, Plus, Pencil, Trash2, Trophy, Users, ChevronRight, Lock, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  // Team form
  const [showTeam, setShowTeam] = useState(false)
  const [teamForm, setTeamForm] = useState({ name: '', logoUrl: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const [cRes, rRes, tRes, uRes] = await Promise.all([
      fetch(`/api/championships/${id}`),
      fetch(`/api/championships/${id}/rounds`),
      fetch(`/api/championships/${id}/teams`),
      fetch(`/api/admin/users`),
    ])
    if (cRes.ok) setChampionship(await cRes.json())
    if (rRes.ok) setRounds(await rRes.json())
    if (tRes.ok) setTeams(await tRes.json())
    if (uRes.ok) setAllUsers(await uRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleCreateRound = async () => {
    setSaving(true); setError('')
    const res = await fetch(`/api/championships/${id}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: parseInt(roundForm.roundNumber), description: roundForm.description, closingAt: roundForm.closingAt }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShowRound(false); setRoundForm({ roundNumber: '', description: '', closingAt: '' }); load(); setSaving(false)
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
          <TabsTrigger value="participants">Participantes</TabsTrigger>
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
                <Card key={t.id} className="border-border">
                  <CardContent className="p-3 text-center">
                    <p className="font-medium text-sm text-foreground">{t.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Participants */}
        <TabsContent value="participants" className="space-y-4 mt-4">
          <div className="space-y-2">
            {allUsers.filter(u => u.status === 'active').map(u => {
              const isEnrolled = enrolledUsers.some(e => e.user_id === u.id)
              return (
                <Card key={u.id} className="border-border">
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground">{u.nickname || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={isEnrolled ? 'destructive' : 'outline'}
                      onClick={() => isEnrolled ? handleUnenrollUser(u.id) : handleEnrollUser(u.id)}
                    >
                      {isEnrolled ? 'Remover' : 'Adicionar'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Round dialog */}
      <Dialog open={showRound} onOpenChange={setShowRound}>
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
              <Input type="datetime-local" value={roundForm.closingAt} onChange={e => setRoundForm(f => ({ ...f, closingAt: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRound(false)}>Cancelar</Button>
            <Button onClick={handleCreateRound} disabled={saving || !roundForm.roundNumber || !roundForm.closingAt}>
              {saving ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team dialog */}
      <Dialog open={showTeam} onOpenChange={setShowTeam}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Time</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label>Nome do time</Label>
              <Input value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Flamengo" />
            </div>
            <div className="space-y-1.5">
              <Label>URL do escudo (opcional)</Label>
              <Input value={teamForm.logoUrl} onChange={e => setTeamForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
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
    </div>
  )
}

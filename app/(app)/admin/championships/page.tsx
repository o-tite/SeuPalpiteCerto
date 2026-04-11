'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Trophy, Plus, Pencil, Trash2, Users, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Championship = {
  id: string
  name: string
  description?: string
  status: string
  rounds: { count: number }[]
  user_championships: { count: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  planning: 'Em planejamento',
  finished: 'Encerrado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  planning: 'bg-accent/10 text-accent border-accent/20',
  finished: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
}

export default function AdminChampionshipsPage() {
  const router = useRouter()
  const [championships, setChampionships] = useState<Championship[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Championship | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Championship | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'active' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const res = await fetch('/api/championships')
    if (res.ok) setChampionships(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/championships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShowCreate(false)
    setForm({ name: '', description: '', status: 'active' })
    load()
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/championships/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setEditTarget(null)
    load()
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    await fetch(`/api/championships/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    setSaving(false)
    load()
  }

  const openEdit = (c: Championship) => {
    setForm({ name: c.name, description: c.description ?? '', status: c.status })
    setEditTarget(c)
    setError('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campeonatos</h1>
          <p className="text-muted-foreground mt-1">Gerencie campeonatos, rodadas e times</p>
        </div>
        <Button onClick={() => { setForm({ name: '', description: '', status: 'active' }); setShowCreate(true); setError('') }} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-secondary rounded-lg animate-pulse" />)}
        </div>
      ) : championships.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <Trophy className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum campeonato criado ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {championships.map(c => (
            <Card key={c.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{c.name}</span>
                      <Badge className={`text-xs border ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>
                    )}
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-xs text-muted-foreground">{c.rounds?.[0]?.count ?? 0} rodadas</span>
                      <span className="text-xs text-muted-foreground">{c.user_championships?.[0]?.count ?? 0} participantes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs"
                      onClick={() => router.push(`/admin/championships/${c.id}`)}
                    >
                      Gerenciar <ChevronRight className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || editTarget !== null} onOpenChange={() => { setShowCreate(false); setEditTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar campeonato' : 'Novo campeonato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do campeonato" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição opcional" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Em planejamento</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="finished">Encerrado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setEditTarget(null) }}>Cancelar</Button>
            <Button onClick={editTarget ? handleEdit : handleCreate} disabled={saving || !form.name}>
              {saving ? 'Salvando...' : editTarget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir campeonato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong className="text-foreground">{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

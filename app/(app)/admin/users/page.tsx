'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { CheckCircle, Search, Shield, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type AppUser = {
  id: string
  email: string
  nickname?: string
  status: 'pending' | 'active' | 'inactive' | 'blocked'
  role: 'user' | 'admin'
  photo_url?: string
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  active: 'Ativo',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-accent/10 text-accent border-accent/20',
  active: 'bg-primary/10 text-primary border-primary/20',
  inactive: 'bg-muted text-muted-foreground',
  blocked: 'bg-destructive/10 text-destructive border-destructive/20',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : [])
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  const handleUpdate = async (userId: string, updates: { status?: string; role?: string }) => {
    setSaving(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u))
        setSaved(userId)
        setTimeout(() => setSaved(null), 2000)
      }
    } finally {
      setSaving(null)
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      (u.nickname ?? '').toLowerCase().includes(q)
    )
  })

  const pending = filtered.filter(u => u.status === 'pending')
  const others = filtered.filter(u => u.status !== 'pending')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie contas e permissões</p>
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <h2 className="text-sm font-semibold text-foreground">Aguardando aprovação ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map(u => (
              <UserRow key={u.id} user={u} onUpdate={handleUpdate} saving={saving === u.id} saved={saved === u.id} />
            ))}
          </div>
        </div>
      )}

      {/* All users */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Todos os usuários ({others.length})
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />)}
          </div>
        ) : others.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum usuário encontrado
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {others.map(u => (
              <UserRow key={u.id} user={u} onUpdate={handleUpdate} saving={saving === u.id} saved={saved === u.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserRow({
  user,
  onUpdate,
  saving,
  saved,
}: {
  user: AppUser
  onUpdate: (id: string, updates: Record<string, string>) => void
  saving: boolean
  saved: boolean
}) {
  const initials = (user.nickname || user.email).slice(0, 2).toUpperCase()

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* User info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={user.photo_url ?? undefined} />
              <AvatarFallback className="bg-secondary text-foreground text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{user.nickname || '(sem apelido)'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <Badge className={`text-xs border ${STATUS_COLORS[user.status]}`}>
                {STATUS_LABELS[user.status]}
              </Badge>
              {user.role === 'admin' && (
                <Badge className="text-xs bg-accent/10 text-accent border-accent/20">
                  <Shield className="w-3 h-3 mr-1" />Admin
                </Badge>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={user.status}
              onValueChange={(v) => onUpdate(user.id, { status: v })}
              disabled={saving}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={user.role}
              onValueChange={(v) => onUpdate(user.id, { role: v })}
              disabled={saving}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Participante</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>

            {saved && (
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

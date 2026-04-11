'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function ProfilePage() {
  const { user, refresh } = useAuth()
  const [nickname, setNickname] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setNickname(user.nickname ?? '')
      setPhotoUrl(user.photo_url ?? '')
    }
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, photoUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      setSuccess(true)
      await refresh()
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  const initials = user?.nickname?.slice(0, 2).toUpperCase() ?? '??'

  const roleLabel: Record<string, string> = { admin: 'Administrador', user: 'Participante' }
  const statusLabel: Record<string, string> = {
    active: 'Ativo',
    pending: 'Pendente',
    inactive: 'Inativo',
    blocked: 'Bloqueado',
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Atualize seu apelido e foto de perfil</p>
      </div>

      {/* Profile card */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={photoUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-bold text-foreground">{user?.nickname}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-2 mt-1.5">
                <Badge className="text-xs bg-secondary text-foreground border-border">
                  {roleLabel[user?.role ?? 'user']}
                </Badge>
                <Badge className={`text-xs border ${
                  user?.status === 'active'
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {statusLabel[user?.status ?? 'pending']}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Editar informações</CardTitle>
          <CardDescription>Atualize seu apelido e URL da foto de perfil</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Perfil atualizado com sucesso!
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="nickname">Apelido</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Seu apelido no bolão"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photoUrl">URL da foto de perfil</Label>
              <Input
                id="photoUrl"
                type="url"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

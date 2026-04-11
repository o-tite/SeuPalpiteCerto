'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type AuditLog = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  changes?: Record<string, unknown>
  ip_address?: string
  created_at: string
  user?: { id: string; nickname?: string; email: string } | null
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

const ACTION_COLORS: Record<string, string> = {
  USER_REGISTERED: 'bg-primary/10 text-primary border-primary/20',
  USER_LOGIN: 'bg-secondary text-muted-foreground',
  USER_STATUS_CHANGED: 'bg-accent/10 text-accent border-accent/20',
  CHAMPIONSHIP_CREATED: 'bg-primary/10 text-primary border-primary/20',
  CHAMPIONSHIP_UPDATED: 'bg-accent/10 text-accent border-accent/20',
  CHAMPIONSHIP_DELETED: 'bg-destructive/10 text-destructive border-destructive/20',
  ROUND_CREATED: 'bg-primary/10 text-primary border-primary/20',
  ROUND_DELETED: 'bg-destructive/10 text-destructive border-destructive/20',
  MATCH_CREATED: 'bg-primary/10 text-primary border-primary/20',
  RESULT_ENTERED: 'bg-accent/10 text-accent border-accent/20',
  BETS_SAVED: 'bg-secondary text-muted-foreground',
  PROFILE_UPDATED: 'bg-secondary text-muted-foreground',
}

const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: 'Cadastro',
  USER_LOGIN: 'Login',
  USER_STATUS_CHANGED: 'Status alterado',
  CHAMPIONSHIP_CREATED: 'Campeonato criado',
  CHAMPIONSHIP_UPDATED: 'Campeonato editado',
  CHAMPIONSHIP_DELETED: 'Campeonato excluído',
  ROUND_CREATED: 'Rodada criada',
  ROUND_UPDATED: 'Rodada editada',
  ROUND_DELETED: 'Rodada excluída',
  MATCH_CREATED: 'Jogo criado',
  RESULT_ENTERED: 'Resultado registrado',
  BETS_SAVED: 'Palpites salvos',
  PROFILE_UPDATED: 'Perfil atualizado',
}

const ENTITY_TYPES = ['', 'users', 'championships', 'rounds', 'matches', 'results', 'bets']

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [entityType, setEntityType] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const load = async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (entityType) params.append('entityType', entityType)
    const res = await fetch(`/api/admin/audit?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs ?? [])
      setPagination(data.pagination)
    }
    setLoading(false)
  }

  useEffect(() => { load(1) }, [entityType])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
          <p className="text-muted-foreground mt-1">Registro de todas as ações do sistema</p>
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="users">Usuários</SelectItem>
            <SelectItem value="championships">Campeonatos</SelectItem>
            <SelectItem value="rounds">Rodadas</SelectItem>
            <SelectItem value="matches">Jogos</SelectItem>
            <SelectItem value="results">Resultados</SelectItem>
            <SelectItem value="bets">Palpites</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="w-4 h-4" />
        <span>{pagination.total} registros no total</span>
      </div>

      {/* Logs list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-secondary rounded animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <Activity className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum registro encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {logs.map(log => {
            const isExpanded = expandedLog === log.id
            const hasChanges = log.changes && Object.keys(log.changes).length > 0

            return (
              <div key={log.id}>
                <Card
                  className={cn(
                    'border-border',
                    hasChanges && 'cursor-pointer hover:border-border/80',
                    isExpanded && 'rounded-b-none border-b-0'
                  )}
                  onClick={() => hasChanges && setExpandedLog(isExpanded ? null : log.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Badge className={cn('text-xs border shrink-0 w-fit', ACTION_COLORS[log.action] ?? 'bg-secondary text-muted-foreground')}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground font-medium">
                          {log.user?.nickname ?? log.user?.email ?? 'Sistema'}
                        </span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {log.entity_type}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(log.created_at), { locale: ptBR, addSuffix: true })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {isExpanded && log.changes && (
                  <Card className="border-border rounded-t-none border-t-0">
                    <CardContent className="px-3 pb-3 pt-0">
                      <div className="border-t border-border pt-2">
                        <pre className="text-xs text-muted-foreground overflow-auto max-h-40 bg-background rounded p-2">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground mt-1">IP: {log.ip_address}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => load(pagination.page - 1)}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => load(pagination.page + 1)}
            className="gap-1"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

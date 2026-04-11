'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Target, ChevronRight, Clock, Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Championship = {
  id: string
  name: string
  status: string
  description?: string
  rounds: { count: number }[]
}

type Round = {
  id: string
  round_number: number
  description?: string
  closing_at: string
  isOpen: boolean
  championship_id: string
  championship?: { id: string; name: string }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [championships, setChampionships] = useState<Championship[]>([])
  const [openRounds, setOpenRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/championships')
        if (res.ok) {
          const data = await res.json()
          setChampionships(data)

          // Fetch open rounds for each championship
          const roundsPromises = data.map((c: Championship) =>
            fetch(`/api/championships/${c.id}/rounds`).then(r => r.ok ? r.json() : [])
          )
          const allRounds = await Promise.all(roundsPromises)
          const flat: Round[] = allRounds.flat().map((r: Round, i: number) => ({
            ...r,
            championship: { id: data[Math.floor(i / 10)]?.id, name: data[Math.floor(i / 10)]?.name },
          }))
          setOpenRounds(flat.filter((r: Round) => r.isOpen).slice(0, 6))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusLabel: Record<string, string> = {
    active: 'Ativo',
    planning: 'Em planejamento',
    finished: 'Encerrado',
    cancelled: 'Cancelado',
  }

  const statusColor: Record<string, string> = {
    active: 'bg-primary/10 text-primary border-primary/20',
    planning: 'bg-accent/10 text-accent border-accent/20',
    finished: 'bg-muted text-muted-foreground border-border',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">
          Olá, {user?.nickname || 'participante'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Veja os campeonatos e rodadas abertas para palpites
        </p>
      </div>

      {/* Open rounds */}
      {openRounds.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Rodadas abertas
            </h2>
            <Link href="/bets">
              <Button variant="ghost" size="sm" className="text-primary gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {openRounds.map((round) => (
              <Link key={round.id} href={`/bets?roundId=${round.id}`}>
                <Card className="border-border hover:border-primary/40 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{round.championship?.name}</p>
                        <p className="font-semibold text-foreground mt-0.5">
                          Rodada {round.round_number}
                        </p>
                        {round.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{round.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-primary ml-2">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Fecha {formatDistanceToNow(new Date(round.closing_at), { locale: ptBR, addSuffix: true })}
                      </span>
                      <span className="text-xs font-medium text-primary group-hover:underline">
                        Palpitar
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Championships */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Meus campeonatos
          </h2>
          {user?.role === 'admin' && (
            <Link href="/admin/championships">
              <Button variant="ghost" size="sm" className="text-primary gap-1">
                Gerenciar <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          )}
        </div>

        {championships.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground/30" />
              <div>
                <p className="font-medium text-foreground">Nenhum campeonato disponível</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aguarde ser adicionado a um campeonato
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {championships.map((c) => (
              <Card key={c.id} className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-foreground line-clamp-2">{c.name}</CardTitle>
                    <Badge className={`text-xs shrink-0 border ${statusColor[c.status] ?? statusColor.active}`}>
                      {statusLabel[c.status] ?? c.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {c.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {c.rounds?.[0]?.count ?? 0} rodadas
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/bets?championshipId=${c.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs gap-1 text-primary h-7">
                          <Target className="w-3 h-3" /> Palpites
                        </Button>
                      </Link>
                      <Link href={`/ranking?championshipId=${c.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs gap-1 h-7">
                          Ranking
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

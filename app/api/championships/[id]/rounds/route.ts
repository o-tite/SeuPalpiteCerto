import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error: dbError } = await supabase
    .from('rounds')
    .select(`*, matches(count)`)
    .eq('championship_id', id)
    .order('round_number', { ascending: true })

  if (dbError) return apiError(dbError.message, 500)

  // Determine open/closed status based on closing_at
  const rounds = (data ?? []).map((r: { closing_at: string; status: string; [key: string]: unknown }) => ({
    ...r,
    isOpen: new Date(r.closing_at) > new Date(now),
  }))

  return apiSuccess(rounds)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { roundNumber, description, closingAt } = body
    if (!roundNumber || !closingAt) return apiError('Número e data de fechamento são obrigatórios')

    const supabase = await createClient()
    const { data, error: dbError } = await supabase
      .from('rounds')
      .insert({
        championship_id: id,
        round_number: roundNumber,
        description,
        closing_at: closingAt,
        status: 'open',
      })
      .select()
      .single()

    if (dbError) {
      if (dbError.message.includes('unique')) return apiError('Já existe uma rodada com esse número neste campeonato', 409)
      return apiError(dbError.message, 500)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'ROUND_CREATED',
      entityType: 'rounds',
      entityId: data.id,
      changes: { championship_id: id, roundNumber, closingAt },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess(data, 201)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

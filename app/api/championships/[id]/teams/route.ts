import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth()
  if (error) return error
  const { id } = await params

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from('teams')
    .select('*')
    .eq('championship_id', id)
    .order('name')

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { name, logoUrl } = body
    if (!name) return apiError('Nome do time é obrigatório')

    const supabase = await createClient()
    const { data, error: dbError } = await supabase
      .from('teams')
      .insert({ name, championship_id: id, logo_url: logoUrl })
      .select()
      .single()

    if (dbError) {
      if (dbError.message.includes('unique')) return apiError('Já existe um time com esse nome neste campeonato', 409)
      return apiError(dbError.message, 500)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'TEAM_CREATED',
      entityType: 'teams',
      entityId: data.id,
      changes: { name, championship_id: id },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess(data, 201)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

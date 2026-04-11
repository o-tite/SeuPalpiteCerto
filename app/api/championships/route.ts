import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()

  let query = supabase
    .from('championships')
    .select(`
      *,
      created_by_user:users!championships_created_by_fkey(id, nickname, email),
      rounds(count),
      user_championships(count)
    `)
    .order('created_at', { ascending: false })

  // Non-admins only see championships they're enrolled in
  if (user!.role !== 'admin') {
    const { data: enrolled } = await supabase
      .from('user_championships')
      .select('championship_id')
      .eq('user_id', user!.id)
    const ids = (enrolled ?? []).map((e: { championship_id: string }) => e.championship_id)
    if (ids.length === 0) return apiSuccess([])
    query = query.in('id', ids)
  }

  const { data, error: dbError } = await query
  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data)
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { name, description, status } = body
    if (!name) return apiError('Nome é obrigatório')

    const supabase = await createClient()
    const { data, error: dbError } = await supabase
      .from('championships')
      .insert({ name, description, status: status || 'active', created_by: user!.id })
      .select()
      .single()

    if (dbError) return apiError(dbError.message, 500)

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'CHAMPIONSHIP_CREATED',
      entityType: 'championships',
      entityId: data.id,
      changes: { name, description, status },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess(data, 201)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

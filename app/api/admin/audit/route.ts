import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAdmin } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url = new URL(request.url)
  const entityType = url.searchParams.get('entityType')
  const userId = url.searchParams.get('userId')
  const page = parseInt(url.searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100)
  const offset = (page - 1) * limit

  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      user:users(id, nickname, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (entityType) query = query.eq('entity_type', entityType)
  if (userId) query = query.eq('user_id', userId)

  const { data, error: dbError, count } = await query
  if (dbError) return apiError(dbError.message, 500)

  return apiSuccess({
    logs: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}

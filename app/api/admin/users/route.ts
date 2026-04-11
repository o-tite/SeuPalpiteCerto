import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()
  const { data, error: dbError } = await supabase
    .from('users')
    .select('id, email, nickname, status, role, photo_url, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data)
}

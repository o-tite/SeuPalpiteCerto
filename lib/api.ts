import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

export async function getDbUser(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) return { user: null, error: apiError('Não autorizado', 401) }
  const dbUser = await getDbUser(user.id)
  if (!dbUser) return { user: null, error: apiError('Usuário não encontrado', 404) }
  if (dbUser.status !== 'active') return { user: null, error: apiError('Conta inativa ou pendente de aprovação', 403) }
  return { user: dbUser, error: null }
}

export async function requireAdmin() {
  const { user, error } = await requireAuth()
  if (error) return { user: null, error }
  if (user!.role !== 'admin') return { user: null, error: apiError('Acesso negado — apenas administradores', 403) }
  return { user, error: null }
}

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  changes,
  ipAddress,
  userAgent,
}: {
  userId: string | null
  action: string
  entityType: string
  entityId: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}) {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes: changes ?? null,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  })
}

export function getRequestMeta(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  return { ip, userAgent }
}

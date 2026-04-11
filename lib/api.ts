import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

const SESSION_COOKIE = 'bolao_session'
const SESSION_TTL_HOURS = 24 * 7 // 7 days

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

export async function getAuthUser() {
  const token = await getSessionToken()
  if (!token) return null

  const supabase = createServiceClient()
  const { data: session } = await supabase
    .from('user_sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single()

  if (!session) return null
  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('user_sessions').delete().eq('token', token)
    return null
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .single()

  return user ?? null
}

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) return { user: null, error: apiError('Não autorizado', 401) }
  if (user.status !== 'active') return { user: null, error: apiError('Conta inativa ou pendente de aprovação', 403) }
  return { user, error: null }
}

export async function requireAdmin() {
  const { user, error } = await requireAuth()
  if (error) return { user: null, error }
  if (user!.role !== 'admin') return { user: null, error: apiError('Acesso negado — apenas administradores', 403) }
  return { user, error: null }
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * SESSION_TTL_HOURS,
    path: '/',
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
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
  const supabase = createServiceClient()
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

export function getRequestMeta(request: NextRequest | Request) {
  const ip =
    (request.headers as Headers).get('x-forwarded-for')?.split(',')[0] ??
    (request.headers as Headers).get('x-real-ip') ??
    'unknown'
  const userAgent = (request.headers as Headers).get('user-agent') ?? 'unknown'
  return { ip, userAgent }
}

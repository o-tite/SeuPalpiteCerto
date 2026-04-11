import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, setSessionCookie, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return apiError('Email e senha são obrigatórios')
    }

    const supabase = createServiceClient()

    // Find user by email
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!user) {
      return apiError('Email ou senha inválidos', 401)
    }

    if (user.status === 'pending') {
      return apiError('Sua conta está pendente de aprovação pelo administrador', 403)
    }
    if (user.status === 'blocked' || user.status === 'inactive') {
      return apiError('Sua conta está bloqueada ou inativa', 403)
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return apiError('Email ou senha inválidos', 401)
    }

    // Enforce single session per user: delete existing session
    await supabase.from('user_sessions').delete().eq('user_id', user.id)

    // Create new session token
    const token = crypto.randomBytes(48).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const { error: sessionError } = await supabase.from('user_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })

    if (sessionError) {
      return apiError('Erro ao criar sessão', 500)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'users',
      entityId: user.id,
      ipAddress: ip,
      userAgent,
    })

    const response = apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        status: user.status,
        photo_url: user.photo_url,
      },
    }) as NextResponse

    setSessionCookie(response, token)
    return response
  } catch (err) {
    console.error('[v0] Login error:', err)
    return apiError('Erro interno do servidor', 500)
  }
}

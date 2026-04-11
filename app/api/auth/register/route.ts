import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nickname } = body

    if (!email || !password) {
      return apiError('Email e senha são obrigatórios')
    }
    if (password.length < 6) {
      return apiError('Senha deve ter pelo menos 6 caracteres')
    }

    const supabase = await createClient()

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${request.nextUrl.origin}/auth/callback`,
        data: { nickname },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return apiError('Email já cadastrado', 409)
      }
      return apiError(authError.message, 400)
    }

    if (!authData.user) {
      return apiError('Erro ao criar usuário', 500)
    }

    // Create user record in public.users table
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      nickname: nickname || email.split('@')[0],
      password_hash: 'supabase_auth', // managed by Supabase Auth
      status: 'pending',
      role: 'user',
    })

    if (dbError) {
      return apiError('Erro ao criar perfil do usuário: ' + dbError.message, 500)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: authData.user.id,
      action: 'USER_REGISTERED',
      entityType: 'users',
      entityId: authData.user.id,
      changes: { email, nickname },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess({
      message: 'Cadastro realizado! Aguarde aprovação do administrador.',
      userId: authData.user.id,
    }, 201)
  } catch (err) {
    return apiError('Erro interno do servidor', 500)
  }
}

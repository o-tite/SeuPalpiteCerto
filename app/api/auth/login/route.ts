import { createClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return apiError('Email e senha são obrigatórios')
    }

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return apiError('Email ou senha inválidos', 401)
    }

    if (!authData.user) {
      return apiError('Erro ao autenticar', 500)
    }

    // Check user status in our table
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (!dbUser) {
      await supabase.auth.signOut()
      return apiError('Usuário não encontrado', 404)
    }

    if (dbUser.status === 'pending') {
      await supabase.auth.signOut()
      return apiError('Sua conta está pendente de aprovação pelo administrador', 403)
    }

    if (dbUser.status === 'blocked' || dbUser.status === 'inactive') {
      await supabase.auth.signOut()
      return apiError('Sua conta está bloqueada ou inativa', 403)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: dbUser.id,
      action: 'USER_LOGIN',
      entityType: 'users',
      entityId: dbUser.id,
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        nickname: dbUser.nickname,
        role: dbUser.role,
        status: dbUser.status,
        photoUrl: dbUser.photo_url,
      },
    })
  } catch (err) {
    return apiError('Erro interno do servidor', 500)
  }
}

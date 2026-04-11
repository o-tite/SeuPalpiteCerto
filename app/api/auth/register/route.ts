import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

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

    const supabase = createServiceClient()

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return apiError('Email já cadastrado', 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        nickname: nickname?.trim() || email.split('@')[0],
        password_hash: passwordHash,
        status: 'pending',
        role: 'user',
      })
      .select('id, email')
      .single()

    if (dbError || !newUser) {
      return apiError('Erro ao criar usuário: ' + (dbError?.message ?? 'desconhecido'), 500)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'users',
      entityId: newUser.id,
      changes: { email: newUser.email, nickname },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess({
      message: 'Cadastro realizado! Aguarde aprovação do administrador.',
    }, 201)
  } catch (err) {
    console.error('[v0] Register error:', err)
    return apiError('Erro interno do servidor', 500)
  }
}

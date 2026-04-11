import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAdmin, createAuditLog, getRequestMeta } from '@/lib/api'
import { NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const { name, logoUrl } = body
    if (!name || !name.trim()) return apiError('Nome do time é obrigatório')

    const supabase = createServiceClient()
    const { data, error: dbError } = await supabase
      .from('teams')
      .update({ name: name.trim(), logo_url: logoUrl ?? null })
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      if (dbError.message.includes('unique')) return apiError('Já existe um time com esse nome neste campeonato', 409)
      return apiError(dbError.message, 500)
    }

    const { ip, userAgent } = getRequestMeta(request)
    await createAuditLog({
      userId: user!.id,
      action: 'TEAM_UPDATED',
      entityType: 'teams',
      entityId: id,
      changes: { name, logoUrl },
      ipAddress: ip,
      userAgent,
    })

    return apiSuccess(data)
  } catch {
    return apiError('Erro interno do servidor', 500)
  }
}

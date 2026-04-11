import { createServiceClient } from '@/lib/supabase/server'
import { apiSuccess, clearSessionCookie, getSessionToken } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function POST() {
  const token = await getSessionToken()
  if (token) {
    const supabase = createServiceClient()
    await supabase.from('user_sessions').delete().eq('token', token)
  }

  const response = apiSuccess({ message: 'Sessão encerrada' }) as NextResponse
  clearSessionCookie(response)
  return response
}

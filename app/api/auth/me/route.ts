import { apiError, apiSuccess, requireAuth } from '@/lib/api'

export async function GET() {
  const { user, error } = await requireAuth()
  if (error) return error
  return apiSuccess({ user })
}

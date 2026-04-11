import { apiError, apiSuccess, getAuthUser } from '@/lib/api'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return apiError('Não autorizado', 401)
  return apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      status: user.status,
      photo_url: user.photo_url,
    },
  })
}

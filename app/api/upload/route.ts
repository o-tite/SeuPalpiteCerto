import { put } from '@vercel/blob'
import { NextRequest } from 'next/server'
import { apiError, apiSuccess, requireAuth } from '@/lib/api'

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) return apiError('Nenhum arquivo enviado')

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) return apiError('Formato inválido. Use JPG, PNG, WEBP ou GIF.')
    if (file.size > 5 * 1024 * 1024) return apiError('Arquivo muito grande. Máximo: 5MB.')

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const blob = await put(filename, file, { access: 'public' })

    return apiSuccess({ url: blob.url })
  } catch (err) {
    console.error('[upload]', err)
    return apiError('Falha ao fazer upload', 500)
  }
}

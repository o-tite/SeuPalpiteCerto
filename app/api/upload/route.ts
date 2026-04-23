import { createServiceClient } from '@/lib/supabase/server'
import { apiError, apiSuccess, requireAuth } from '@/lib/api'
import { NextRequest } from 'next/server'

const BUCKET = 'images'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) return apiError('Nenhum arquivo enviado')
    if (!ALLOWED_TYPES.includes(file.type)) return apiError('Formato inválido. Use JPG, PNG, WEBP ou GIF.')
    if (file.size > MAX_SIZE_BYTES) return apiError('Arquivo muito grande. Máximo: 5MB.')

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = await file.arrayBuffer()

    const supabase = createServiceClient()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[upload]', uploadError)
      return apiError('Falha ao fazer upload', 500)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)

    return apiSuccess({ url: data.publicUrl })
  } catch (err) {
    console.error('[upload]', err)
    return apiError('Falha ao fazer upload', 500)
  }
}

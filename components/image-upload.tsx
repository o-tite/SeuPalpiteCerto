'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Camera, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
  shape?: 'square' | 'circle'
  placeholder?: string
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { container: 'w-16 h-16', icon: 'w-6 h-6', text: 'text-xs' },
  md: { container: 'w-24 h-24', icon: 'w-8 h-8', text: 'text-xs' },
  lg: { container: 'w-32 h-32', icon: 'w-10 h-10', text: 'text-sm' },
}

export function ImageUpload({
  value,
  onChange,
  folder = 'uploads',
  shape = 'square',
  placeholder = 'Carregar imagem',
  className,
  disabled,
  size = 'md',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const s = sizes[size]

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Falha no upload')
        return
      }
      onChange(json.url)
    } catch {
      setError('Erro de conexão')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative group">
        {/* Hidden file input — opens native library picker */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture={false as unknown as string}
          className="sr-only"
          onChange={handleChange}
          disabled={disabled || uploading}
          aria-label={placeholder}
        />

        {/* Preview area */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(
            'relative overflow-hidden border-2 border-dashed border-border bg-secondary',
            'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
            s.container,
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {value ? (
            <Image
              src={value}
              alt="Imagem selecionada"
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1 px-2">
              {uploading ? (
                <Spinner className={s.icon} />
              ) : (
                <Upload className={cn(s.icon, 'text-muted-foreground')} />
              )}
              <span className={cn('text-muted-foreground text-center leading-tight', s.text)}>
                {uploading ? 'Enviando...' : placeholder}
              </span>
            </div>
          )}

          {/* Hover overlay when there's already an image */}
          {value && !uploading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}

          {/* Loading overlay */}
          {uploading && value && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Spinner className="w-6 h-6 text-white" />
            </div>
          )}
        </button>

        {/* Remove button */}
        {value && !uploading && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-md hover:opacity-90 transition-opacity"
            aria-label="Remover imagem"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive text-center max-w-[120px]">{error}</p>
      )}

      {value && !disabled && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Trocar imagem
        </Button>
      )}
    </div>
  )
}

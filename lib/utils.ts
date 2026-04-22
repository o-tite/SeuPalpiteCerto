import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toDatetimeLocal(value: string | Date | undefined | null) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function toUtcISOStringFromLocal(localDateTime: string) {
  if (!localDateTime) return ''
  return new Date(localDateTime).toISOString()
}

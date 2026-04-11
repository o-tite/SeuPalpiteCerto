import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Erro de autenticação</h1>
        <p className="text-sm text-muted-foreground">
          Ocorreu um problema durante a autenticação. Por favor, tente novamente.
        </p>
        <Link href="/login">
          <Button className="w-full">Voltar para o login</Button>
        </Link>
      </div>
    </div>
  )
}

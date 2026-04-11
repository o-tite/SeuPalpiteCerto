import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[v0] Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.')
  process.exit(1)
}

// ─── EDITE AQUI ──────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@bolao.app'
const ADMIN_PASSWORD = 'Admin@123456'
const ADMIN_NICKNAME = 'Super Admin'
// ─────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seedAdmin() {
  try {
    console.log('[v0] Verificando se o admin já existe...')

    const { data: existing } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle()

    if (existing) {
      console.log(`[v0] Usuário já existe: ${existing.email} (role: ${existing.role})`)
      
      if (existing.role !== 'admin') {
        const { error } = await supabase
          .from('users')
          .update({ role: 'admin', status: 'active' })
          .eq('id', existing.id)
        if (error) throw error
        console.log('[v0] Role atualizado para admin com sucesso!')
      } else {
        console.log('[v0] Usuário já é admin. Nenhuma alteração necessária.')
      }
      return
    }

    console.log('[v0] Criando hash da senha...')
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

    console.log('[v0] Inserindo admin no banco...')
    const { data, error } = await supabase
      .from('users')
      .insert({
        email:         ADMIN_EMAIL,
        nickname:      ADMIN_NICKNAME,
        password_hash: passwordHash,
        role:          'admin',
        status:        'active',
      })
      .select('id, email, nickname, role, status')
      .single()

    if (error) throw error

    console.log('\n[v0] ✓ Super Admin criado com sucesso!')
    console.log('─────────────────────────────────────')
    console.log(`  Email   : ${data.email}`)
    console.log(`  Apelido : ${data.nickname}`)
    console.log(`  Role    : ${data.role}`)
    console.log(`  Status  : ${data.status}`)
    console.log(`  ID      : ${data.id}`)
    console.log('─────────────────────────────────────')
    console.log(`  Senha   : ${ADMIN_PASSWORD}`)
    console.log('\n[v0] Acesse /login com as credenciais acima.')

  } catch (err) {
    console.error('[v0] Erro ao criar admin:', err.message)
    process.exit(1)
  }
}

seedAdmin()

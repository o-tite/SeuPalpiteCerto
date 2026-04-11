import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[v0] Variáveis de ambiente não encontradas.')
  process.exit(1)
}

const EMAIL    = 'thiago@bolao.app'
const PASSWORD = 'Thiago@123456'
const NICKNAME = 'Thiago Henrique'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seed() {
  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', EMAIL)
      .maybeSingle()

    if (existing) {
      console.log(`[v0] Usuário já existe: ${existing.email} (role: ${existing.role})`)
      if (existing.role !== 'admin') {
        await supabase.from('users').update({ role: 'admin', status: 'active' }).eq('id', existing.id)
        console.log('[v0] Role promovido para admin.')
      }
      return
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 12)

    const { data, error } = await supabase
      .from('users')
      .insert({
        email:         EMAIL,
        nickname:      NICKNAME,
        password_hash: passwordHash,
        role:          'admin',
        status:        'active',
      })
      .select('id, email, nickname, role, status')
      .single()

    if (error) throw error

    console.log('\n[v0] Usuario criado com sucesso!')
    console.log('─────────────────────────────────────')
    console.log(`  Nome    : ${data.nickname}`)
    console.log(`  Email   : ${data.email}`)
    console.log(`  Senha   : ${PASSWORD}`)
    console.log(`  Role    : ${data.role}`)
    console.log(`  ID      : ${data.id}`)
    console.log('─────────────────────────────────────')
  } catch (err) {
    console.error('[v0] Erro:', err.message)
    process.exit(1)
  }
}

seed()

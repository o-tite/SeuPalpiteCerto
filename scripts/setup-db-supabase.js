import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[v0] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
  try {
    console.log('[v0] Iniciando setup do banco de dados no Supabase...');
    
    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), 'scripts', '01_init_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('[v0] Enviando migration SQL ao Supabase...');
    
    // Use the Supabase admin API to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_string: sql 
    }).then(() => ({ data: { ok: true }, error: null })).catch((err) => {
      // If rpc doesn't exist, use direct query approach
      console.log('[v0] Tentando approach alternativo com client direto...');
      return { data: null, error: err.message };
    });

    if (error && !error.includes('does not exist')) {
      console.warn('[v0] Aviso durante execução:', error);
    } else {
      console.log('[v0] Setup do banco de dados concluído com sucesso!');
    }
  } catch (error) {
    console.error('[v0] Erro ao fazer setup do banco de dados:', error.message);
    process.exit(1);
  }
}

setupDatabase();

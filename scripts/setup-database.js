import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

// Parse Supabase connection string
const DB_URL = process.env.POSTGRES_URL;

if (!DB_URL) {
  console.error('Missing POSTGRES_URL environment variable');
  process.exit(1);
}

async function setupDatabase() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('[v0] Conectando ao banco de dados...');
    await client.connect();
    console.log('[v0] Conectado com sucesso!');

    console.log('[v0] Iniciando setup do schema...');
    
    // Read and execute the SQL migration
    const sqlPath = path.join(process.cwd(), 'scripts', '01_init_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Execute all statements
    console.log('[v0] Executando migrations...');
    await client.query(sql);
    
    console.log('[v0] Setup do banco de dados concluído com sucesso!');
  } catch (error) {
    console.error('[v0] Erro ao fazer setup do banco de dados:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();

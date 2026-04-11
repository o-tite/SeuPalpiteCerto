import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error('[v0] Missing POSTGRES_URL');
  process.exit(1);
}

async function runMigrations() {
  const client = new Client({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('[v0] Conectando ao banco de dados...');
    await client.connect();
    console.log('[v0] Conectado!');

    const sqlPath = path.join(__dirname, '01_init_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('[v0] Executando migrations...');
    await client.query(sql);

    console.log('[v0] ✓ Banco de dados configurado com sucesso!');
  } catch (error) {
    console.error('[v0] Erro:', error.message);
    if (error.detail) console.error('[v0] Detalhes:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

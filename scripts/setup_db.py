#!/usr/bin/env python3
import os
import psycopg2
from psycopg2 import sql

# Get connection string from environment
db_url = os.getenv('POSTGRES_URL')

if not db_url:
    print('[v0] Erro: POSTGRES_URL não configurada')
    exit(1)

try:
    print('[v0] Conectando ao banco de dados...')
    conn = psycopg2.connect(db_url, sslmode='require')
    cursor = conn.cursor()
    print('[v0] Conectado com sucesso!')
    
    # Read SQL migration file
    with open('scripts/01_init_schema.sql', 'r') as f:
        sql_content = f.read()
    
    print('[v0] Executando migrations...')
    cursor.execute(sql_content)
    conn.commit()
    print('[v0] Setup do banco de dados concluído!')
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f'[v0] Erro: {str(e)}')
    exit(1)

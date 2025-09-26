import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use standard DATABASE_URL from Render (much simpler!)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });

// Função para aguardar BD estar pronto com retry exponencial
export async function waitForDb(): Promise<void> {
  const maxRetries = 10;
  const baseDelay = 1000; // 1 segundo
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Tentativa ${attempt}/${maxRetries}: Verificando conexão com BD...`);
      await pool.query('SELECT 1');
      console.log('✅ BD conectado com sucesso!');
      return;
    } catch (error) {
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(`⚠️ BD não disponível (tentativa ${attempt}/${maxRetries}):`, error instanceof Error ? error.message : error);
      
      if (attempt === maxRetries) {
        throw new Error(`Falha ao conectar ao BD após ${maxRetries} tentativas: ${error instanceof Error ? error.message : error}`);
      }
      
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { createDefaultPasswords } from "./auth";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import onHeaders from "on-headers";
import { pool, waitForDb } from "./db";
import { startSelfPing } from "./self-ping";

// Show dynamic login info on startup
function showLoginCredentials() {
  console.log('');
  console.log('🔑 ========== INFORMAÇÕES DE LOGIN ==========');
  console.log('📧 Usuário admin configurado no sistema');
  console.log('🔒 Senha: [configurada via Perfil > Segurança]');
  console.log('🌐 URL: http://localhost:5000');
  console.log('ℹ️  Para alterar credenciais: Perfil > Segurança');
  console.log('🛡️  Por segurança, senha não é exibida no console');
  console.log('===========================================');
  console.log('');
}

// Tipos de sessão são definidos em auth.ts

const app = express();

// CRÍTICO: Trust proxy para funcionar com Render (sessões funcionarem)
app.set('trust proxy', 1);

// Verificar ambiente
const isProduction = process.env.NODE_ENV === 'production';

// Configuração CORS específica e segura - 100% SEM REPLIT
const corsOptions = {
  origin: [
    'https://tenisdemesaicara.com.br',
    'https://www.tenisdemesaicara.com.br',
    'https://pingpro-node.onrender.com', // Domínio Render correto
    'http://localhost:5000' // Dev local
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Log detalhado para debug cross-domain
app.use((req, res, next) => {
  if (req.path.includes('/api/')) {
    const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'HTTPS' : 'HTTP';
    const hasAuth = !!req.headers.authorization;
    console.log(`🌐 [${proto}] ${req.method} ${req.path} | Auth: ${hasAuth ? '✅' : '❌'} | Origin: ${req.headers.origin || 'NO ORIGIN'}`);
    
    if (!hasAuth && req.path !== '/api/auth/login' && req.path !== '/api/auth/me') {
      console.log(`⚠️  Headers recebidos:`, Object.keys(req.headers).join(', '));
    }
  }
  next();
});

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configuração de sessão
// Configure session store based on environment
const sessionConfig: any = {
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // true em produção para HTTPS, false em dev
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isProduction ? 'none' : 'lax', // 'none' em prod para cross-domain, 'lax' em dev
    // Domain não setado para permitir cross-domain
  }
};

// Use PostgreSQL session store in production (com fallback)
if (isProduction) {
  try {
    const PgStore = ConnectPgSimple(session);
    sessionConfig.store = new PgStore({
      pool: pool, // Use database pool
      tableName: 'session', // Session table name
      createTableIfMissing: true // Auto-create session table
    });
    console.log('🔒 PostgreSQL session store configurado (aguardando BD...)');
  } catch (error) {
    console.warn('⚠️ Falha ao configurar PostgreSQL session store, usando MemoryStore temporariamente:', error);
  }
} else {
  console.log('🔒 Using MemoryStore for development');
}

// CORREÇÃO CRÍTICA: Middleware ANTES do session para executar DEPOIS (ordem LIFO)
if (isProduction) {
  app.use((req, res, next) => {
    onHeaders(res, () => {
      const cookies = res.getHeader('Set-Cookie');
      if (cookies) {
        const updatedCookies = Array.isArray(cookies) 
          ? cookies.map(cookie => 
              typeof cookie === 'string' && cookie.includes('connect.sid') && cookie.includes('SameSite=Strict')
                ? cookie.replace('SameSite=Strict', 'SameSite=None')
                : cookie
            )
          : typeof cookies === 'string' && cookies.includes('connect.sid') && cookies.includes('SameSite=Strict')
            ? cookies.replace('SameSite=Strict', 'SameSite=None')
            : cookies;
        
        res.setHeader('Set-Cookie', updatedCookies);
      }
    });
    next();
  });
}

app.use(session(sessionConfig));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ========================================
// 🚀 ENDPOINTS KEEP-ALIVE (Anti Cold Start)
// ========================================

// Health check ultra-rápido - NÃO acessa banco de dados
app.get('/api/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Warmup endpoint - pré-aquece conexões críticas
app.post('/api/warmup', async (req, res) => {
  try {
    console.log('🔥 Warmup initiated...');
    const startTime = Date.now();
    
    // Teste rápido de conexão - usando uma função simples do storage
    const testQuery = pool.query('SELECT 1 as test');
    await testQuery;
    
    const duration = Date.now() - startTime;
    console.log(`✅ Warmup completed in ${duration}ms`);
    
    res.status(200).json({ 
      status: 'warmed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      components: {
        database: 'ok',
        storage: 'ok'
      }
    });
  } catch (error) {
    console.error('❌ Warmup failed:', error);
    res.status(503).json({ 
      status: 'warmup_failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

(async () => {
  // Aguardar BD estar pronto antes de qualquer operação
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('🔄 Aguardando BD estar pronto...');
      await waitForDb();
    } catch (error) {
      console.error('❌ ERRO CRÍTICO: BD não disponível após todas as tentativas:', error);
      process.exit(1);
    }
  }
  
  // Mostrar credenciais administrativas
  try {
    await createDefaultPasswords();
  } catch (error) {
    console.error('⚠️ Erro ao criar senhas padrão (continuando...):', error);
  }

  // Serve uploaded files (favicon, etc.) in both development and production
  const uploadsPath = path.join(process.cwd(), 'client', 'public', 'uploads');
  if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Apenas usar Vite em desenvolvimento, senão usar arquivos estáticos
  const isDev = process.env.NODE_ENV === "development";
  
  if (isDev) {
    try {
      // Usar uma variável para evitar que esbuild resolva a dependência
      const viteModulePath = [".", "vite"].join("/");
      const viteModule = await import(viteModulePath);
      await viteModule.setupVite(app, server);
      console.log('🚀 Vite development server ativo');
    } catch (error) {
      console.warn('⚠️ Vite não disponível, fallback para arquivos estáticos:', error instanceof Error ? error.message : error);
      serveStatic(app);
    }
  } else {
    console.log('📰 Servindo arquivos estáticos em produção');
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    showLoginCredentials();
    
    // 🚀 Iniciar self-ping automático
    startSelfPing();
  });
})();
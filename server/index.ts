import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { createDefaultPasswords } from "./auth";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";

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

// Configuração CORS para suportar domínio personalizado e redirecionamentos
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:5000',
      'https://pingpro.onrender.com',
      'https://tenisdemesaicara.com.br',
      'http://tenisdemesaicara.com.br'
    ];
    
    // Log para debugging
    console.log(`🌐 CORS REQUEST - Origin: ${origin || 'undefined'}`);
    
    // Permitir requisições sem origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Verificar se está na lista de permitidos
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS ALLOWED: ${origin}`);
      return callback(null, true);
    }
    
    // Log para origens não permitidas
    console.log(`❌ CORS BLOCKED: ${origin}`);
    return callback(new Error('Não permitido pelo CORS'), false);
  },
  credentials: true, // Permitir cookies cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Forwarded-For',
    'X-Forwarded-Host',
    'X-Forwarded-Proto'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware para debug de headers e origem
app.use((req, res, next) => {
  // Log apenas para requests de API ou login importantes
  if (req.path.includes('/api/auth') || req.path.includes('/api/users')) {
    console.log(`🔍 REQUEST DEBUG:`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Path: ${req.path}`);
    console.log(`   Origin: ${req.headers.origin || 'undefined'}`);
    console.log(`   Host: ${req.headers.host}`);
    console.log(`   X-Forwarded-Host: ${req.headers['x-forwarded-host'] || 'undefined'}`);
    console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'undefined'}...`);
    console.log(`   Has Session: ${!!req.session}`);
    console.log(`   Cookie: ${req.headers.cookie ? 'present' : 'missing'}`);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configuração de sessão
const isProduction = process.env.NODE_ENV === 'production';

// Configure session store based on environment
const sessionConfig: any = {
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Para funcionar com redirecionamento de domínio (pingpro.onrender.com -> tenisdemesaicara.com.br)
    secure: isProduction, // true em produção para HTTPS, false em dev
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isProduction ? 'none' : 'lax', // 'none' em prod para cross-origin, 'lax' em dev
    // Domain não deve ser setado para permitir cross-domain
  }
};

// Use PostgreSQL session store in production
if (isProduction) {
  const PgStore = ConnectPgSimple(session);
  sessionConfig.store = new PgStore({
    pool: pool, // Use database pool
    tableName: 'session', // Session table name
    createTableIfMissing: true // Auto-create session table
  });
  console.log('🔒 Using PostgreSQL session store for production');
} else {
  console.log('🔒 Using MemoryStore for development');
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

(async () => {
  // Mostrar credenciais administrativas
  await createDefaultPasswords();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    // Import dinâmico do vite apenas em desenvolvimento
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
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
  });
})();
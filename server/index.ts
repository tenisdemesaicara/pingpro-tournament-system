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

// CRÍTICO: Trust proxy para funcionar com Render (sessões funcionarem)
app.set('trust proxy', 1);

// Configuração CORS específica e segura - 100% SEM REPLIT
const corsOptions = {
  origin: [
    'https://tenisdemesaicara.com.br',
    'https://www.tenisdemesaicara.com.br',
    'https://pingpro.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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
    secure: isProduction, // true em produção para HTTPS, false em dev
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isProduction ? 'none' : 'lax', // 'none' em prod para cross-domain, 'lax' em dev
    // Domain não setado para permitir cross-domain
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

// CORREÇÃO CRÍTICA: Middleware para forçar SameSite=None em produção
if (isProduction) {
  app.use((req, res, next) => {
    const originalWriteHead = res.writeHead;
    res.writeHead = function(statusCode, reasonPhrase, headers) {
      // Fix headers for both writeHead signatures
      let hdrs = headers;
      if (typeof reasonPhrase === 'object') {
        hdrs = reasonPhrase;
      }
      
      // Force SameSite=None for session cookies in production
      if (hdrs && hdrs['set-cookie']) {
        if (Array.isArray(hdrs['set-cookie'])) {
          hdrs['set-cookie'] = hdrs['set-cookie'].map(cookie => 
            cookie.includes('connect.sid') && cookie.includes('SameSite=Strict') 
              ? cookie.replace('SameSite=Strict', 'SameSite=None') 
              : cookie
          );
        } else if (typeof hdrs['set-cookie'] === 'string') {
          if (hdrs['set-cookie'].includes('connect.sid') && hdrs['set-cookie'].includes('SameSite=Strict')) {
            hdrs['set-cookie'] = hdrs['set-cookie'].replace('SameSite=Strict', 'SameSite=None');
          }
        }
      }
      
      return originalWriteHead.call(this, statusCode, reasonPhrase, hdrs);
    };
    next();
  });
}

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
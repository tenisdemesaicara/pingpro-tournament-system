import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createDefaultPasswords } from "./auth";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

// Simple logging for production
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Simple static file serving
function serveStatic(app: express.Express) {
  const distPath = path.resolve("dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the frontend build! Did you forget to run the build command?`
    );
  }

  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Configuração de tipos para sessão
declare module 'express-session' {
  interface SessionData {
    user: {
      id: string;
      username: string;
      role: string;
    };
  }
}

const app = express();

// Configure trust proxy for production (behind Render proxy)
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Secure session configuration for production
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required for production');
}

// Configure PostgreSQL session store for production
const PgStore = ConnectPgSimple(session);

app.use(session({
  store: new PgStore({
    pool: pool, // Use same database pool
    tableName: 'session', // Session table name
    createTableIfMissing: true // Auto-create session table
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: isProduction ? 'strict' : 'lax'
  }
}));

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

// Programmatic database schema application
async function initializeDatabase() {
  try {
    log('Initializing database schema...', 'database');
    
    // Test database connection first
    const client = await pool.connect();
    await client.query('SELECT 1');
    log('Database connection successful ✓', 'database');
    
    // Apply schema step by step (better error isolation)
    
    // Step 1: Enable extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    log('✓ PostgreSQL pgcrypto extension enabled', 'database');
    
    // Step 2: Core tables
    const coreTablesSQL = `
      CREATE TABLE IF NOT EXISTS athletes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        birth_date TEXT NOT NULL,
        cpf TEXT UNIQUE,
        rg TEXT,
        street TEXT,
        neighborhood TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        complement TEXT,
        club TEXT,
        category TEXT,
        gender TEXT NOT NULL,
        ranking INTEGER DEFAULT 1000,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        photo_url TEXT,
        observations TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        type TEXT NOT NULL DEFAULT 'atleta',
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        min_age INTEGER,
        max_age INTEGER,
        gender TEXT NOT NULL DEFAULT 'all',
        skill_level TEXT NOT NULL DEFAULT 'all'
      );
      
      CREATE TABLE IF NOT EXISTS tournaments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,
        cover_image TEXT,
        registration_deadline TIMESTAMP,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        location TEXT,
        organizer TEXT NOT NULL,
        season TEXT NOT NULL,
        prize_pool TEXT,
        rules TEXT,
        format TEXT DEFAULT 'single_elimination',
        is_public BOOLEAN DEFAULT true,
        scoring_system JSON,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(coreTablesSQL);
    log('✓ Core tables created (athletes, categories, tournaments)', 'database');
    
    // Step 3: Junction and match tables  
    const matchTablesSQL = `
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id VARCHAR NOT NULL,
        athlete_id VARCHAR NOT NULL,
        category_id VARCHAR NOT NULL,
        registration_number VARCHAR,
        seed INTEGER,
        registered_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS tournament_categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id VARCHAR NOT NULL,
        category_id VARCHAR NOT NULL,
        format TEXT NOT NULL DEFAULT 'single_elimination',
        max_participants INTEGER,
        current_participants INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS matches (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id VARCHAR NOT NULL,
        category_id VARCHAR NOT NULL,
        round INTEGER NOT NULL,
        match_number INTEGER NOT NULL,
        player1_id VARCHAR,
        player2_id VARCHAR,
        winner_id VARCHAR,
        score TEXT,
        status TEXT DEFAULT 'pending',
        scheduled_at TIMESTAMP,
        completed_at TIMESTAMP,
        notes TEXT,
        phase TEXT DEFAULT 'knockout',
        group_name TEXT,
        best_of_sets INTEGER NOT NULL DEFAULT 3,
        sets JSON,
        needs_attention BOOLEAN DEFAULT false,
        table_number INTEGER DEFAULT 1,
        player1_source TEXT,
        player2_source TEXT,
        next_match_id VARCHAR,
        next_match_slot INTEGER
      );
    `;
    await client.query(matchTablesSQL);
    log('✓ Match and tournament tables created', 'database');
    
    // Step 4: Additional tables
    const additionalTablesSQL = `
      CREATE TABLE IF NOT EXISTS external_links (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        short_code VARCHAR(32) NOT NULL UNIQUE,
        original_url TEXT NOT NULL,
        link_type TEXT NOT NULL,
        tournament_id VARCHAR,
        category_id VARCHAR,
        title TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS consents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id VARCHAR NOT NULL,
        athlete_id VARCHAR NOT NULL,
        category_id VARCHAR NOT NULL,
        lgpd_consent BOOLEAN NOT NULL DEFAULT false,
        image_rights_consent BOOLEAN NOT NULL DEFAULT false,
        terms_consent BOOLEAN NOT NULL DEFAULT false,
        is_minor BOOLEAN NOT NULL DEFAULT false,
        signature_data TEXT NOT NULL,
        signer_name TEXT NOT NULL,
        consent_timestamp TIMESTAMP NOT NULL,
        athlete_cpf TEXT,
        parent_name TEXT,
        parent_cpf TEXT,
        parent_email TEXT,
        relationship TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await client.query(additionalTablesSQL);
    log('✓ Additional tables created (external_links, consents)', 'database');
    
    // Step 5: Indexes (create them one by one to isolate errors)
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_athletes_email ON athletes(email);');
      log('✓ Athletes email index created', 'database');
      
      await client.query('CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);');
      log('✓ Tournament participants index created', 'database');
      
      await client.query('CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);');
      log('✓ Matches tournament index created', 'database');
      
      await client.query('CREATE INDEX IF NOT EXISTS idx_tournament_categories_tournament ON tournament_categories(tournament_id);');
      log('✓ Tournament categories index created', 'database');
      
      await client.query('CREATE INDEX IF NOT EXISTS idx_external_links_code ON external_links(short_code);');
      log('✓ External links index created', 'database');
      
      await client.query('CREATE INDEX IF NOT EXISTS idx_consents_tournament ON consents(tournament_id);');
      log('✓ Consents tournament index created', 'database');
      
      log('✓ All database indexes created successfully', 'database');
    } catch (indexError) {
      const errorMessage = indexError instanceof Error ? indexError.message : String(indexError);
      log(`Index creation warning: ${errorMessage} (continuing anyway)`, 'database');
      // Don't fail the entire initialization for index issues
    }
    client.release();
    
    log('Database schema applied successfully ✓', 'database');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Database initialization failed: ${errorMessage}`, 'database');
    throw new Error(`Failed to initialize database: ${errorMessage}`);
  }
}

(async () => {
  try {
    log('🚀 Starting production server...', 'startup');
    
    // Initialize database first (critical for production)
    log('📊 Initializing database...', 'startup');
    await initializeDatabase();
    log('✅ Database initialized successfully', 'startup');
    
    // Create default passwords (only in development to avoid credential leaks)
    if (process.env.NODE_ENV !== 'production') {
      log('🔑 Creating default passwords (development only)...', 'startup');
      await createDefaultPasswords();
      log('✅ Default passwords created', 'startup');
    } else {
      log('🔒 Skipping default passwords in production', 'startup');
    }

    log('🛣️  Registering routes...', 'startup');
    const server = await registerRoutes(app);
    log('✅ Routes registered successfully', 'startup');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error for monitoring
      log(`Error ${status}: ${message}`, 'error');
      
      // Send error response
      res.status(status).json({ message });
      
      // Don't throw after responding - this can crash the process
    });

    // APENAS servir arquivos estáticos - SEM VITE
    log('📁 Setting up static files...', 'startup');
    serveStatic(app);
    log('✅ Static files configured', 'startup');

    const port = parseInt(process.env.PORT || '5000', 10);
    log(`🌐 Starting server on port ${port}...`, 'startup');
    
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🎉 SERVER READY! serving on port ${port}`, 'startup');
      log(`🔗 Health check: http://0.0.0.0:${port}/api/health`, 'startup');
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`💥 FATAL STARTUP ERROR: ${errorMessage}`, 'error');
    log(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`, 'error');
    
    // Try to start server anyway on basic port for health checks
    const port = parseInt(process.env.PORT || '5000', 10);
    log(`🆘 Attempting emergency server start on port ${port}...`, 'error');
    
    app.get('/health', (req, res) => {
      res.status(500).json({ 
        status: 'error', 
        message: 'Server started with errors',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    });
    
    app.listen(port, '0.0.0.0', () => {
      log(`🆘 Emergency server running on port ${port} (with errors)`, 'error');
    });
  }
})();
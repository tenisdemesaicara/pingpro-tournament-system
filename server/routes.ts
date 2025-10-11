import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAthleteSchema, insertTournamentSchema, insertTournamentParticipantSchema, insertMatchSchema, insertCategorySchema, insertPaymentSchema, insertRevenueSchema, insertExpenseSchema, insertConsentSchema, insertExternalLinkSchema, insertAssetSchema, tournamentRegistrationSchema, insertTeamSchema, insertTeamMemberSchema, insertTournamentTeamSchema, insertTeamTieSchema } from "@shared/schema";
import { calculateAgeInTournamentYear, isEligibleForCategory, extractYearFromDate } from "@shared/utils";
import { eq, and, ne, or } from "drizzle-orm";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { Pool } from "pg";
import { authenticateUser, requireAuth, requirePermission, requireRole, getUserWithRoles } from "./auth";
import { 
  insertUserSchema, 
  updateUserSchema,
  changePasswordSchema, 
  loginSchema,
  users, 
  roles, 
  permissions, 
  userRoles, 
  rolePermissions,
  userPermissionOverrides,
  insertUserPermissionOverrideSchema,
  userPermissionsSchema
} from "@shared/schema";
import bcrypt from 'bcrypt';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { generateGroupStageMatches, generateRoundRobinMatches, generateKnockoutMatches } from "./bracketUtils";
import { BracketManager } from "./bracketLogic";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // DEBUG removido - problema resolvido!
  
  // Health check endpoint for Render
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      service: "PingPro Tournament System",
      version: "1.0.0",
      timestamp: new Date().toISOString()
    });
  });

  // Debug logs endpoint (TEMPORÁRIO - remover após diagnóstico)
  app.get("/api/debug/logs", (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Debug Logs - PingPro</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: monospace; 
            padding: 10px; 
            background: #1a1a1a; 
            color: #00ff00;
            font-size: 12px;
            line-height: 1.4;
          }
          h1 { color: #00ff00; font-size: 16px; }
          .log { 
            margin: 5px 0; 
            padding: 8px; 
            background: #2a2a2a; 
            border-left: 3px solid #00ff00;
            word-wrap: break-word;
          }
          .error { border-left-color: #ff0000; color: #ff6666; }
          .success { border-left-color: #00ff00; }
          .info { border-left-color: #00aaff; color: #66ccff; }
          .refresh { 
            position: fixed; 
            top: 10px; 
            right: 10px; 
            background: #00ff00; 
            color: #000; 
            padding: 10px; 
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <button class="refresh" onclick="location.reload()">🔄 Atualizar</button>
        <h1>🔍 Debug Logs - Últimos ${debugLogs.length} registros</h1>
        <p style="color: #888;">Atualizado: ${new Date().toLocaleString('pt-BR')}</p>
        ${debugLogs.length === 0 ? '<p>Nenhum log capturado ainda.</p>' : debugLogs.map(log => {
          const className = log.includes('❌') ? 'error' : log.includes('✅') ? 'success' : 'info';
          return `<div class="log ${className}">${log}</div>`;
        }).join('')}
        <script>
          // Auto-refresh a cada 5 segundos
          setTimeout(() => location.reload(), 5000);
        </script>
      </body>
      </html>
    `;
    res.send(html);
  });

  // Log storage in memory for debugging
  const debugLogs: string[] = [];
  const maxLogs = 100;
  
  // Interceptar console.log para salvar logs de debug
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args) => {
    const message = args.join(' ');
    // Capturar logs com emojis de debug ou mensagens importantes
    if (message.includes('🔍') || message.includes('✅') || message.includes('❌') || 
        message.includes('[/api/athletes') || message.includes('[Storage.') || 
        message.includes('[requireAuth]') || message.includes('[/api/dashboard')) {
      debugLogs.push(`${new Date().toISOString()}: ${message}`);
      if (debugLogs.length > maxLogs) {
        debugLogs.shift();
      }
    }
    originalLog(...args);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    debugLogs.push(`${new Date().toISOString()}: ❌ ERROR: ${message}`);
    if (debugLogs.length > maxLogs) {
      debugLogs.shift();
    }
    originalError(...args);
  };




  // Inicializar gerenciador de bracket
  const bracketManager = new BracketManager(storage);

  // Rotas de autenticação (SEMPRE PÚBLICAS)
  app.post("/api/auth/login", async (req, res) => {
    try {
      // DEBUG: Log detalhado para debug cross-domain
      console.log('🔍 LOGIN DEBUG:');
      console.log('   Host:', req.headers.host);
      console.log('   Origin:', req.headers.origin);
      console.log('   X-Forwarded-Host:', req.headers['x-forwarded-host']);
      console.log('   X-Forwarded-Proto:', req.headers['x-forwarded-proto']);
      console.log('   User-Agent:', req.headers['user-agent']?.substring(0, 50));
      console.log('   Body received:', { username: req.body.username, hasPassword: !!req.body.password });
      
      const { username, password } = req.body;
      
      if (!username || !password) {
        console.log('❌ Login failed: missing credentials');
        return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
      }

      console.log('🔍 Attempting authentication for:', username);
      const user = await authenticateUser(username, password);
      if (!user) {
        console.log('❌ Authentication failed for:', username);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      console.log('✅ Authentication successful for:', username);
      console.log('✅ Token presente na resposta?', !!user.token);
      
      // Salvar na sessão
      req.session.user = user;
      
      // SEMPRE retornar o token para funcionar cross-domain
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session && req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "Não autenticado" });
    }
  });

  // ===== ROTAS DE GERENCIAMENTO DE USUÁRIOS =====
  
  // Listar todos os usuários (apenas admins)
  app.get("/api/users", requireAuth, requirePermission('users.read'), async (req, res) => {
    try {
      const usersResult = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
      }).from(users);

      // Buscar roles para cada usuário
      const usersWithRoles = await Promise.all(
        usersResult.map(async (user) => {
          const userRolesResult = await db.select({
            roleId: roles.id,
            roleName: roles.name,
            roleDisplayName: roles.displayName,
          }).from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

          return {
            ...user,
            roles: userRolesResult.map(r => ({
              id: r.roleId,
              name: r.roleName,
              displayName: r.roleDisplayName,
            }))
          };
        })
      );

      res.json(usersWithRoles);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo usuário (apenas admins)
  app.post("/api/users", requireAuth, requirePermission('users.create'), async (req, res) => {
    try {
      console.log("🔍 CRIAÇÃO DE USUÁRIO - Body recebido:", JSON.stringify(req.body, null, 2));
      const validatedData = insertUserSchema.parse(req.body);
      console.log("✅ VALIDAÇÃO OK para criação de usuário");
      
      // Verificar se username ou email já existem
      const existingUser = await db.select().from(users).where(
        sql`${users.username} = ${validatedData.username} OR ${users.email} = ${validatedData.email}`
      );
      
      if (existingUser.length > 0) {
        return res.status(400).json({ 
          message: "Usuário ou email já existem" 
        });
      }

      // Hash da senha
      const passwordHash = await bcrypt.hash(validatedData.password, 10);

      // Criar usuário
      const newUser = await db.insert(users).values({
        username: validatedData.username,
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        isActive: validatedData.isActive ?? true,
        profileImageUrl: validatedData.profileImageUrl,
      }).returning();

      // Atribuir roles
      if (validatedData.roleIds && validatedData.roleIds.length > 0) {
        const roleAssignments = validatedData.roleIds.map(roleId => ({
          userId: newUser[0].id,
          roleId,
          assignedBy: req.session.user!.id,
        }));
        
        await db.insert(userRoles).values(roleAssignments);
      }

      // Retornar usuário criado (sem hash da senha)
      const { passwordHash: _, ...userResponse } = newUser[0];
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // 🎯 ATUALIZAR PERFIL - ANTES DE :id PARA EVITAR CONFLITO!
  app.put("/api/users/profile", requireAuth, async (req, res) => {
    console.log("✅ CHEGOU NA ROTA DE PERFIL CORRETA!");
    
    try {
      const { username, email, firstName, lastName } = req.body;
      
      if (!username || !email || !firstName || !lastName) {
        return res.status(400).json({ 
          message: "Campos obrigatórios faltando"
        });
      }

      // Verificar conflitos (exceto próprio usuário)
      const existingUsers = await db.select()
        .from(users)
        .where(
          and(
            ne(users.id, req.session.user!.id),
            or(
              eq(users.username, username),
              eq(users.email, email)
            )
          )
        );

      if (existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.username === username) {
          return res.status(400).json({ message: "Nome de usuário já existe" });
        }
        if (existingUser.email === email) {
          return res.status(400).json({ message: "Email já existe" });
        }
      }

      // Atualizar perfil
      await db.update(users)
        .set({
          username,
          email,
          firstName,
          lastName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.session.user!.id));

      res.json({ message: "Perfil atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      return res.status(500).json({ 
        message: "Erro interno do servidor"
      });
    }
  });

  // Atualizar usuário (apenas admins)
  app.put("/api/users/:id", requireAuth, requirePermission('users.update'), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);

      // Verificar se usuário existe
      const existingUser = await db.select().from(users).where(eq(users.id, id));
      if (!existingUser.length) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verificar conflitos de username/email
      const conflictUser = await db.select().from(users).where(
        and(
          sql`${users.id} != ${id}`,
          sql`${users.username} = ${validatedData.username} OR ${users.email} = ${validatedData.email}`
        )
      );
      
      if (conflictUser.length > 0) {
        return res.status(400).json({ 
          message: "Usuário ou email já existem" 
        });
      }

      // Atualizar usuário
      const updatedUser = await db.update(users)
        .set({
          username: validatedData.username,
          email: validatedData.email,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          isActive: validatedData.isActive,
          profileImageUrl: validatedData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      // Atualizar roles
      if (validatedData.roleIds) {
        // Remover roles existentes
        await db.delete(userRoles).where(eq(userRoles.userId, id));
        
        // Adicionar novas roles
        if (validatedData.roleIds.length > 0) {
          const roleAssignments = validatedData.roleIds.map(roleId => ({
            userId: id,
            roleId,
            assignedBy: req.session.user!.id,
          }));
          
          await db.insert(userRoles).values(roleAssignments);
        }
      }

      const { passwordHash: _, ...userResponse } = updatedUser[0];
      res.json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir usuário (apenas admins)
  app.delete("/api/users/:id", requireAuth, requirePermission('users.delete'), async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar se usuário existe
      const existingUser = await db.select().from(users).where(eq(users.id, id));
      if (!existingUser.length) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Não permitir auto-exclusão
      if (id === req.session.user!.id) {
        return res.status(400).json({ 
          message: "Não é possível excluir seu próprio usuário" 
        });
      }

      // Excluir usuário (cascade irá remover roles automaticamente)
      await db.delete(users).where(eq(users.id, id));

      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Alterar senha
  app.post("/api/users/:id/change-password", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = changePasswordSchema.parse(req.body);

      // Verificar se o usuário pode alterar esta senha
      if (id !== req.session.user!.id && !req.session.user!.roles.some((role: any) => 
        role.permissions.some((permission: any) => permission.name === 'users.manage')
      )) {
        return res.status(403).json({ 
          message: "Não autorizado a alterar esta senha" 
        });
      }

      // Buscar usuário
      const user = await db.select().from(users).where(eq(users.id, id));
      if (!user.length) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verificar senha atual (apenas para próprio usuário)
      if (id === req.session.user!.id) {
        const isCurrentPasswordValid = await bcrypt.compare(
          validatedData.currentPassword, 
          user[0].passwordHash
        );
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ 
            message: "Senha atual incorreta" 
          });
        }
      }

      // Hash da nova senha
      const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 10);

      // Atualizar senha
      await db.update(users)
        .set({ 
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Obter perfil do usuário atual
  app.get("/api/users/profile", requireAuth, async (req, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, req.session.user!.id));

      if (!user.length) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Return only safe fields
      const profile = {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        firstName: user[0].firstName,
        lastName: user[0].lastName,
        createdAt: user[0].createdAt,
      };

      res.json(profile);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ROTA MOVIDA PARA CIMA PARA EVITAR CONFLITO COM :id

  // Alterar senha do usuário atual
  app.post("/api/users/change-password", requireAuth, async (req, res) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);

      // Buscar usuário
      const user = await db.select().from(users).where(eq(users.id, req.session.user!.id));
      if (!user.length) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await bcrypt.compare(
        validatedData.currentPassword, 
        user[0].passwordHash
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          message: "Senha atual incorreta" 
        });
      }

      // Hash da nova senha
      const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 10);

      // Atualizar senha
      await db.update(users)
        .set({ 
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.session.user!.id));

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar roles disponíveis
  app.get("/api/roles", requireAuth, requirePermission('users.read'), async (req, res) => {
    try {
      const rolesResult = await db.select().from(roles);
      res.json(rolesResult);
    } catch (error) {
      console.error("Erro ao buscar roles:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar permissões disponíveis
  app.get("/api/permissions", requireAuth, requirePermission('users.read'), async (req, res) => {
    try {
      const permissionsResult = await db.select().from(permissions);
      res.json(permissionsResult);
    } catch (error) {
      console.error("Erro ao buscar permissões:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE GERENCIAMENTO DE PERMISSÕES INDIVIDUAIS =====
  
  // Listar permissões efetivas de um usuário específico
  app.get("/api/users/:id/permissions", requireAuth, requirePermission('users.manage'), async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🔍 Buscando permissões efetivas para usuário ${id}`);
      
      // Buscar usuário com permissões efetivas
      const userWithPermissions = await getUserWithRoles(id);
      if (!userWithPermissions) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Buscar overrides específicos do usuário
      const overrides = await db.select({
        id: userPermissionOverrides.id,
        permissionId: userPermissionOverrides.permissionId,
        permissionName: permissions.name,
        permissionDisplayName: permissions.displayName,
        effect: userPermissionOverrides.effect,
        createdAt: userPermissionOverrides.createdAt,
        assignedBy: userPermissionOverrides.assignedBy
      }).from(userPermissionOverrides)
      .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id))
      .where(eq(userPermissionOverrides.userId, id));
      
      // Buscar permissões dos roles para referência
      const rolePermissions = userWithPermissions.roles.flatMap(role => 
        role.permissions.map(permission => permission.name)
      );
      
      const response = {
        userId: id,
        effectivePermissions: userWithPermissions.effectivePermissions,
        rolePermissions, // Permissões vindas dos roles
        individualOverrides: overrides, // Permissões individuais (grants/denies)
        roles: userWithPermissions.roles.map(role => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName
        }))
      };
      
      console.log(`✅ Permissões encontradas para usuário ${id}: ${userWithPermissions.effectivePermissions.length} efetivas`);
      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar permissões do usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Conceder ou negar permissões individuais para um usuário
  app.post("/api/users/:id/permissions", requireAuth, requirePermission('users.manage'), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = userPermissionsSchema.parse(req.body);
      
      console.log(`🔧 Atualizando permissões individuais para usuário ${id}:`, JSON.stringify(validatedData, null, 2));
      
      // VALIDAÇÃO DE SEGURANÇA: Prevenir auto-lockout
      if (id === req.session.user!.id) {
        // Buscar permissões que estão sendo negadas
        const deniedPermissions = await Promise.all(
          validatedData.denies.map(async (permissionId) => {
            const permission = await db.select().from(permissions).where(eq(permissions.id, permissionId));
            return permission.length > 0 ? permission[0] : null;
          })
        );
        
        // Verificar se está tentando negar permissões críticas para si mesmo
        const criticalPermissions = ['users.manage', 'admin.access'];
        const deniedCriticalPermissions = deniedPermissions.filter(permission => 
          permission && criticalPermissions.includes(permission.name)
        );
        
        if (deniedCriticalPermissions.length > 0) {
          return res.status(403).json({ 
            message: "Você não pode negar permissões críticas para si mesmo para evitar auto-lockout",
            deniedPermissions: deniedCriticalPermissions.map(p => p!.name)
          });
        }
      }
      
      // Verificar se usuário existe
      const user = await db.select().from(users).where(eq(users.id, id));
      if (!user.length) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // VALIDAÇÃO: Verificar se usuário alvo é admin ou tem permissões superiores
      const targetUserWithRoles = await getUserWithRoles(id);
      if (targetUserWithRoles) {
        const targetHasAdminRole = targetUserWithRoles.roles.some(role => role.name === 'admin');
        const currentUserHasAdminRole = req.session.user!.roles.some((role: any) => role.name === 'admin');
        
        // Apenas admins podem modificar permissões de outros admins
        if (targetHasAdminRole && !currentUserHasAdminRole) {
          return res.status(403).json({ 
            message: "Apenas administradores podem modificar permissões de outros administradores" 
          });
        }
      }
      
      // Processar grants (conceder permissões)
      const grantPromises = validatedData.grants.map(async (permissionId) => {
        // Verificar se permissão existe
        const permission = await db.select().from(permissions).where(eq(permissions.id, permissionId));
        if (!permission.length) {
          throw new Error(`Permissão ${permissionId} não encontrada`);
        }
        
        // Remover override anterior (se existir) e criar novo
        await db.delete(userPermissionOverrides).where(
          and(
            eq(userPermissionOverrides.userId, id),
            eq(userPermissionOverrides.permissionId, permissionId)
          )
        );
        
        await db.insert(userPermissionOverrides).values({
          userId: id,
          permissionId,
          effect: 'grant',
          assignedBy: req.session.user!.id
        });
        
        console.log(`➕ Permissão ${permissionId} concedida para usuário ${id}`);
      });
      
      // Processar denies (negar permissões)
      const denyPromises = validatedData.denies.map(async (permissionId) => {
        // Verificar se permissão existe
        const permission = await db.select().from(permissions).where(eq(permissions.id, permissionId));
        if (!permission.length) {
          throw new Error(`Permissão ${permissionId} não encontrada`);
        }
        
        // Remover override anterior (se existir) e criar novo
        await db.delete(userPermissionOverrides).where(
          and(
            eq(userPermissionOverrides.userId, id),
            eq(userPermissionOverrides.permissionId, permissionId)
          )
        );
        
        await db.insert(userPermissionOverrides).values({
          userId: id,
          permissionId,
          effect: 'deny',
          assignedBy: req.session.user!.id
        });
        
        console.log(`➖ Permissão ${permissionId} negada para usuário ${id}`);
      });
      
      // Executar todas as operações
      await Promise.all([...grantPromises, ...denyPromises]);
      
      // VALIDAÇÃO FINAL: Verificar se a operação não resultou em escalação de privilégios inadequada
      const updatedUser = await getUserWithRoles(id);
      if (updatedUser) {
        const hasAdminPermissions = updatedUser.effectivePermissions.includes('admin.access');
        const hasUserManagePermissions = updatedUser.effectivePermissions.includes('users.manage');
        
        // Log de auditoria para operações críticas
        if (hasAdminPermissions || hasUserManagePermissions) {
          console.log(`🔒 AUDITORIA: Usuário ${req.session.user!.username} (${req.session.user!.id}) modificou permissões críticas do usuário ${updatedUser.username} (${id})`);
          console.log(`📋 Permissões efetivas resultantes: ${updatedUser.effectivePermissions.join(', ')}`);
        }
      }
      
      console.log(`✅ Permissões atualizadas para usuário ${id}`);
      res.json({ 
        message: "Permissões individuais atualizadas com sucesso",
        effectivePermissions: updatedUser?.effectivePermissions || []
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Erro ao atualizar permissões individuais:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
      res.status(500).json({ message: errorMessage });
    }
  });
  
  // Remover override de permissão específico
  app.delete("/api/users/:id/permissions/:permissionId", requireAuth, requirePermission('users.manage'), async (req, res) => {
    try {
      const { id, permissionId } = req.params;
      
      console.log(`🗑️ Removendo override de permissão ${permissionId} para usuário ${id}`);
      
      // Verificar se usuário existe
      const user = await db.select().from(users).where(eq(users.id, id));
      if (!user.length) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Verificar se override existe
      const override = await db.select().from(userPermissionOverrides).where(
        and(
          eq(userPermissionOverrides.userId, id),
          eq(userPermissionOverrides.permissionId, permissionId)
        )
      );
      
      if (!override.length) {
        return res.status(404).json({ message: "Override de permissão não encontrado" });
      }
      
      // Remover override
      await db.delete(userPermissionOverrides).where(
        and(
          eq(userPermissionOverrides.userId, id),
          eq(userPermissionOverrides.permissionId, permissionId)
        )
      );
      
      // Buscar permissões atualizadas
      const updatedUser = await getUserWithRoles(id);
      
      console.log(`✅ Override removido para usuário ${id}, permissão ${permissionId}`);
      res.json({ 
        message: "Override de permissão removido com sucesso",
        effectivePermissions: updatedUser?.effectivePermissions || []
      });
    } catch (error) {
      console.error("Erro ao remover override de permissão:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Athletes routes - rotas específicas primeiro (PROTEGIDAS)
  app.get("/api/athletes", requireAuth, async (req, res) => {
    try {
      const athletes = await storage.getAllAthletes();
      // Filtrar apenas atletas aprovados para evitar seleção de inativos
      const approvedAthletes = athletes.filter(athlete => athlete.status === "approved");
      res.json(approvedAthletes);
    } catch (error) {
      console.error("Error fetching athletes:", error);
      res.status(500).json({ error: "Failed to fetch athletes", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Endpoint para buscar TODOS os atletas (incluindo pendentes/rejeitados) - PROTEGIDO
  app.get("/api/athletes/all", requireAuth, async (req, res) => {
    try {
      console.log("🔍 [/api/athletes/all] Iniciando busca de atletas...");
      console.log("🔍 [/api/athletes/all] User autenticado:", req.user ? `${req.user.username} (ID: ${req.user.id})` : "NENHUM");
      
      console.log("🔍 [/api/athletes/all] Chamando storage.getAllAthletes()...");
      const athletes = await storage.getAllAthletes();
      
      console.log(`✅ [/api/athletes/all] Sucesso! Encontrados ${athletes.length} atletas`);
      console.log(`✅ [/api/athletes/all] Primeiros 3 atletas:`, athletes.slice(0, 3).map(a => ({ id: a.id, name: a.name, status: a.status })));
      
      res.json(athletes);
    } catch (error) {
      console.error("❌ [/api/athletes/all] ERRO CAPTURADO:", error);
      console.error("❌ [/api/athletes/all] Tipo do erro:", typeof error);
      console.error("❌ [/api/athletes/all] Stack trace:", error instanceof Error ? error.stack : "N/A");
      res.status(500).json({ error: "Failed to fetch all athletes", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Endpoint para buscar atletas pendentes de aprovação (PROTEGIDO)
  app.get("/api/athletes/pending", requireAuth, async (req, res) => {
    try {
      const athletes = await storage.getAllAthletes();
      const pendingAthletes = athletes.filter(athlete => athlete.status === "pending");
      res.json(pendingAthletes);
    } catch (error) {
      console.error("Error fetching pending athletes:", error);
      res.status(500).json({ error: "Failed to fetch pending athletes" });
    }
  });

  // Endpoint para aprovações administrativas - exclui atletas com consentimento LGPD (PROTEGIDO)
  app.get("/api/athletes/admin-pending", requireAuth, async (req, res) => {
    try {
      const athletes = await storage.getAllAthletes();
      const consents = await storage.getAllConsents();
      
      // Filtra atletas pendentes que NÃO têm consentimento LGPD (cadastros manuais)
      const athleteIdsWithConsent = new Set(consents.map(consent => consent.athleteId));
      const adminPendingAthletes = athletes.filter(athlete => 
        athlete.status === "pending" && !athleteIdsWithConsent.has(athlete.id)
      );
      
      res.json(adminPendingAthletes);
    } catch (error) {
      console.error("Error fetching admin pending athletes:", error);
      res.status(500).json({ error: "Failed to fetch admin pending athletes" });
    }
  });

  // Endpoint para buscar temporadas disponíveis
  app.get("/api/seasons", async (req, res) => {
    try {
      const seasons = await storage.getAvailableSeasons();
      res.json(seasons);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      res.status(500).json({ error: "Failed to fetch seasons" });
    }
  });

  // Endpoint para buscar ranking de atletas por categoria e temporada
  app.get("/api/athletes/ranking", requireAuth, async (req, res) => {
    try {
      const { category: categoryName, season } = req.query;
      const currentYear = new Date().getFullYear();
      const targetSeason = season ? parseInt(season as string) : currentYear;
      
      
      if (!categoryName) {
        return res.status(400).json({ error: "Category parameter is required" });
      }

      // Buscar a categoria pelo nome
      const categories = await storage.getAllCategories();
      const category = categories.find(c => c.name === categoryName);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Função para calcular idade no ano da temporada
      const calculateAgeInSeason = (birthDateStr: string, seasonYear: number) => {
        const birthDate = new Date(birthDateStr);
        const seasonStart = new Date(seasonYear, 0, 1); // 1 de janeiro do ano da temporada
        const age = seasonStart.getFullYear() - birthDate.getFullYear();
        const monthDiff = seasonStart.getMonth() - birthDate.getMonth();
        
        // Se ainda não fez aniversário no ano da temporada, subtrai 1
        if (monthDiff < 0 || (monthDiff === 0 && seasonStart.getDate() < birthDate.getDate())) {
          return age - 1;
        }
        return age;
      };

      // Buscar todos os atletas aprovados
      const allAthletes = await storage.getAllAthletes();
      const approvedAthletes = allAthletes.filter(a => a.status === "approved");

      // Buscar todos os torneios da temporada
      const allTournaments = await storage.getAllTournaments();
      const seasonTournaments = allTournaments.filter(t => t.season === targetSeason.toString());

      // Buscar participações em torneios da temporada
      const eligibleAthletes = [];

      for (const athlete of approvedAthletes) {
        const ageInSeason = calculateAgeInSeason(athlete.birthDate, targetSeason);
        let isEligible = false;
        let eligibleByAge = false;
        let eligibleByParticipation = false;

        // Verificar elegibilidade por idade (para categorias não-absoluto)
        if (!category.name.toLowerCase().includes('absoluto')) {
          if (category.minAge !== null && category.maxAge !== null) {
            // Categoria tem faixa etária definida
            eligibleByAge = ageInSeason >= category.minAge && ageInSeason <= category.maxAge;
          } else if (category.name.toLowerCase().includes('adulto')) {
            // Categoria adulto: 22-29 anos
            eligibleByAge = ageInSeason >= 22 && ageInSeason <= 29;
          } else {
            // Tentar extrair idade do nome da categoria (ex: Sub-15)
            const ageMatch = category.name.match(/(\d+)/);
            if (ageMatch) {
              const categoryAge = parseInt(ageMatch[1]);
              eligibleByAge = ageInSeason <= categoryAge;
            }
          }
          
          // Verificar gênero também
          if (eligibleByAge) {
            if (category.gender === "mista") {
              isEligible = true; // Categoria mista aceita qualquer gênero
            } else {
              // Normalizar gêneros para comparação
              const athleteGenderNormalized = athlete.gender === "masculino" ? "masculino" : "feminino";
              const categoryGenderNormalized = category.gender === "masculino" ? "masculino" : "feminino";
              isEligible = athleteGenderNormalized === categoryGenderNormalized;
            }
          }
        } else {
          // Para categorias absoluto, verificar participação em torneios
          for (const tournament of seasonTournaments) {
            const participants = await storage.getTournamentParticipants(tournament.id);
            const athleteParticipated = participants.some(p => p.id === athlete.id);
            
            if (athleteParticipated) {
              // Verificar se participou especificamente na categoria absoluto
              eligibleByParticipation = true;
              break;
            }
          }
          isEligible = eligibleByParticipation;
        }

        if (isEligible) {
          // Calcular estatísticas do atleta na temporada
          let wins = 0;
          let losses = 0;
          let points = 0;

          // Buscar partidas do atleta nos torneios da temporada
          for (const tournament of seasonTournaments) {
            const matches = await storage.getTournamentMatches(tournament.id);
            const athleteMatches = matches.filter(m => 
              (m.player1Id === athlete.id || m.player2Id === athlete.id) && 
              m.status === "completed"
            );

            for (const match of athleteMatches) {
              if (match.winnerId === athlete.id) {
                wins++;
                points += 3; // 3 pontos por vitória
              } else if (match.winnerId && match.winnerId !== athlete.id) {
                losses++;
                points += 1; // 1 ponto por participação
              }
            }
          }

          const totalMatches = wins + losses;
          const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

          // Criar ou atualizar ranking da temporada
          const rankingData = {
            athleteId: athlete.id,
            categoryId: category.id,
            season: targetSeason,
            position: 0, // Será calculado depois da ordenação
            points,
            wins,
            losses,
            winRate: winRate.toString(),
            totalMatches,
            eligibleByAge,
            eligibleByParticipation
          };

          await storage.createOrUpdateRankingSeason(rankingData);

          eligibleAthletes.push({
            ...athlete,
            points,
            wins,
            losses,
            winRate,
            totalMatches,
            previousPosition: null, // Será preenchido na atualização de posições
            recentMatches: []
          });
        }
      }


      // Ordenar por pontos (decrescente), depois por taxa de vitórias (decrescente)
      eligibleAthletes.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.winRate - a.winRate;
      });

      // Atualizar posições no ranking
      for (let i = 0; i < eligibleAthletes.length; i++) {
        const athlete = eligibleAthletes[i];
        
        // Buscar posição anterior do atleta nesta categoria/temporada
        const previousRanking = await storage.getRankingSeason(athlete.id, category.id, targetSeason);
        const previousPosition = previousRanking?.position || null;
        
        await storage.createOrUpdateRankingSeason({
          athleteId: athlete.id,
          categoryId: category.id,
          season: targetSeason,
          position: i + 1,
          previousPosition: previousPosition,
          points: athlete.points,
          wins: athlete.wins,
          losses: athlete.losses,
          winRate: athlete.winRate.toString(),
          totalMatches: athlete.totalMatches,
          eligibleByAge: !category.name.toLowerCase().includes('absoluto'),
          eligibleByParticipation: category.name.toLowerCase().includes('absoluto')
        });
        
        // Atualizar dados do atleta com a posição anterior
        (athlete as any).previousPosition = previousPosition;
      }

      res.json(eligibleAthletes);
    } catch (error) {
      console.error("Error fetching athletes ranking:", error);
      res.status(500).json({ error: "Failed to fetch athletes ranking" });
    }
  });

  // Normalizar todos os CPFs no banco (uma vez só)
  app.post("/api/fix-cpfs", async (req, res) => {
    try {
      const athletes = await storage.getAllAthletes();
      let fixedCount = 0;
      
      for (const athlete of athletes) {
        if (athlete.cpf && !athlete.cpf.includes('.')) {
          // Formatar CPF apenas se não tiver pontos
          const cpfNumbers = athlete.cpf.replace(/\D/g, '');
          if (cpfNumbers.length === 11) {
            const formattedCpf = `${cpfNumbers.slice(0,3)}.${cpfNumbers.slice(3,6)}.${cpfNumbers.slice(6,9)}-${cpfNumbers.slice(9)}`;
            await storage.updateAthlete(athlete.id, { cpf: formattedCpf });
            fixedCount++;
            console.log(`CPF corrigido: ${athlete.name} - ${athlete.cpf} → ${formattedCpf}`);
          }
        }
      }
      
      res.json({ message: `${fixedCount} CPFs corrigidos para o formato padrão` });
    } catch (error) {
      console.error("Erro ao corrigir CPFs:", error);
      res.status(500).json({ error: "Erro ao corrigir CPFs" });
    }
  });

  // Endpoint PÚBLICO para buscar dados básicos dos atletas (para visualização pública de torneios)
  app.get("/api/public/athletes", async (req, res) => {
    try {
      const athletes = await storage.getAllAthletes();
      // Retornar apenas dados básicos necessários para visualização pública
      const publicAthletes = athletes
        .filter(athlete => athlete.status === "approved") // Apenas atletas aprovados
        .map(athlete => ({
          id: athlete.id,
          name: athlete.name,
          photoUrl: athlete.photoUrl,
          city: athlete.city,
          state: athlete.state
        }));
      res.json(publicAthletes);
    } catch (error) {
      console.error("Error fetching public athletes:", error);
      res.status(500).json({ error: "Failed to fetch athletes" });
    }
  });

  // CADASTRO PÚBLICO - VERSÃO REAL COM BANCO DE DADOS
  app.post("/api/athletes/self-register", async (req, res) => {
    try {
      console.log("🎯 CADASTRO REAL - Dados recebidos:", req.body);
      
      const { name, email, birthDate, gender, street, neighborhood, zipCode, city, state, phone, photoUrl } = req.body;
      
      // Validação básica
      if (!name || !email || !birthDate || !gender) {
        return res.status(400).json({ error: "Campos obrigatórios: nome, email, data nascimento, gênero" });
      }
      
      // Criar atleta usando storage (conexão já configurada)
      const athleteData = {
        name,
        email,
        birthDate,
        gender,
        neighborhood: neighborhood || 'Centro',
        zipCode: zipCode || '00000000',
        city: city || 'Não informado',
        state: state || 'SP',
        phone: phone || '',
        street: street || '',
        cpf: req.body.cpf || '',
        rg: req.body.rg || '',
        photoUrl: photoUrl || '',
        status: 'pending' as const,
        type: 'atleta' as const,
        points: 0
      };
      
      // Verificar se existe atleta rejeitado com mesmo CPF ou Email para reutilizar
      const existingAthletes = await storage.getAllAthletes();
      let rejectedAthleteToReuse: any = null;
      
      if (req.body.cpf) {
        const existingCpf = existingAthletes.find(a => a.cpf === req.body.cpf);
        if (existingCpf && existingCpf.status === 'rejected') {
          console.log(`♻️ [Self-Register] Encontrado cadastro rejeitado para reutilizar - CPF: ${req.body.cpf}`);
          rejectedAthleteToReuse = existingCpf;
        }
      }
      
      if (!rejectedAthleteToReuse && email) {
        const existingEmail = existingAthletes.find(a => a.email === email);
        if (existingEmail && existingEmail.status === 'rejected') {
          console.log(`♻️ [Self-Register] Encontrado cadastro rejeitado para reutilizar - Email: ${email}`);
          rejectedAthleteToReuse = existingEmail;
        }
      }
      
      let athlete;
      if (rejectedAthleteToReuse) {
        console.log(`♻️ [Self-Register] Atualizando cadastro rejeitado ${rejectedAthleteToReuse.id} com novos dados`);
        athlete = await storage.updateAthlete(rejectedAthleteToReuse.id, athleteData);
        console.log("✅ Atleta rejeitado reutilizado e atualizado:", athlete.id);
      } else {
        athlete = await storage.createAthlete(athleteData);
        console.log("✅ Atleta salvo no banco:", athlete.id);
      }
      
      // Salvar consentimento LGPD se fornecido
      if (req.body.consentData && req.body.consentData.signature) {
        try {
          const consentData = req.body.consentData;
          const consentRecord = {
            athleteId: athlete.id,
            birthDate: consentData.birthDate,
            isMinor: consentData.isMinor,
            lgpdConsent: consentData.lgpdConsent,
            imageRightsConsent: consentData.imageRightsConsent,
            termsConsent: consentData.termsConsent,
            signature: consentData.signature,
            signerName: consentData.isMinor ? consentData.signerName : name,
            parentName: consentData.parentalData?.name || null,
            parentCpf: consentData.parentalData?.cpf || null,
            parentEmail: consentData.parentalData?.email || null,
            parentRelationship: consentData.parentalData?.relationship || null,
            consentTimestamp: consentData.consentTimestamp ? new Date(consentData.consentTimestamp) : new Date()
          };
          
          await storage.createConsent(consentRecord);
          console.log("✅ Consentimento LGPD salvo");
        } catch (consentError) {
          console.error("⚠️ Erro ao salvar consentimento:", consentError);
          // Não falhar o cadastro por causa do consentimento
        }
      }
      
      return res.status(201).json({
        success: true,
        athlete,
        message: "Cadastro realizado com sucesso! Aguarde aprovação do administrador."
      });
      
    } catch (error: any) {
      console.error("❌ Erro no cadastro real:", error);
      
      // Verificar se é erro de CPF duplicado
      if (error.message && error.message.includes('athletes_cpf_unique')) {
        return res.status(400).json({
          error: "CPF já cadastrado",
          message: "CPF já cadastrado. Entre em contato com a Administração: contato@tenisdemesa.biz",
          type: "duplicate_cpf"
        });
      }
      
      // Verificar se é erro de email duplicado
      if (error.message && error.message.includes('athletes_email_unique')) {
        return res.status(400).json({
          error: "Email já cadastrado",
          message: "Email já cadastrado. Entre em contato com a Administração: contato@tenisdemesa.biz",
          type: "duplicate_email"
        });
      }
      
      return res.status(500).json({
        error: "Falha no cadastro",
        message: error.message || "Erro desconhecido",
        details: error.toString()
      });
    }
  });

  // Dashboard statistics endpoint
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      console.log("🔍 [/api/dashboard/stats] Iniciando busca de estatísticas...");
      console.log("🔍 [/api/dashboard/stats] User autenticado:", req.user ? `${req.user.username} (ID: ${req.user.id})` : "NENHUM");
      
      const statsResult = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM athletes WHERE status = 'approved') as total_athletes,
          (SELECT COUNT(*) FROM athletes WHERE status = 'approved' AND LOWER(gender) IN ('masculino', 'male')) as male_athletes,
          (SELECT COUNT(*) FROM athletes WHERE status = 'approved' AND LOWER(gender) IN ('feminino', 'female')) as female_athletes,
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM tournaments WHERE status IN ('active', 'registration_open', 'in_progress')) as active_tournaments,
          (SELECT COUNT(*) FROM teams) as total_teams,
          (SELECT COALESCE(SUM(amount), 0) FROM revenues) as total_revenue,
          (SELECT COALESCE(SUM(amount), 0) FROM expenses) as total_expenses,
          (SELECT COALESCE(SUM(amount), 0) FROM revenues WHERE LOWER(category) = 'mensalidade') as monthly_revenue
      `);

      const stats = statsResult.rows[0];
      
      console.log(`✅ [/api/dashboard/stats] Estatísticas obtidas:`, {
        totalAthletes: stats.total_athletes,
        totalUsers: stats.total_users,
        activeTournaments: stats.active_tournaments
      });
      
      res.json({
        totalAthletes: parseInt(stats.total_athletes as string) || 0,
        maleAthletes: parseInt(stats.male_athletes as string) || 0,
        femaleAthletes: parseInt(stats.female_athletes as string) || 0,
        totalUsers: parseInt(stats.total_users as string) || 0,
        activeTournaments: parseInt(stats.active_tournaments as string) || 0,
        totalTeams: parseInt(stats.total_teams as string) || 0,
        totalRevenue: parseFloat(stats.total_revenue as string) || 0,
        totalExpenses: parseFloat(stats.total_expenses as string) || 0,
        monthlyRevenue: parseFloat(stats.monthly_revenue as string) || 0,
      });
    } catch (error) {
      console.error("❌ [/api/dashboard/stats] ERRO:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Buscar atleta por CPF ou email para inscrição
  app.get("/api/athletes/search", async (req, res) => {
    try {
      const { cpf: cpfParam, email: emailParam, birthDate: birthDateParam } = req.query;
      
      // Converter parâmetros para string
      const cpf = Array.isArray(cpfParam) ? cpfParam[0] : cpfParam as string;
      const email = Array.isArray(emailParam) ? emailParam[0] : emailParam as string;
      const birthDate = Array.isArray(birthDateParam) ? birthDateParam[0] : birthDateParam as string;
      
      if (!cpf && !email) {
        return res.status(400).json({ error: "CPF ou email é obrigatório" });
      }
      
      const athletes = await storage.getAllAthletes();
      let athlete = null;
      
      if (cpf) {
        athlete = athletes.find(a => {
          const statusMatch = a.status === 'approved';
          
          // Busca flexível: formato exato OU números apenas
          const exactMatch = a.cpf === cpf;
          const normalizedMatch = a.cpf && cpf && 
            a.cpf.replace(/\D/g, '') === (cpf as string).replace(/\D/g, '');
          
          const cpfMatch = exactMatch || normalizedMatch;
          
          // Busca por CPF + Status approved
          return cpfMatch && statusMatch;
        });
      } else if (email) {
        athlete = athletes.find(a => a.email === email && a.status === 'approved');
      }
      
      
      if (!athlete) {
        // Verificar se existe atleta com o mesmo email mas dados diferentes
        if (email) {
          const athleteByEmail = athletes.find(a => a.email === email);
          if (athleteByEmail) {
            return res.status(409).json({ 
              error: "Já existe um atleta com esse email, mas com dados diferentes",
              details: {
                foundCpf: athleteByEmail.cpf,
                foundBirthDate: athleteByEmail.birthDate,
                searchedCpf: cpf,
                searchedBirthDate: birthDate
              }
            });
          }
        }
        
        return res.status(404).json({ error: "Atleta não encontrado" });
      }
      
      res.json(athlete);
    } catch (error) {
      console.error("Error searching athlete:", error);
      res.status(500).json({ error: "Erro na busca" });
    }
  });

  // Rota genérica por ID deve vir por último
  app.get("/api/athletes/:id", async (req, res) => {
    try {
      const athlete = await storage.getAthlete(req.params.id);
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      res.json(athlete);
    } catch (error) {
      console.error("Error fetching athlete:", error);
      res.status(500).json({ error: "Failed to fetch athlete" });
    }
  });

  app.post("/api/athletes", requireAuth, requirePermission("athletes.create"), async (req, res) => {
    try {
      const validatedData = insertAthleteSchema.parse(req.body);
      
      // Check for unique fields
      const existingAthletes = await storage.getAllAthletes();
      
      // Check CPF (if provided)
      if (validatedData.cpf) {
        const existingCpf = existingAthletes.find(a => a.cpf === validatedData.cpf);
        
        if (existingCpf) {
          // Se o cadastro foi rejeitado, permitir atualização com novos dados
          if (existingCpf.status === 'rejected') {
            console.log(`♻️ Reaproveitando cadastro rejeitado para CPF: ${validatedData.cpf}`);
            const updatedAthlete = await storage.updateAthlete(existingCpf.id, {
              ...validatedData,
              status: 'pending' // Resetar para pending para nova aprovação
            });
            
            // Se há dados de consentimento, salvar na tabela de consentimentos
            if (req.body.consentData && req.body.consentData.signature) {
              try {
                await storage.saveAthleteConsent({
                  athleteId: existingCpf.id,
                  birthDate: req.body.consentData.birthDate,
                  isMinor: req.body.consentData.isMinor,
                  lgpdConsent: req.body.consentData.lgpdConsent,
                  imageRightsConsent: req.body.consentData.imageRightsConsent,
                  termsConsent: req.body.consentData.termsConsent,
                  signature: req.body.consentData.signature,
                  signerName: req.body.consentData.isMinor ? req.body.consentData.signerName : validatedData.name,
                  parentName: req.body.consentData.parentalData?.parentName || null,
                  parentCpf: req.body.consentData.parentalData?.parentCpf || null,
                  parentEmail: req.body.consentData.parentalData?.parentEmail || null,
                  parentPhone: req.body.consentData.parentalData?.parentPhone || null,
                  parentRelationship: req.body.consentData.parentalData?.parentRelationship || null
                });
              } catch (consentError) {
                console.error("⚠️ Erro ao salvar consentimento:", consentError);
              }
            }
            
            return res.status(201).json(updatedAthlete);
          }
          
          // Se não foi rejeitado, é um CPF realmente duplicado
          return res.status(400).json({ 
            error: "CPF já cadastrado", 
            message: "Este CPF já está cadastrado no sistema. Se você já tem cadastro, entre em contato com os administradores para verificar sua situação." 
          });
        }
      }
      
      // Check RG (if provided)
      if (validatedData.rg) {
        const existingRg = existingAthletes.find(a => a.rg === validatedData.rg);
        if (existingRg && existingRg.status !== 'rejected') {
          return res.status(400).json({ 
            error: "RG já cadastrado", 
            message: "Este RG já está cadastrado no sistema. Se você já tem cadastro, entre em contato com os administradores para verificar sua situação." 
          });
        }
      }
      
      // Check Email
      if (validatedData.email) {
        const existingEmail = existingAthletes.find(a => a.email === validatedData.email);
        
        if (existingEmail) {
          // Se o cadastro foi rejeitado, permitir atualização com novos dados
          if (existingEmail.status === 'rejected') {
            console.log(`♻️ Reaproveitando cadastro rejeitado para Email: ${validatedData.email}`);
            const updatedAthlete = await storage.updateAthlete(existingEmail.id, {
              ...validatedData,
              status: 'pending'
            });
            
            // Se há dados de consentimento, salvar
            if (req.body.consentData && req.body.consentData.signature) {
              try {
                await storage.saveAthleteConsent({
                  athleteId: existingEmail.id,
                  birthDate: req.body.consentData.birthDate,
                  isMinor: req.body.consentData.isMinor,
                  lgpdConsent: req.body.consentData.lgpdConsent,
                  imageRightsConsent: req.body.consentData.imageRightsConsent,
                  termsConsent: req.body.consentData.termsConsent,
                  signature: req.body.consentData.signature,
                  signerName: req.body.consentData.isMinor ? req.body.consentData.signerName : validatedData.name,
                  parentName: req.body.consentData.parentalData?.parentName || null,
                  parentCpf: req.body.consentData.parentalData?.parentCpf || null,
                  parentEmail: req.body.consentData.parentalData?.parentEmail || null,
                  parentPhone: req.body.consentData.parentalData?.parentPhone || null,
                  parentRelationship: req.body.consentData.parentalData?.parentRelationship || null
                });
              } catch (consentError) {
                console.error("⚠️ Erro ao salvar consentimento:", consentError);
              }
            }
            
            return res.status(201).json(updatedAthlete);
          }
          
          return res.status(400).json({ 
            error: "Email já cadastrado", 
            message: "Este email já está em uso no sistema. Por favor, use um email diferente ou entre em contato conosco se este é seu email." 
          });
        }
      }
      
      const athlete = await storage.createAthlete(validatedData);
      
      // Se há dados de consentimento, salvar na tabela de consentimentos
      if (req.body.consentData && req.body.consentData.signature) {
        try {
          const consentData = req.body.consentData;
          const consentRecord = {
            athleteId: athlete.id,
            birthDate: consentData.birthDate,
            isMinor: consentData.isMinor,
            lgpdConsent: consentData.lgpdConsent,
            imageRightsConsent: consentData.imageRightsConsent,
            termsConsent: consentData.termsConsent,
            signature: consentData.signature,
            signerName: consentData.isMinor ? consentData.signerName : name,
            parentName: consentData.parentalData?.name || null,
            parentCpf: consentData.parentalData?.cpf || null,
            parentEmail: consentData.parentalData?.email || null,
            parentRelationship: consentData.parentalData?.relationship || null,
            consentTimestamp: consentData.consentTimestamp ? new Date(consentData.consentTimestamp) : new Date()
          };
          
          await storage.createConsent(consentRecord);
          console.log("Consent data saved successfully for athlete:", athlete.id);
        } catch (consentError) {
          console.error("Error saving consent data:", consentError);
          // Não falhar a criação do atleta por causa do consentimento
        }
      }
      
      res.status(201).json(athlete);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      
      // Verificar se é erro de constraint única do banco
      if (error.message && error.message.includes('athletes_cpf_unique')) {
        console.log("⚠️ [POST /api/athletes] Constraint violation - CPF já cadastrado detectado no catch");
        return res.status(400).json({
          error: "CPF já cadastrado",
          message: "CPF já cadastrado. Este CPF já está cadastrado no sistema. Se você já tem cadastro, entre em contato com os administradores para verificar sua situação."
        });
      }
      
      if (error.message && error.message.includes('athletes_email_unique')) {
        console.log("⚠️ [POST /api/athletes] Constraint violation - Email já cadastrado detectado no catch");
        return res.status(400).json({
          error: "Email já cadastrado",
          message: "Email já cadastrado. Este email já está em uso no sistema. Por favor, use um email diferente ou entre em contato conosco se este é seu email."
        });
      }
      
      if (error.message && error.message.includes('athletes_rg_unique')) {
        console.log("⚠️ [POST /api/athletes] Constraint violation - RG já cadastrado detectado no catch");
        return res.status(400).json({
          error: "RG já cadastrado",
          message: "RG já cadastrado. Este RG já está cadastrado no sistema. Se você já tem cadastro, entre em contato com os administradores para verificar sua situação."
        });
      }
      
      console.error("Error creating athlete:", error);
      res.status(500).json({ 
        error: "Failed to create athlete",
        message: "Ocorreu um erro inesperado ao cadastrar o atleta."
      });
    }
  });

  app.patch("/api/athletes/:id", requireAuth, requirePermission("athletes.update"), async (req, res) => {
    try {
      console.log("=== ATHLETE UPDATE DEBUG ===");
      console.log("Raw body gender:", req.body.gender);
      const athlete = await storage.updateAthlete(req.params.id, req.body);
      console.log("Updated athlete gender:", athlete?.gender);
      if (!athlete) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      res.json(athlete);
    } catch (error) {
      console.error("Error updating athlete:", error);
      res.status(500).json({ error: "Failed to update athlete" });
    }
  });

  app.delete("/api/athletes/:id", requireAuth, requirePermission("athletes.delete"), async (req, res) => {
    try {
      const success = await storage.deleteAthlete(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Athlete not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting athlete:", error);
      res.status(500).json({ error: "Failed to delete athlete" });
    }
  });

  // ===========================
  // Teams routes (PROTEGIDAS)  
  // ===========================
  
  // Listar todas as equipes
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Buscar equipe por ID
  app.get("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // Criar nova equipe
  app.post("/api/teams", requireAuth, requirePermission("teams.create"), async (req, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid team data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create team" });
      }
    }
  });

  // Atualizar equipe
  app.put("/api/teams/:id", requireAuth, requirePermission("teams.manage"), async (req, res) => {
    try {
      const validatedData = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(req.params.id, validatedData);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid team data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update team" });
      }
    }
  });

  // Deletar equipe
  app.delete("/api/teams/:id", requireAuth, requirePermission("teams.delete"), async (req, res) => {
    try {
      const success = await storage.deleteTeam(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  // ===========================
  // Team Members routes  
  // ===========================
  
  // Listar membros de uma equipe
  app.get("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      const members = await storage.getTeamMembers(req.params.teamId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Listar membros de uma equipe com dados dos atletas
  app.get("/api/teams/:teamId/members/with-athletes", requireAuth, async (req, res) => {
    try {
      console.log("\u2699\ufe0f DEBUG MEMBERS - Team ID:", req.params.teamId);
      const members = await storage.getTeamMembersWithAthletes(req.params.teamId);
      console.log("\u2699\ufe0f DEBUG MEMBERS - Resultado:", members.length, "membros");
      console.log("\u2699\ufe0f DEBUG MEMBERS - Dados:", JSON.stringify(members, null, 2));
      res.json(members);
    } catch (error) {
      console.error("\u274c Error fetching team members with athletes:", error);
      res.status(500).json({ error: "Failed to fetch team members with athletes" });
    }
  });

  // Adicionar membro à equipe
  app.post("/api/teams/:teamId/members", requireAuth, requirePermission("teams.manage"), async (req, res) => {
    try {
      console.log("\u26a1 DEBUG ADD MEMBER - Dados recebidos:", req.body);
      console.log("\u26a1 DEBUG ADD MEMBER - Team ID:", req.params.teamId);
      
      const validatedData = insertTeamMemberSchema.parse({
        ...req.body,
        teamId: req.params.teamId
      });
      
      console.log("\u26a1 DEBUG ADD MEMBER - Dados validados:", validatedData);
      
      // VALIDAÇÃO: Verificar se o atleta já está na equipe
      const existingMembers = await storage.getTeamMembers(req.params.teamId);
      console.log("\u26a1 DEBUG ADD MEMBER - Membros existentes:", existingMembers.length);
      
      const isAthleteAlreadyInTeam = existingMembers.some(member => member.athleteId === validatedData.athleteId);
      console.log("\u26a1 DEBUG ADD MEMBER - Atleta já na equipe:", isAthleteAlreadyInTeam);
      
      if (isAthleteAlreadyInTeam) {
        console.log("❌ ERRO: Atleta já está na equipe");
        return res.status(400).json({ error: "Este atleta já está na equipe" });
      }
      
      // VALIDAÇÃO: Verificar se a posição já existe
      const isBoardOrderTaken = existingMembers.some(member => member.boardOrder === validatedData.boardOrder);
      console.log("\u26a1 DEBUG ADD MEMBER - Posição já ocupada:", isBoardOrderTaken);
      
      if (isBoardOrderTaken) {
        console.log("❌ ERRO: Posição já está ocupada");
        return res.status(400).json({ error: "Esta posição já está ocupada" });
      }
      
      console.log("\u2705 VALIDACOES OK - Criando membro");
      const member = await storage.createTeamMember(validatedData);
      console.log("\u2705 MEMBRO CRIADO:", member);
      res.status(201).json(member);
    } catch (error) {
      console.error("❌ Error adding team member:", error);
      if (error instanceof z.ZodError) {
        console.log("❌ ERRO ZOD:", error.errors);
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else if (error && typeof error === 'object' && 'code' in error) {
        // Erros de constraint do PostgreSQL
        console.log("❌ ERRO DB CODE:", error.code, "CONSTRAINT:", error.constraint);
        if (error.code === '23505') {
          if (error.constraint?.includes('athlete_id')) {
            res.status(400).json({ error: "Este atleta já está na equipe" });
          } else if (error.constraint?.includes('board_order')) {
            res.status(400).json({ error: "Esta posição já está ocupada" });
          } else {
            res.status(400).json({ error: "Membro duplicado" });
          }
        } else {
          res.status(500).json({ error: "Erro interno do servidor" });
        }
      } else {
        console.log("❌ ERRO GENERICO:", error);
        res.status(500).json({ error: "Falha ao adicionar membro" });
      }
    }
  });

  // Atualizar membro da equipe
  app.put("/api/team-members/:id", requireAuth, requirePermission("teams.manage"), async (req, res) => {
    try {
      const validatedData = insertTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateTeamMember(req.params.id, validatedData);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error updating team member:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid team member data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update team member" });
      }
    }
  });

  // Remover membro da equipe
  app.delete("/api/team-members/:id", requireAuth, requirePermission("teams.manage"), async (req, res) => {
    try {
      const success = await storage.deleteTeamMember(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // ===========================
  // Tournament Teams routes  
  // ===========================
  
  // Listar equipes de um torneio
  app.get("/api/tournaments/:tournamentId/teams", requireAuth, async (req, res) => {
    try {
      const { categoryId } = req.query;
      const teams = await storage.getTournamentTeams(req.params.tournamentId, categoryId as string);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching tournament teams:", error);
      res.status(500).json({ error: "Failed to fetch tournament teams" });
    }
  });

  // Listar equipes de uma categoria com dados da equipe
  app.get("/api/tournaments/:tournamentId/categories/:categoryId/teams", requireAuth, async (req, res) => {
    try {
      const teams = await storage.getTeamsByTournamentCategory(req.params.tournamentId, req.params.categoryId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams by category:", error);
      res.status(500).json({ error: "Failed to fetch teams by category" });
    }
  });

  // Inscrever equipe em torneio/categoria
  app.post("/api/tournaments/:tournamentId/teams", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const validatedData = insertTournamentTeamSchema.parse({
        ...req.body,
        tournamentId: req.params.tournamentId
      });
      const tournamentTeam = await storage.createTournamentTeam(validatedData);
      res.status(201).json(tournamentTeam);
    } catch (error) {
      console.error("Error registering team in tournament:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tournament team data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to register team in tournament" });
      }
    }
  });

  // Atualizar inscrição de equipe
  app.put("/api/tournament-teams/:id", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const validatedData = insertTournamentTeamSchema.partial().parse(req.body);
      const tournamentTeam = await storage.updateTournamentTeam(req.params.id, validatedData);
      if (!tournamentTeam) {
        return res.status(404).json({ error: "Tournament team not found" });
      }
      res.json(tournamentTeam);
    } catch (error) {
      console.error("Error updating tournament team:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tournament team data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update tournament team" });
      }
    }
  });

  // Remover equipe do torneio
  app.delete("/api/tournament-teams/:id", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const success = await storage.deleteTournamentTeam(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tournament team not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team from tournament:", error);
      res.status(500).json({ error: "Failed to remove team from tournament" });
    }
  });

  // ===========================
  // Team Ties routes  
  // ===========================
  
  // Listar confrontos entre equipes
  app.get("/api/tournaments/:tournamentId/ties", requireAuth, async (req, res) => {
    try {
      const { categoryId } = req.query;
      const ties = await storage.getTeamTies(req.params.tournamentId, categoryId as string);
      res.json(ties);
    } catch (error) {
      console.error("Error fetching team ties:", error);
      res.status(500).json({ error: "Failed to fetch team ties" });
    }
  });

  // Buscar confronto por ID
  app.get("/api/ties/:id", requireAuth, async (req, res) => {
    try {
      const tie = await storage.getTeamTie(req.params.id);
      if (!tie) {
        return res.status(404).json({ error: "Team tie not found" });
      }
      res.json(tie);
    } catch (error) {
      console.error("Error fetching team tie:", error);
      res.status(500).json({ error: "Failed to fetch team tie" });
    }
  });

  // Criar confronto entre equipes
  app.post("/api/tournaments/:tournamentId/ties", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const validatedData = insertTeamTieSchema.parse({
        ...req.body,
        tournamentId: req.params.tournamentId
      });
      const tie = await storage.createTeamTie(validatedData);
      res.status(201).json(tie);
    } catch (error) {
      console.error("Error creating team tie:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid team tie data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create team tie" });
      }
    }
  });

  // Criar confronto com partidas filhas automaticamente
  app.post("/api/tournaments/:tournamentId/ties/with-matches", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const { tie, matches } = req.body;
      const validatedTie = insertTeamTieSchema.parse({
        ...tie,
        tournamentId: req.params.tournamentId
      });
      
      const validatedMatches = matches.map((match: any) => insertMatchSchema.parse(match));
      
      const result = await storage.createTieWithChildren(validatedTie, validatedMatches);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating team tie with matches:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tie or match data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create team tie with matches" });
      }
    }
  });

  // Atualizar confronto
  app.put("/api/ties/:id", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const validatedData = insertTeamTieSchema.partial().parse(req.body);
      const tie = await storage.updateTeamTie(req.params.id, validatedData);
      if (!tie) {
        return res.status(404).json({ error: "Team tie not found" });
      }
      res.json(tie);
    } catch (error) {
      console.error("Error updating team tie:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid team tie data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update team tie" });
      }
    }
  });

  // Recalcular pontuação do confronto baseado nas partidas filhas
  app.put("/api/ties/:id/recalculate-score", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const tie = await storage.updateTieScoreFromChildMatches(req.params.id);
      if (!tie) {
        return res.status(404).json({ error: "Team tie not found" });
      }
      res.json(tie);
    } catch (error) {
      console.error("Error recalculating tie score:", error);
      res.status(500).json({ error: "Failed to recalculate tie score" });
    }
  });

  // Deletar confronto
  app.delete("/api/ties/:id", requireAuth, requirePermission("tournaments.manage"), async (req, res) => {
    try {
      const success = await storage.deleteTeamTie(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Team tie not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team tie:", error);
      res.status(500).json({ error: "Failed to delete team tie" });
    }
  });

  // Listar confrontos por categoria e fase
  app.get("/api/tournaments/:tournamentId/categories/:categoryId/ties/:phase", requireAuth, async (req, res) => {
    try {
      const ties = await storage.getTiesByCategoryPhase(req.params.tournamentId, req.params.categoryId, req.params.phase);
      res.json(ties);
    } catch (error) {
      console.error("Error fetching ties by phase:", error);
      res.status(500).json({ error: "Failed to fetch ties by phase" });
    }
  });

  // Obter classificação de grupos para equipes
  app.get("/api/tournaments/:tournamentId/categories/:categoryId/team-group-standings", requireAuth, async (req, res) => {
    try {
      const standings = await storage.computeTeamGroupStandings(req.params.tournamentId, req.params.categoryId);
      res.json(standings);
    } catch (error) {
      console.error("Error computing team group standings:", error);
      res.status(500).json({ error: "Failed to compute team group standings" });
    }
  });

  // Consents routes
  app.get("/api/consents", async (req, res) => {
    try {
      const consents = await storage.getAllConsents();
      res.json(consents);
    } catch (error) {
      console.error("Error fetching consents:", error);
      res.status(500).json({ error: "Failed to fetch consents" });
    }
  });

  app.get("/api/consents/:athleteId", async (req, res) => {
    try {
      const consent = await storage.getConsent(req.params.athleteId);
      if (!consent) {
        return res.status(404).json({ error: "Consent not found" });
      }
      res.json(consent);
    } catch (error) {
      console.error("Error fetching consent:", error);
      res.status(500).json({ error: "Failed to fetch consent" });
    }
  });

  app.post("/api/consents", async (req, res) => {
    try {
      const validatedData = insertConsentSchema.parse(req.body);
      const consent = await storage.createConsent(validatedData);
      res.status(201).json(consent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating consent:", error);
      res.status(500).json({ error: "Failed to create consent" });
    }
  });

  app.delete("/api/consents/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteConsent(id);
      if (success) {
        res.json({ message: "Consent deleted successfully" });
      } else {
        res.status(404).json({ error: "Consent not found" });
      }
    } catch (error) {
      console.error("Error deleting consent:", error);
      res.status(500).json({ error: "Failed to delete consent" });
    }
  });

  // Tournament registration with complete validation and transaction support
  app.post("/api/tournaments/register", async (req, res) => {
    // Start database transaction
    const transaction = await db.transaction(async (tx) => {
      try {
        // 1. Input validation using Zod schema
        console.log("🔍 Validating registration data...");
        console.log("📥 Incoming request body:", JSON.stringify(req.body, null, 2));
        
        const validatedData = tournamentRegistrationSchema.parse(req.body);
        console.log("✅ Input validation passed");
        
        // Convert empty strings to undefined for optional category fields
        const { tournamentId, category: rawCategory, technicalCategory: rawTechnicalCategory, athleteId, consentData, ...athleteData } = validatedData;
        const categoryId = rawCategory && rawCategory !== '' ? rawCategory : undefined;
        const technicalCategoryId = rawTechnicalCategory && rawTechnicalCategory !== '' ? rawTechnicalCategory : undefined;
        
        // 2. Validate tournament exists and is accepting registrations
        console.log(`🏆 Validating tournament ${tournamentId}...`);
        const tournament = await storage.getTournament(tournamentId);
        if (!tournament) {
          throw new Error("Torneio não encontrado");
        }
        
        // Verificar se torneio aceita inscrições online
        if (tournament.status === 'completed') {
          throw new Error("Este torneio já foi finalizado");
        }
        
        if (tournament.status === 'in_progress') {
          throw new Error("Este torneio já está em andamento e não aceita mais inscrições online");
        }
        
        if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
          throw new Error("Prazo de inscrição expirado");
        }
        
        // Verificar se status permite inscrições online (draft ou registration_open)
        if (!['draft', 'registration_open'].includes(tournament.status)) {
          throw new Error("Inscrições online não estão abertas para este torneio");
        }
        
        // 3. Validate categories - at least one must be provided
        console.log(`📋 Validating categories...`);
        
        // Ensure at least one category is selected
        if (!categoryId && !technicalCategoryId) {
          throw new Error("É necessário selecionar ao menos uma categoria (por idade ou técnica)");
        }
        
        const tournamentCategories = await storage.getTournamentCategories(tournamentId);
        
        // Validate age category if provided
        let selectedAgeCategory = null;
        if (categoryId) {
          selectedAgeCategory = tournamentCategories.find(cat => cat.id === categoryId);
          if (!selectedAgeCategory) {
            throw new Error("Categoria por idade selecionada não pertence a este torneio");
          }
          console.log(`✅ Age category validated: ${selectedAgeCategory.name}`);
        }
        
        // Validate technical category if provided
        let selectedTechnicalCategory = null;
        if (technicalCategoryId) {
          selectedTechnicalCategory = tournamentCategories.find(cat => cat.id === technicalCategoryId);
          if (!selectedTechnicalCategory) {
            throw new Error("Categoria técnica selecionada não pertence a este torneio");
          }
          console.log(`✅ Technical category validated: ${selectedTechnicalCategory.name}`);
        }
        
        // 4. Athlete eligibility validation
        console.log(`👤 Validating athlete eligibility...`);
        const tournamentYear = extractYearFromDate(tournament.startDate?.toISOString() || new Date().toISOString());
        const ageInTournament = calculateAgeInTournamentYear(athleteData.birthDate, tournamentYear);
        
        // Validate eligibility for ALL selected categories (age and/or technical)
        const categoriesToValidate = [selectedAgeCategory, selectedTechnicalCategory].filter(Boolean);
        
        for (const category of categoriesToValidate) {
          if (!category) continue;
          
          // Validate age eligibility (skip for "absoluto" categories)
          if (!category.name.toLowerCase().includes('absoluto')) {
            if (category.minAge !== null && ageInTournament < category.minAge) {
              throw new Error(`Idade mínima para a categoria ${category.name}: ${category.minAge} anos`);
            }
            if (category.maxAge !== null && ageInTournament > category.maxAge) {
              throw new Error(`Idade máxima para a categoria ${category.name}: ${category.maxAge} anos`);
            }
          }
          
          // Validate gender eligibility
          if (category.gender !== 'mista') {
            const normalizedAthleteGender = athleteData.gender === 'masculino' ? 'masculino' : 'feminino';
            const normalizedCategoryGender = category.gender === 'masculino' ? 'masculino' : 'feminino';
            
            if (normalizedAthleteGender !== normalizedCategoryGender) {
              throw new Error(`A categoria ${category.name} é exclusiva para o sexo ${category.gender}`);
            }
          }
        }
        
        let finalAthleteId = athleteId;
        let createdNewAthlete = false;
        
        // 5. Handle athlete creation/validation
        if (!athleteId) {
          console.log("👤 Creating new athlete...");
          
          // Check for existing athlete with same CPF or email
          const existingAthletes = await storage.getAllAthletes();
          
          let rejectedAthleteToReuse: any = null;
          
          if (athleteData.cpf) {
            const existingCpf = existingAthletes.find(a => a.cpf === athleteData.cpf);
            if (existingCpf) {
              if (existingCpf.status === 'rejected') {
                console.log(`♻️ Encontrado cadastro rejeitado para reutilizar - CPF: ${athleteData.cpf}`);
                rejectedAthleteToReuse = existingCpf;
              } else {
                throw new Error(`Este CPF já está cadastrado para o atleta "${existingCpf.name}". Se você já tem uma conta, use a opção "Buscar Atleta" na página de inscrição.`);
              }
            }
          }
          
          if (!rejectedAthleteToReuse && athleteData.email) {
            const existingEmail = existingAthletes.find(a => a.email === athleteData.email);
            if (existingEmail) {
              if (existingEmail.status === 'rejected') {
                console.log(`♻️ Encontrado cadastro rejeitado para reutilizar - Email: ${athleteData.email}`);
                rejectedAthleteToReuse = existingEmail;
              } else {
                throw new Error(`Este email já está cadastrado para o atleta "${existingEmail.name}".`);
              }
            }
          }
          
          // Se encontrou um atleta rejeitado, reutilizar atualizando os dados
          if (rejectedAthleteToReuse) {
            console.log(`♻️ Atualizando cadastro rejeitado ${rejectedAthleteToReuse.id} com novos dados`);
            const updatedAthlete = await storage.updateAthlete(rejectedAthleteToReuse.id, {
              ...athleteData,
              photoUrl: athleteData.photoUrl || '',
              status: 'pending' // Resetar para pending para nova aprovação
            });
            
            finalAthleteId = rejectedAthleteToReuse.id;
            createdNewAthlete = true; // Considerar como novo para o fluxo
            console.log(`✅ Athlete reused and updated: ${finalAthleteId}`);
          } else {
            // Create new athlete
            const newAthlete = await storage.createAthlete({
              ...athleteData,
              photoUrl: athleteData.photoUrl || '',
              status: 'pending' // New athletes need approval
            });
            
            finalAthleteId = newAthlete.id;
            createdNewAthlete = true;
            console.log(`✅ New athlete created: ${finalAthleteId}`);
          }
          
          // Save consent data if provided
          if (consentData?.signature) {
            try {
              const consentRecord = {
                athleteId: newAthlete.id,
                birthDate: consentData.birthDate,
                isMinor: consentData.isMinor,
                lgpdConsent: consentData.lgpdConsent,
                imageRightsConsent: consentData.imageRightsConsent,
                termsConsent: consentData.termsConsent,
                signature: consentData.signature,
                signerName: consentData.isMinor ? (consentData.signerName || athleteData.name) : athleteData.name,
                parentName: consentData.parentalData?.parentName || null,
                parentCpf: consentData.parentalData?.parentCpf || null,
                parentEmail: consentData.parentalData?.parentEmail || null,
                parentRelationship: consentData.parentalData?.relationship || null,
                consentTimestamp: consentData.consentTimestamp ? new Date(consentData.consentTimestamp) : new Date()
              };
              
              await storage.createConsent(consentRecord);
              console.log("✅ LGPD consent saved successfully");
            } catch (consentError) {
              console.error("⚠️ Failed to save consent (non-critical):", consentError);
            }
          }
        } else {
          // Validate existing athlete exists
          const existingAthlete = await storage.getAthlete(athleteId);
          if (!existingAthlete) {
            throw new Error("Atleta não encontrado");
          }
          finalAthleteId = athleteId;
        }
        
        // 6. Check for duplicate participation
        console.log(`🔍 Checking for duplicate participation...`);
        const existingParticipantsWithCategories = await storage.getTournamentParticipantsWithCategories(tournamentId);
        const alreadyRegistered = existingParticipantsWithCategories.some(p => p.athleteId === finalAthleteId);
        
        if (alreadyRegistered) {
          throw new Error("Você já está inscrito neste torneio");
        }
        
        // 7. Check category participant limit
        const categoryParticipants = await storage.getTournamentParticipantsWithCategories(tournamentId);
        const categoryParticipantCount = categoryParticipants.filter(p => p.categoryId === categoryId).length;
        
        // Note: maxParticipants per category would need to be added to the schema
        // For now, checking global tournament limit
        if (tournament.maxParticipants && existingParticipantsWithCategories.length >= tournament.maxParticipants) {
          throw new Error("Torneio já atingiu o limite máximo de participantes");
        }
        
        // 8. Create participation record
        console.log(`🎾 Creating participation record...`);
        const participation = await storage.addParticipant({
          tournamentId,
          athleteId: finalAthleteId,
          categoryId,
          technicalCategoryId
        });
        
        console.log(`✅ Registration completed successfully:`, {
          athleteId: finalAthleteId,
          tournamentId,
          categoryId,
          registrationNumber: participation.registrationNumber
        });
        
        // 9. Return success response with consistent data
        const responseData = {
          success: true,
          message: createdNewAthlete 
            ? "Inscrição realizada com sucesso! Sua conta foi criada e você foi inscrito no torneio."
            : "Inscrição realizada com sucesso!",
          athleteId: finalAthleteId,
          participation: {
            ...participation,
            registrationNumber: participation.registrationNumber // Ensure it's always present
          },
          ...(createdNewAthlete && {
            requiresApproval: true,
            status: 'pending'
          })
        };
        
        return { status: 201, data: responseData };
        
      } catch (error) {
        // Log detailed error for debugging
        const err = error as Error;
        console.error("❌ Tournament registration error:", {
          error: err.message,
          stack: err.stack,
          body: req.body
        });
        
        // Handle validation errors specifically
        if (error instanceof z.ZodError) {
          console.error("🚨 Zod Validation Error Details:");
          console.error("Request body that failed validation:", JSON.stringify(req.body, null, 2));
          console.error("Validation errors:");
          error.errors.forEach((err, index) => {
            console.error(`  ${index + 1}. Field: ${err.path.join('.')} | Error: ${err.message} | Code: ${err.code}`);
            if (err.path.join('.') === 'photoUrl') {
              console.error(`     photoUrl value received: "${req.body.photoUrl}" (type: ${typeof req.body.photoUrl}, length: ${req.body.photoUrl?.length || 0})`);
            }
          });
          
          // Create user-friendly error message focusing on the first error
          const firstError = error.errors[0];
          const fieldName = firstError.path.join('.');
          let userMessage = firstError.message;
          
          // Map technical field names to user-friendly names
          const fieldMap: Record<string, string> = {
            'photoUrl': 'Foto do rosto',
            'name': 'Nome',
            'email': 'Email',
            'birthDate': 'Data de nascimento',
            'gender': 'Sexo',
            'category': 'Categoria por idade',
            'technicalCategory': 'Categoria técnica',
            'zipCode': 'CEP',
            'city': 'Cidade',
            'state': 'Estado',
            'neighborhood': 'Bairro'
          };
          
          const friendlyFieldName = fieldMap[fieldName] || fieldName;
          
          return {
            status: 400,
            data: {
              error: "Dados inválidos",
              message: `${friendlyFieldName}: ${userMessage}`,
              details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            }
          };
        }
        
        // Handle known business logic errors
        const knownErrors = [
          "Torneio não encontrado",
          "Este torneio já foi finalizado", 
          "Prazo de inscrição expirado",
          "Categoria selecionada não pertence a este torneio",
          "CPF já está cadastrado",
          "email já está cadastrado",
          "Você já está inscrito",
          "limite máximo de participantes",
          "Atleta não encontrado",
          "Idade mínima",
          "Idade máxima",
          "categoria é exclusiva"
        ];
        
        const err2 = error as Error;
        const isKnownError = knownErrors.some(knownError => 
          err2.message.toLowerCase().includes(knownError.toLowerCase())
        );
        
        if (isKnownError) {
          return {
            status: 400,
            data: {
              error: "Erro na inscrição",
              message: (error as Error).message
            }
          };
        }
        
        // Generic error for unknown issues
        return {
          status: 500,
          data: {
            error: "Erro interno",
            message: "Ocorreu um erro ao processar sua inscrição. Tente novamente."
          }
        };
      }
    });
    
    // Send the response after transaction completes
    res.status(transaction.status).json(transaction.data);
  });

  // Get active tournaments (public endpoint)
  app.get("/api/tournaments/active", async (req, res) => {
    try {
      const tournaments = await storage.getAllTournaments();
      const activeTournaments = tournaments
        .filter(t => t.status === 'active' || t.status === 'registration_open' || t.status === 'in_progress')
        .map(tournament => ({
          id: tournament.id,
          name: tournament.name,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          location: tournament.location || 'Local a definir',
          format: tournament.format,
          status: tournament.status,
          description: tournament.description,
          registrationDeadline: tournament.registrationDeadline,
          maxParticipants: tournament.maxParticipants,
          currentParticipants: 0 // TODO: Calculate real participant count
        }));
      
      res.json(activeTournaments);
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Tournaments routes (PROTEGIDOS)
  app.get("/api/tournaments", requireAuth, async (req, res) => {
    try {
      const tournaments = await storage.getAllTournaments();
      
      // Adicionar contagem de participantes para cada torneio
      const tournamentsWithParticipants = await Promise.all(
        tournaments.map(async (tournament) => {
          try {
            const participants = await storage.getTournamentParticipants(tournament.id);
            return {
              ...tournament,
              participants,
              participantCount: participants.length
            };
          } catch (error) {
            console.error(`Error loading participants for tournament ${tournament.id}:`, error);
            return {
              ...tournament,
              participants: [],
              participantCount: 0
            };
          }
        })
      );
      
      res.json(tournamentsWithParticipants);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ error: "Failed to fetch tournaments" });
    }
  });

  // Endpoint PÚBLICO para dados básicos do torneio (para páginas de inscrição)
  app.get("/api/public/tournaments/:id", async (req, res) => {
    try {
      console.log("=== GET PUBLIC TOURNAMENT DEBUG ===");
      console.log("Tournament ID:", req.params.id);
      
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        console.log("Tournament not found");
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      // Buscar categorias do torneio
      const categories = await storage.getTournamentCategories(req.params.id);
      
      // Buscar participantes para visualização pública com categoryId incluído
      const participants = await storage.getTournamentParticipantsWithCategories(req.params.id);
      
      // Retornar dados essenciais incluindo participantes (para visualização pública)
      const publicTournamentData = {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        location: tournament.location,
        maxParticipants: tournament.maxParticipants,
        registrationDeadline: tournament.registrationDeadline,
        // entryFee: tournament.entryFee, // Campo não existe no schema atual
        format: tournament.format,
        status: tournament.status,
        organizer: tournament.organizer,
        categories: categories,
        participants: participants,
        coverImage: tournament.coverImage
      };
      
      console.log("Public tournament found:", tournament.name);
      res.json(publicTournamentData);
    } catch (error) {
      console.log("=== GET PUBLIC TOURNAMENT ERROR ===");
      console.error("Error fetching public tournament:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: "Failed to fetch tournament", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Endpoint PÚBLICO para partidas do torneio (para cálculo de pódium)
  app.get("/api/public/tournaments/:id/matches", async (req, res) => {
    try {
      console.log("=== GET PUBLIC MATCHES DEBUG ===");
      console.log("Tournament ID for public matches:", req.params.id);
      
      const matches = await storage.getTournamentMatches(req.params.id);
      console.log("Public matches found:", matches.length);
      res.json(matches);
    } catch (error) {
      console.log("=== GET PUBLIC MATCHES ERROR ===");
      console.error("Error fetching public matches:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: "Failed to fetch matches", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Endpoint ADMINISTRATIVO para dados completos do torneio (protegido)
  app.get("/api/tournaments/:id", requireAuth, async (req, res) => {
    try {
      console.log("=== GET TOURNAMENT DEBUG ===");
      console.log("Tournament ID:", req.params.id);
      
      const tournament = await storage.getTournamentWithParticipants(req.params.id);
      if (!tournament) {
        console.log("Tournament not found");
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      console.log("Tournament found:", tournament.name);
      res.json(tournament);
    } catch (error) {
      console.log("=== GET TOURNAMENT ERROR ===");
      console.error("Error fetching tournament:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: "Failed to fetch tournament", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/tournaments", requireAuth, async (req, res) => {
    try {
      console.log("=== TOURNAMENT CREATION DEBUG ===");
      console.log("Raw body:", JSON.stringify(req.body, null, 2));
      
      const validatedData = insertTournamentSchema.parse(req.body);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      
      const tournament = await storage.createTournament(validatedData);
      console.log("Tournament created successfully:", tournament.id);
      
      res.status(201).json(tournament);
    } catch (error) {
      console.log("=== TOURNAMENT CREATION ERROR ===");
      if (error instanceof z.ZodError) {
        console.error("Validation Error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Database/Other Error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: "Failed to create tournament", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/tournaments/:id", async (req, res) => {
    try {
      console.log("=== UPDATE TOURNAMENT DEBUG ===");
      console.log("Tournament ID:", req.params.id);
      console.log("Raw body:", JSON.stringify(req.body, null, 2));
      
      // Convert date strings to Date objects if present
      const updateData = { ...req.body };
      if (updateData.registrationDeadline && typeof updateData.registrationDeadline === 'string') {
        console.log("Converting registrationDeadline:", updateData.registrationDeadline);
        updateData.registrationDeadline = new Date(updateData.registrationDeadline);
        console.log("Converted to Date:", updateData.registrationDeadline.toISOString());
      }
      if (updateData.startDate && typeof updateData.startDate === 'string') {
        console.log("Converting startDate:", updateData.startDate);
        updateData.startDate = new Date(updateData.startDate);
        console.log("Converted to Date:", updateData.startDate.toISOString());
      }
      if (updateData.endDate && typeof updateData.endDate === 'string') {
        console.log("Converting endDate:", updateData.endDate);
        updateData.endDate = new Date(updateData.endDate);
        console.log("Converted to Date:", updateData.endDate.toISOString());
      }
      
      console.log("Calling storage.updateTournament with converted data");
      const tournament = await storage.updateTournament(req.params.id, updateData);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      console.log("Tournament updated successfully");
      res.json(tournament);
    } catch (error) {
      console.log("=== UPDATE TOURNAMENT ERROR ===");
      console.error("Error updating tournament:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: "Failed to update tournament" });
    }
  });

  // Iniciar torneio (mudar status para in_progress - aceita draft ou registration_open)
  app.patch("/api/tournaments/:id/start", requireAuth, async (req, res) => {
    try {
      console.log("=== START TOURNAMENT DEBUG ===");
      console.log("Tournament ID:", req.params.id);
      
      // Buscar torneio atual para verificar status
      const currentTournament = await storage.getTournament(req.params.id);
      if (!currentTournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      
      console.log("Current status:", currentTournament.status);
      
      // Verificar se status permite iniciar torneio
      if (!['draft', 'registration_open'].includes(currentTournament.status)) {
        return res.status(400).json({ 
          error: `Cannot start tournament from status '${currentTournament.status}'. Tournament must be in 'draft' or 'registration_open' status.` 
        });
      }

      // Verificar se todas as categorias têm chaveamento definido
      const tournamentCategories = await storage.getTournamentCategories(req.params.id);
      console.log("Tournament categories found:", tournamentCategories.length);
      
      let allCategoriesReady = true;
      const categoryStatuses = [];

      for (const category of tournamentCategories) {
        const participants = await storage.getTournamentParticipantsByCategory(req.params.id, category.id);
        const matches = await storage.getMatchesByCategory(req.params.id, category.id);
        
        const hasEnoughParticipants = participants.length >= 2;
        const hasMatches = matches.length > 0;
        const isReady = !hasEnoughParticipants || hasMatches; // Se não tem participantes suficientes OU já tem partidas, está ok
        
        categoryStatuses.push({
          categoryName: category.name,
          participants: participants.length,
          matches: matches.length,
          isReady
        });

        if (hasEnoughParticipants && !hasMatches) {
          allCategoriesReady = false;
        }
      }

      console.log("Category statuses:", categoryStatuses);
      
      if (!allCategoriesReady) {
        return res.status(400).json({ 
          error: "Nem todas as categorias têm chaveamento definido. Por favor, gere os chaveamentos necessários antes de iniciar o torneio.",
          categoryStatuses
        });
      }
      
      const tournament = await storage.updateTournament(req.params.id, { 
        status: 'in_progress' 
      });
      
      console.log("Tournament started successfully. New status:", tournament?.status);
      res.json(tournament);
    } catch (error) {
      console.error("Error starting tournament:", error);
      res.status(500).json({ error: "Failed to start tournament" });
    }
  });

  // Pausar torneio (mudar status para paused)
  app.patch("/api/tournaments/:id/pause", requireAuth, async (req, res) => {
    try {
      const tournament = await storage.updateTournament(req.params.id, { 
        status: 'paused' 
      });
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error pausing tournament:", error);
      res.status(500).json({ error: "Failed to pause tournament" });
    }
  });

  // Retomar torneio (mudar status de paused para in_progress)
  app.patch("/api/tournaments/:id/resume", requireAuth, async (req, res) => {
    try {
      const tournament = await storage.updateTournament(req.params.id, { 
        status: 'in_progress' 
      });
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error resuming tournament:", error);
      res.status(500).json({ error: "Failed to resume tournament" });
    }
  });

  // Finalizar torneio (mudar status para completed)
  app.patch("/api/tournaments/:id/finish", requireAuth, async (req, res) => {
    try {
      const tournament = await storage.updateTournament(req.params.id, { 
        status: 'completed' 
      });
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error finishing tournament:", error);
      res.status(500).json({ error: "Failed to finish tournament" });
    }
  });

  // Buscar categorias com estatísticas (participantes, partidas, status de chaveamento)
  app.get("/api/tournaments/:id/categories-stats", async (req, res) => {
    try {
      const categories = await storage.getTournamentCategories(req.params.id);
      const categoriesWithStats = [];

      for (const category of categories) {
        const participants = await storage.getTournamentParticipantsByCategory(req.params.id, category.id);
        const matches = await storage.getMatchesByCategory(req.params.id, category.id);
        
        categoriesWithStats.push({
          ...category,
          participantCount: participants.length,
          matchCount: matches.length,
          hasCompleteDraws: matches.length > 0
        });
      }

      res.json(categoriesWithStats);
    } catch (error) {
      console.error("Error fetching category stats:", error);
      res.status(500).json({ error: "Failed to fetch category stats" });
    }
  });

  // Buscar partidas de uma categoria específica com nomes dos jogadores
  app.get("/api/tournaments/:id/category-matches/:categoryId", async (req, res) => {
    try {
      const matches = await storage.getMatchesByCategoryWithPlayers(req.params.id, req.params.categoryId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching category matches:", error);
      res.status(500).json({ error: "Failed to fetch category matches" });
    }
  });

  // Buscar rodadas disponíveis de uma categoria específica
  app.get("/api/tournaments/:id/categories/:categoryId/rounds", async (req, res) => {
    try {
      const rounds = await storage.getCategoryRounds(req.params.id, req.params.categoryId);
      res.json(rounds);
    } catch (error) {
      console.error("Error fetching category rounds:", error);
      res.status(500).json({ error: "Failed to fetch category rounds" });
    }
  });

  // Buscar partidas de uma rodada específica de uma categoria
  app.get("/api/tournaments/:id/categories/:categoryId/rounds/:round/matches", async (req, res) => {
    try {
      const round = parseInt(req.params.round);
      const phase = req.query.phase as string; // 'group' or 'knockout'
      
      const matches = await storage.getMatchesByRound(
        req.params.id, 
        req.params.categoryId, 
        round, 
        phase
      );
      res.json(matches);
    } catch (error) {
      console.error("Error fetching round matches:", error);
      res.status(500).json({ error: "Failed to fetch round matches" });
    }
  });

  // Gerar chaveamento para uma categoria específica (com configuração dinâmica baseada no formato)
  app.post("/api/tournaments/:id/categories/:categoryId/generate-bracket", requireAuth, async (req, res) => {
    try {
      console.log("=== GENERATE CATEGORY BRACKET DEBUG ===");
      console.log("Tournament ID:", req.params.id);
      console.log("Category ID:", req.params.categoryId);
      console.log("User:", req.session.user?.username, "Role:", req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user');
      console.log("Request body:", req.body);
      
      // Verificar permissões (só admin pode gerar chaveamento)
      const userRole = req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user';
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Apenas administradores podem gerar chaveamento" });
      }
      
      // Buscar torneio
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Buscar dados da categoria específica no torneio
      const tournamentCategory = await storage.getTournamentCategory(req.params.id, req.params.categoryId);
      if (!tournamentCategory) {
        return res.status(404).json({ error: "Category not found in this tournament" });
      }

      console.log("Tournament found:", tournament.name);
      console.log("Category format:", tournamentCategory.format);

      // Buscar participantes da categoria específica
      const participants = await storage.getTournamentParticipantsByCategory(req.params.id, req.params.categoryId);
      console.log("Category participants:", participants?.length || 0);

      if (!participants || participants.length < 2) {
        return res.status(400).json({ 
          error: "Pelo menos 2 participantes são necessários para gerar o chaveamento desta categoria",
          participantCount: participants?.length || 0
        });
      }

      // Verificar se já existem partidas para esta categoria
      const existingMatches = await storage.getMatchesByCategory(req.params.id, req.params.categoryId);
      if (existingMatches && existingMatches.length > 0) {
        // Verificar se há partidas já iniciadas ou finalizadas
        const activeMatches = existingMatches.filter(match => 
          match.status === 'in_progress' || match.status === 'completed'
        );
        
        if (activeMatches.length > 0) {
          return res.status(400).json({ 
            error: `Não é possível alterar o chaveamento pois ${activeMatches.length} partida(s) já foram iniciadas ou finalizadas`,
            detail: "O chaveamento só pode ser alterado antes das partidas começarem"
          });
        }
        
        // Se todas as partidas estão pendentes, permitir recriar o chaveamento
        console.log(`Recriando chaveamento: removendo ${existingMatches.length} partidas pendentes...`);
        for (const match of existingMatches) {
          await storage.deleteMatch(match.id);
        }
      }

      // Gerar chaveamento baseado no formato da categoria
      let matches = [];
      const format = tournamentCategory.format;
      
      console.log(`🔍 DEBUG FORMAT: "${format}" (type: ${typeof format})`);
      console.log(`🔍 FORMAT COMPARISON:`);
      console.log(`   format === 'league': ${format === 'league'}`);
      console.log(`   format === 'round_robin': ${format === 'round_robin'}`);
      console.log(`   format.trim() === 'league': ${format?.trim?.() === 'league'}`);
      
      switch (format) {
        case 'group_stage_knockout':
          // Para grupos + mata-mata, precisa de configurações dinâmicas
          const groupConfig = req.body.groupConfig || {};
          const numGroups = groupConfig.numGroups || Math.min(4, Math.ceil(participants.length / 4));
          const advancesPerGroup = groupConfig.advancesPerGroup || 2;
          const bestOfSets = groupConfig.bestOfSets || 3;
          
          console.log(`Group stage config: ${numGroups} grupos, ${advancesPerGroup} avançam por grupo, melhor de ${bestOfSets} sets`);
          
          matches = await generateGroupStageMatches(
            req.params.id, 
            req.params.categoryId, 
            participants, 
            numGroups,
            advancesPerGroup,
            bestOfSets
          );
          break;
          
        case 'round_robin':
        case 'league': // Liga simples (ida)
        case 'league_single': // Liga simples (ida)
        case 'round_robin_double':
        case 'league_double': // Liga dupla (ida e volta)
        case 'league_round_trip': // Liga ida e volta
          // 🔍 VERIFICAR SE HÁ EQUIPES REGISTRADAS
          const tournamentTeams = await storage.getTournamentTeams(req.params.id, req.params.categoryId);
          const hasTeams = tournamentTeams && tournamentTeams.length > 0;
          
          if (hasTeams) {
            console.log(`🏆 TEAM-BASED TOURNAMENT DETECTED! Creating team ties and matches for ${tournamentTeams.length} teams...`);
            const teamBestOfSets = req.body.groupConfig?.bestOfSets || req.body.bestOfSets || 3;
            const maxBoards = req.body.groupConfig?.maxBoards || 7;
            const pairingMode = req.body.groupConfig?.pairingMode || 'ordered';
            
            // Usar BracketManager para criar confrontos de equipe
            const bracketManager = new BracketManager(storage);
            const teamTiesResult = await bracketManager.generateTeamGroupMatches(
              req.params.id, 
              req.params.categoryId, 
              tournamentTeams,  // 🔧 CORRETO: passar as equipes como 3º parâmetro
              pairingMode
            );
            
            // Para este endpoint, retornar as partidas criadas (não os ties)
            matches = teamTiesResult.matches || [];
            console.log(`✅ Team bracket created: ${teamTiesResult.ties?.length || 0} ties, ${matches.length} individual matches`);
          } else {
            console.log(`Creating individual round-robin matches for format: ${format}...`);
            const isDouble = format.includes('double') || format.includes('round_trip') || req.body.isDoubleRoundRobin;
            const leagueBestOfSets = req.body.groupConfig?.bestOfSets || req.body.bestOfSets || 3;
            matches = await generateRoundRobinMatches(req.params.id, req.params.categoryId, participants, isDouble, leagueBestOfSets);
          }
          break;
          
        case 'team_round_robin':
          console.log("Creating team round-robin ties and matches...");
          const teamBestOfSets = req.body.groupConfig?.bestOfSets || req.body.bestOfSets || 3;
          const maxBoards = req.body.groupConfig?.maxBoards || 7;
          const pairingMode = req.body.groupConfig?.pairingMode || 'ordered';
          const pointsPerWin = req.body.groupConfig?.pointsPerWin || 1;
          
          // Usar BracketManager para criar confrontos de equipe
          const bracketManager = new BracketManager(storage);
          const teamTiesResult = await bracketManager.generateTeamGroupMatches(
            req.params.id, 
            req.params.categoryId, 
            pairingMode
          );
          
          // Para este endpoint, retornar as partidas criadas (não os ties)
          matches = teamTiesResult.matches || [];
          break;
          
        case 'single_elimination':
        case 'double_elimination':
        default:
          console.log("Creating knockout elimination matches...");
          const knockoutBestOfSets = req.body.groupConfig?.bestOfSets || req.body.bestOfSets || 3;
          matches = await generateKnockoutMatches(req.params.id, req.params.categoryId, participants, format, knockoutBestOfSets);
          break;
      }

      // Salvar partidas no banco
      const createdMatches = [];
      for (const match of matches) {
        const createdMatch = await storage.createMatch(match);
        createdMatches.push(createdMatch);
      }

      console.log(`Category bracket generated successfully! ${createdMatches.length} matches created for format: ${format}`);

      res.json({
        success: true,
        message: `Chaveamento da categoria gerado com sucesso! (${format})`,
        matches: createdMatches,
        participantCount: participants.length,
        format: format
      });

    } catch (error) {
      console.error("Error generating category bracket:", error);
      res.status(500).json({ error: "Failed to generate category bracket" });
    }
  });

  // Avançar para mata-mata (após grupos completos)
  app.post("/api/tournaments/:id/categories/:categoryId/advance-to-knockout", requireAuth, async (req, res) => {
    try {
      console.log("=== ADVANCE TO KNOCKOUT DEBUG ===");
      console.log("Tournament ID:", req.params.id, "Category ID:", req.params.categoryId);
      
      // Verificar permissões
      if (req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user' !== 'admin') {
        return res.status(403).json({ error: "Apenas administradores podem avançar para mata-mata" });
      }
      
      // Buscar todas as partidas de grupo da categoria
      const allMatches = await storage.getMatchesByCategory(req.params.id, req.params.categoryId);
      const groupMatches = allMatches.filter(m => m.phase === 'group');
      
      if (groupMatches.length === 0) {
        return res.status(400).json({ error: "Não há partidas de grupo para esta categoria" });
      }
      
      // Verificar se todas as partidas de grupo foram completadas
      const incompleteMatches = groupMatches.filter(m => m.status !== 'completed');
      if (incompleteMatches.length > 0) {
        return res.status(400).json({ 
          error: `${incompleteMatches.length} partidas de grupo ainda precisam ser completadas` 
        });
      }
      
      // Verificar se já existe mata-mata
      const knockoutMatches = allMatches.filter(m => m.phase === 'knockout');
      if (knockoutMatches.length > 0) {
        return res.status(400).json({ error: "O mata-mata já foi gerado para esta categoria" });
      }
      
      // Calcular classificação por grupo e selecionar classificados
      const { advanceToKnockout } = await import('./bracketUtils');
      // Buscar configuração de avanços por grupo da categoria
      const tournamentCategory = await storage.getTournamentCategory(req.params.id, req.params.categoryId);
      const advancesPerGroup = 2; // Default: top 2 avançam (pode ser configurável no futuro)
      const qualifiedParticipants = await advanceToKnockout(req.params.id, req.params.categoryId, groupMatches, advancesPerGroup);
      
      if (qualifiedParticipants.length < 2) {
        return res.status(400).json({ error: "Não há participantes suficientes para o mata-mata" });
      }
      
      // Gerar chaveamento mata-mata
      const { generateKnockoutMatches } = await import('./bracketUtils');
      const knockoutMatchesData = await generateKnockoutMatches(
        req.params.id, 
        req.params.categoryId, 
        qualifiedParticipants, 
        'single_elimination'
      );
      
      // Criar partidas mata-mata no banco
      const createdMatches = [];
      for (const matchData of knockoutMatchesData) {
        const createdMatch = await storage.createMatch(matchData);
        createdMatches.push(createdMatch);
      }
      
      console.log(`Successfully advanced ${qualifiedParticipants.length} participants to knockout`);
      res.json({ 
        success: true,
        qualifiedCount: qualifiedParticipants.length,
        knockoutMatches: createdMatches.length,
        message: `${qualifiedParticipants.length} atletas classificados para o mata-mata!`
      });
      
    } catch (error) {
      console.error("Error advancing to knockout:", error);
      res.status(500).json({ error: "Failed to advance to knockout stage" });
    }
  });

  // Gerar chaveamento automático
  app.post("/api/tournaments/:id/generate-bracket", requireAuth, async (req, res) => {
    try {
      console.log("=== GENERATE BRACKET DEBUG ===");
      console.log("Tournament ID:", req.params.id);
      console.log("User:", req.session.user?.username, "Role:", req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user');
      
      // Verificar permissões (só admin pode gerar chaveamento)
      const userRole = req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user';
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Apenas administradores podem gerar chaveamento" });
      }
      
      // Buscar torneio e participantes
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }

      // Verificar se torneio está em andamento
      if (tournament.status !== 'in_progress') {
        return res.status(400).json({ error: "Chaveamento só pode ser gerado para torneios em andamento" });
      }

      console.log("Tournament found:", tournament.name);
      console.log("Format:", tournament.format);

      // Buscar participantes do torneio
      const participants = await storage.getTournamentParticipants(req.params.id);
      console.log("Participants:", participants?.length || 0);

      if (!participants || participants.length < 2) {
        return res.status(400).json({ error: "Pelo menos 2 participantes são necessários para gerar o chaveamento" });
      }

      // Limpar partidas existentes antes de gerar novas
      const existingMatches = await storage.getTournamentMatches(req.params.id);
      if (existingMatches && existingMatches.length > 0) {
        console.log(`Cleaning ${existingMatches.length} existing matches...`);
        for (const match of existingMatches) {
          await storage.deleteMatch(match.id);
        }
      }

      // Embaralhar participantes para sortear confrontos
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      console.log("Shuffled participants:", shuffledParticipants.map(p => p.name));

      const matches = [];
      
      // Gerar partidas conforme formato do torneio
      if (tournament.format === 'group_stage_knockout') {
        console.log("Creating group stage + knockout matches...");
        // Determinar número de grupos baseado no número de participantes
        const numGroups = Math.min(4, Math.ceil(shuffledParticipants.length / 3)); // Mínimo 3 por grupo, máximo 4 grupos
        const advancesPerGroup = 2; // Top 2 de cada grupo avançam
        
        // Gerar partidas da fase de grupos
        const { generateGroupStageMatches } = await import('./bracketUtils');
        const groupMatches = await generateGroupStageMatches(req.params.id, 'default', shuffledParticipants, numGroups, advancesPerGroup);
        matches.push(...groupMatches);
        
      } else if (tournament.format === 'single_elimination' || !tournament.format) {
        console.log("Creating single elimination bracket...");
        
        for (let i = 0; i < shuffledParticipants.length; i += 2) {
          const player1 = shuffledParticipants[i];
          const player2 = shuffledParticipants[i + 1] || null;

          const match = {
            tournamentId: req.params.id,
            player1Id: player1.id,
            player2Id: player2?.id || null,
            round: 1,
            matchNumber: Math.floor(i / 2) + 1,
            status: 'pending' as const,
            score: null,
            winnerId: player2 ? null : player1.id,
            needsAttention: false
          };

          console.log(`Creating match ${match.matchNumber}: ${player1.name} vs ${player2?.name || 'BYE'}`);
          matches.push(match);
        }
      } else {
        console.log(`Unsupported tournament format: ${tournament.format}`);
        return res.status(400).json({ error: `Formato de torneio '${tournament.format}' não suportado ainda` });
      }

      // Criar partidas no storage
      console.log("Creating matches in storage...");
      const createdMatches = [];
      for (const matchData of matches) {
        const validatedData = insertMatchSchema.parse(matchData);
        const createdMatch = await storage.createMatch(validatedData);
        createdMatches.push(createdMatch);
      }

      console.log(`Successfully created ${createdMatches.length} matches`);

      res.json({
        message: "Chaveamento gerado com sucesso",
        matchesCreated: createdMatches.length,
        matches: createdMatches
      });

    } catch (error) {
      console.log("=== GENERATE BRACKET ERROR ===");
      console.error("Error generating bracket:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: "Failed to generate bracket", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // PUT endpoint para atualização de torneios (usado pelo upload de capa)
  app.put("/api/tournaments/:id", requireAuth, async (req, res) => {
    try {
      console.log("=== PUT TOURNAMENT UPDATE ===");
      console.log("Tournament ID:", req.params.id);
      console.log("Update data:", JSON.stringify(req.body, null, 2));
      
      const tournament = await storage.updateTournament(req.params.id, req.body);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error updating tournament (PUT):", error);
      res.status(500).json({ error: "Failed to update tournament" });
    }
  });

  app.delete("/api/tournaments/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteTournament(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tournament:", error);
      res.status(500).json({ error: "Failed to delete tournament" });
    }
  });

  // POST endpoint para inscrição direta de atletas no torneio
  app.post("/api/tournaments/:id/enroll-athletes", requireAuth, async (req, res) => {
    try {
      const { athleteIds, categoryId } = req.body;
      
      if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
        return res.status(400).json({ error: "Lista de atletas é obrigatória" });
      }

      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: "Torneio não encontrado" });
      }

      // Verificar se torneio permite inscrição direta
      const allowedStatuses = ['draft', 'registration_open', 'paused'];
      if (!allowedStatuses.includes(tournament.status)) {
        return res.status(400).json({ 
          error: "Inscrição direta de atletas só é permitida em torneios em rascunho, com inscrições abertas ou pausados" 
        });
      }

      // Verificar se ainda está na fase inicial da categoria (não pode ter chaveamento iniciado)
      if (categoryId) {
        const categoryMatches = await storage.getMatchesByCategory(req.params.id, categoryId);
        if (categoryMatches.length > 0) {
          return res.status(400).json({ 
            error: "Não é possível inscrever atletas após o chaveamento da categoria ter sido iniciado" 
          });
        }
      }

      const enrolledAthletes = [];
      const skippedAthletes = [];
      const notFoundAthletes = [];

      const existingParticipants = await storage.getTournamentParticipantsWithCategories(req.params.id);
      
      for (const athleteId of athleteIds) {
        const athlete = await storage.getAthlete(athleteId);
        if (!athlete) {
          console.log(`Atleta ${athleteId} não encontrado, pulando...`);
          notFoundAthletes.push(athleteId);
          continue;
        }

        const alreadyEnrolled = existingParticipants?.some(p => p.athleteId === athleteId);
        
        if (alreadyEnrolled) {
          console.log(`Atleta ${athlete.name} já inscrito, pulando...`);
          skippedAthletes.push({ id: athleteId, name: athlete.name, reason: 'already_enrolled' });
          continue;
        }

        // Se não há categoria específica, usar a primeira categoria do torneio
        let finalCategoryId = categoryId;
        if (!finalCategoryId) {
          const tournamentCategories = await storage.getTournamentCategories(req.params.id);
          if (tournamentCategories.length > 0) {
            finalCategoryId = tournamentCategories[0].id;
          } else {
            console.log(`Erro: Torneio ${req.params.id} não tem categorias associadas`);
            notFoundAthletes.push(athleteId);
            continue;
          }
        }

        await storage.addParticipant({
          tournamentId: req.params.id,
          athleteId: athleteId,
          categoryId: finalCategoryId
        });

        enrolledAthletes.push({ id: athleteId, name: athlete.name });
      }

      let message = '';
      if (enrolledAthletes.length > 0) {
        message += `${enrolledAthletes.length} atleta(s) inscrito(s) com sucesso`;
      }
      if (skippedAthletes.length > 0) {
        if (message) message += ', ';
        message += `${skippedAthletes.length} já inscrito(s)`;
      }
      if (notFoundAthletes.length > 0) {
        if (message) message += ', ';
        message += `${notFoundAthletes.length} não encontrado(s)`;
      }
      if (!message) message = 'Nenhuma alteração realizada';

      res.json({
        message,
        enrolledAthletes: enrolledAthletes.map(a => a.name),
        skippedAthletes: skippedAthletes.map(a => a.name),
        notFoundAthletes,
        totalRequested: athleteIds.length,
        totalEnrolled: enrolledAthletes.length
      });

    } catch (error) {
      console.error("Error enrolling athletes:", error);
      res.status(500).json({ 
        error: "Falha ao inscrever atletas", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Tournament participants routes
  app.post("/api/tournaments/:id/participants", async (req, res) => {
    try {
      const participantData = { ...req.body, tournamentId: req.params.id };
      const validatedData = insertTournamentParticipantSchema.parse(participantData);
      
      // Buscar dados do atleta para validação de idade
      const athlete = await storage.getAthlete(validatedData.athleteId);
      if (!athlete) {
        return res.status(404).json({ error: "Atleta não encontrado" });
      }
      
      // Buscar dados da categoria para validação
      const category = await storage.getCategory(validatedData.categoryId);
      if (!category) {
        return res.status(404).json({ error: "Categoria não encontrada" });
      }
      
      // Buscar dados do torneio para obter o ano
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: "Torneio não encontrado" });
      }
      
      // Calcular ano do torneio (usar startDate ou ano atual se não definido)
      const tournamentYear = tournament.startDate 
        ? extractYearFromDate(tournament.startDate) 
        : new Date().getFullYear();
      
      // Validar se o atleta é elegível para esta categoria baseado na idade
      if (!isEligibleForCategory(athlete.birthDate, tournamentYear, category.minAge, category.maxAge)) {
        const ageInTournament = calculateAgeInTournamentYear(athlete.birthDate, tournamentYear);
        return res.status(400).json({ 
          error: "Atleta não elegível para esta categoria",
          details: {
            athleteAge: ageInTournament,
            categoryMinAge: category.minAge,
            categoryMaxAge: category.maxAge,
            tournamentYear: tournamentYear
          }
        });
      }
      
      const participant = await storage.addParticipant(validatedData);
      res.status(201).json(participant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error adding participant:", error);
      res.status(500).json({ error: "Failed to add participant" });
    }
  });

  app.delete("/api/tournaments/:tournamentId/participants/:athleteId", async (req, res) => {
    try {
      const success = await storage.removeParticipant(req.params.tournamentId, req.params.athleteId);
      if (!success) {
        return res.status(404).json({ error: "Participant not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ error: "Failed to remove participant" });
    }
  });

  // NOVO: Trocar atletas entre partidas (drag-and-drop)
  app.post("/api/tournaments/:tournamentId/swap-athletes", requireAuth, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { sourceMatchId, sourcePosition, targetMatchId, targetPosition } = req.body;
      
      console.log(`🔄 TROCAR ATLETAS: ${sourceMatchId}(${sourcePosition}) ↔ ${targetMatchId}(${targetPosition})`);
      
      // Buscar as duas partidas
      const sourceMatch = await storage.getMatch(sourceMatchId);
      const targetMatch = await storage.getMatch(targetMatchId);
      
      if (!sourceMatch || !targetMatch) {
        return res.status(404).json({ error: "Uma ou ambas as partidas não foram encontradas" });
      }
      
      // Extrair atletas das posições
      const sourceAthleteId = sourceMatch[sourcePosition + 'Id' as keyof typeof sourceMatch] as string;
      const targetAthleteId = targetMatch[targetPosition + 'Id' as keyof typeof targetMatch] as string;
      
      console.log(`👤 Atletas: ${sourceAthleteId} ↔ ${targetAthleteId}`);
      
      // Atualizar partida de origem
      const sourceUpdate: any = {};
      sourceUpdate[sourcePosition + 'Id'] = targetAthleteId;
      await storage.updateMatch(sourceMatchId, sourceUpdate);
      
      // Atualizar partida de destino  
      const targetUpdate: any = {};
      targetUpdate[targetPosition + 'Id'] = sourceAthleteId;
      await storage.updateMatch(targetMatchId, targetUpdate);
      
      console.log(`✅ Troca realizada com sucesso!`);
      
      res.json({
        message: "Atletas trocados com sucesso",
        sourceMatch: await storage.getMatch(sourceMatchId),
        targetMatch: await storage.getMatch(targetMatchId)
      });
      
    } catch (error) {
      console.error("Erro ao trocar atletas:", error);
      res.status(500).json({ error: "Falha ao trocar atletas" });
    }
  });

  // NOVO: Remoção inteligente de atleta com recálculo automático das partidas
  app.delete("/api/tournaments/:tournamentId/categories/:categoryId/athletes/:athleteId/smart-remove", requireAuth, async (req, res) => {
    try {
      const { tournamentId, categoryId, athleteId } = req.params;
      
      console.log(`🧠 REMOÇÃO INTELIGENTE: Removendo atleta ${athleteId} da categoria ${categoryId}`);
      
      // 1. Buscar todas as partidas que envolvem este atleta na categoria
      const affectedMatches = await storage.getMatchesByAthleteAndCategory(athleteId, tournamentId, categoryId);
      console.log(`📊 Partidas afetadas: ${affectedMatches.length}`);
      
      // 2. Remover o atleta de todas as partidas
      for (const match of affectedMatches) {
        await storage.removeAthleteFromMatch(match.id, athleteId);
      }
      
      // 3. Buscar partidas atualizadas e remover as que ficaram sem AMBOS os jogadores
      const emptyMatches = [];
      
      for (const match of affectedMatches) {
        const updatedMatch = await storage.getMatch(match.id);
        if (updatedMatch && !updatedMatch.player1Id && !updatedMatch.player2Id) {
          emptyMatches.push(updatedMatch);
          await storage.deleteMatch(updatedMatch.id);
        }
      }
      
      // 4. Recalcular numeração das partidas restantes
      await storage.renumberMatches(tournamentId, categoryId);
      
      const removedMatchesCount = emptyMatches.length;
      
      res.json({
        success: true,
        message: `Atleta removido com sucesso`,
        statistics: {
          affectedMatches: affectedMatches.length,
          removedMatches: removedMatchesCount,
          remainingMatches: affectedMatches.length - removedMatchesCount
        }
      });
      
    } catch (error) {
      console.error("Erro na remoção inteligente:", error);
      res.status(500).json({ error: "Falha na remoção inteligente do atleta" });
    }
  });

  // Endpoint para buscar todas as categorias de um torneio
  app.get("/api/tournaments/:tournamentId/categories", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      
      // Buscar todas as categorias do torneio
      const tournamentCategories = await storage.getTournamentCategories(tournamentId);
      
      res.json(tournamentCategories);
      
    } catch (error) {
      console.error("Error fetching tournament categories:", error);
      res.status(500).json({ error: "Failed to fetch tournament categories" });
    }
  });

  // Endpoint para buscar categorias elegíveis para um atleta em um torneio específico
  app.get("/api/tournaments/:tournamentId/eligible-categories/:athleteId", async (req, res) => {
    try {
      const { tournamentId, athleteId } = req.params;
      
      // Buscar dados do atleta
      const athlete = await storage.getAthlete(athleteId);
      if (!athlete) {
        return res.status(404).json({ error: "Atleta não encontrado" });
      }
      
      // Buscar dados do torneio
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: "Torneio não encontrado" });
      }
      
      // Buscar todas as categorias do torneio
      const tournamentCategories = await storage.getTournamentCategories(tournamentId);
      
      // Calcular ano do torneio
      const tournamentYear = tournament.startDate 
        ? extractYearFromDate(tournament.startDate) 
        : new Date().getFullYear();
      
      // Filtrar categorias elegíveis baseado na idade
      const eligibleCategories = [];
      
      for (const category of tournamentCategories) {
        if (isEligibleForCategory(athlete.birthDate, tournamentYear, category.minAge, category.maxAge)) {
          eligibleCategories.push(category);
        }
      }
      
      res.json({
        eligibleCategories,
        athleteAge: calculateAgeInTournamentYear(athlete.birthDate, tournamentYear),
        tournamentYear
      });
      
    } catch (error) {
      console.error("Error fetching eligible categories:", error);
      res.status(500).json({ error: "Failed to fetch eligible categories" });
    }
  });

  // Matches routes
  app.get("/api/tournaments/:id/matches", async (req, res) => {
    try {
      console.log("=== GET MATCHES DEBUG ===");
      console.log("Tournament ID for matches:", req.params.id);
      
      const matches = await storage.getTournamentMatches(req.params.id);
      console.log("Matches found:", matches.length);
      res.json(matches);
    } catch (error) {
      console.log("=== GET MATCHES ERROR ===");
      console.error("Error fetching matches:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: "Failed to fetch matches", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ error: "Failed to fetch match" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    try {
      const validatedData = insertMatchSchema.parse(req.body);
      const match = await storage.createMatch(validatedData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating match:", error);
      res.status(500).json({ error: "Failed to create match" });
    }
  });

  app.patch("/api/matches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Log the update request
      console.log(`🔄 PATCH /api/matches/${id}:`, JSON.stringify(updates, null, 2));
      
      // Get the current match to validate winnerId
      const currentMatch = await storage.getMatch(id);
      if (!currentMatch) {
        return res.status(404).json({ error: "Match not found" });
      }
      
      // CRITICAL: Validate winnerId if provided
      if (updates.winnerId !== undefined && updates.winnerId !== null) {
        const validPlayerIds = [currentMatch.player1Id, currentMatch.player2Id].filter(Boolean);
        
        if (!validPlayerIds.includes(updates.winnerId)) {
          console.error(`❌ INVALID WINNER: ${updates.winnerId} not in [${validPlayerIds.join(', ')}]`);
          return res.status(400).json({ 
            error: 'Invalid winner: winner must be one of the match participants',
            validPlayers: validPlayerIds,
            providedWinner: updates.winnerId
          });
        }
        
        console.log(`✅ Winner validation passed: ${updates.winnerId} is valid`);
      }
      
      // If winnerId not provided but sets are, compute winner from sets
      if (updates.sets && !updates.winnerId && updates.status === 'completed') {
        const sets = updates.sets as Array<{player1Score: number, player2Score: number}>;
        const player1Sets = sets.filter(set => set.player1Score > set.player2Score).length;
        const player2Sets = sets.filter(set => set.player2Score > set.player1Score).length;
        
        if (player1Sets > player2Sets) {
          updates.winnerId = currentMatch.player1Id;
        } else if (player2Sets > player1Sets) {
          updates.winnerId = currentMatch.player2Id;
        }
        
        console.log(`🎯 Computed winner from sets: ${updates.winnerId} (${player1Sets}-${player2Sets})`);
      }

      const match = await storage.updateMatch(req.params.id, updates);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      // PROPAGAÇÃO AUTOMÁTICA: Se a partida foi finalizada com vencedor, propagar para próxima fase
      if (match.status === "completed" && match.winnerId) {
        try {
          // 1. Propagação normal para partidas eliminatórias linkadas
          await bracketManager.propagateWinner(match);
          
          // 2. NOVO: Verificar se é uma partida de grupo e preencher eliminatórias dinamicamente
          if (match.phase === 'group' && match.groupName) {
            console.log(`=== VERIFICANDO GRUPO ${match.groupName} ===`);
            
            // Verificar se já existem partidas eliminatórias (se não, criar placeholders)
            const existingEliminations = await storage.getMatchesByCategoryPhase(match.tournamentId, match.categoryId, 'quarterfinal');
            const existingEliminations2 = await storage.getMatchesByCategoryPhase(match.tournamentId, match.categoryId, 'semifinal');
            const existingEliminations3 = await storage.getMatchesByCategoryPhase(match.tournamentId, match.categoryId, 'final');
            
            if (existingEliminations.length === 0 && existingEliminations2.length === 0 && existingEliminations3.length === 0) {
              console.log("🏗️  Criando bracket com placeholders...");
              // Detectar quantos grupos existem
              const allGroupMatches = await storage.getMatchesByCategoryPhase(match.tournamentId, match.categoryId, 'group');
              const groupsSet = new Set(allGroupMatches.map(m => m.groupName).filter(Boolean));
              const numberOfGroups = groupsSet.size;
              
              if (numberOfGroups > 0) {
                const placeholderBracket = await bracketManager.createPlaceholderBracket(
                  match.tournamentId,
                  match.categoryId,
                  numberOfGroups,
                  2 // 2 qualificados por grupo
                );
                
                if (placeholderBracket && placeholderBracket.allMatches.length > 0) {
                  console.log(`🏆 Bracket com placeholders criado! ${placeholderBracket.allMatches.length} partidas.`);
                }
              }
            }
            
            // Preencher dinamicamente este grupo específico se terminou
            await bracketManager.fillGroupQualifiers(
              match.tournamentId,
              match.categoryId,
              match.groupName,
              2 // 2 qualificados por grupo
            );
            
            // NOVO: Reconciliar placeholders após completar partida de grupo
            await bracketManager.reconcilePlaceholders(
              match.tournamentId,
              match.categoryId,
              2 // 2 qualificados por grupo
            );
            
            // Auto-completar partidas BYE criadas após reconciliação
            await bracketManager.autoCompleteBYEMatches(match.tournamentId, match.categoryId);
            
            // Verificar se TODOS os grupos terminaram para reconciliação global
            const allGroupMatches = await storage.getMatchesByCategoryPhase(match.tournamentId, match.categoryId, 'group');
            const allGroupsComplete = allGroupMatches.every(m => m.status === 'completed');
            
            if (allGroupsComplete) {
              console.log("[LOG] TODOS os grupos finalizados - reconciliação global");
              await bracketManager.reconcilePlaceholders(match.tournamentId, match.categoryId, 2);
              await bracketManager.autoCompleteBYEMatches(match.tournamentId, match.categoryId);
            }
          }
        } catch (propagateError) {
          console.warn("Aviso: Erro na propagação/geração automática:", propagateError);
          // Não falhar a atualização por causa da propagação
        }
      }

      res.json(match);
    } catch (error) {
      console.error("Error updating match:", error);
      res.status(500).json({ error: "Failed to update match" });
    }
  });

  app.patch("/api/matches/:id/clear-attention", requireAuth, async (req, res) => {
    try {
      const match = await storage.updateMatch(req.params.id, { needsAttention: false });
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error clearing match attention:", error);
      res.status(500).json({ error: "Failed to clear match attention" });
    }
  });

  app.delete("/api/matches/:id", async (req, res) => {
    try {
      await storage.deleteMatch(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting match:", error);
      res.status(500).json({ error: "Failed to delete match" });
    }
  });

  // DEBUG ROUTE - Forçar reconciliação de brackets (sem auth para debug)
  
  // BRACKET ROUTES - Sistema de chaveamento
  
  // Gerar próxima fase automaticamente após término da fase de grupos
  app.post("/api/tournaments/:tournamentId/categories/:categoryId/generate-next-phase", requireAuth, async (req, res) => {
    try {
      const { tournamentId, categoryId } = req.params;
      const { qualifiersPerGroup = 2 } = req.body;

      // Verificar se fase de grupos está completa
      const isComplete = await bracketManager.isGroupPhaseComplete(tournamentId, categoryId);
      if (!isComplete) {
        return res.status(400).json({ 
          error: "Fase de grupos ainda não está completa",
          message: "Todas as partidas da fase de grupos devem estar finalizadas antes de gerar a próxima fase"
        });
      }

      // Gerar bracket completo (todas as fases eliminatórias)
      const fullBracketGeneration = await bracketManager.createFullBracketFromGroups(
        tournamentId, 
        categoryId, 
        qualifiersPerGroup
      );

      if (!fullBracketGeneration) {
        return res.status(400).json({ 
          error: "Não foi possível gerar bracket completo",
          message: "Não há dados suficientes para gerar as partidas eliminatórias"
        });
      }

      res.status(201).json({
        phases: fullBracketGeneration.phases,
        matchesCreated: fullBracketGeneration.allMatches.length,
        matches: fullBracketGeneration.allMatches
      });

    } catch (error) {
      console.error("Error generating next phase:", error);
      res.status(500).json({ error: "Failed to generate next phase" });
    }
  });

  // Buscar bracket completo de uma categoria (todas as fases)
  app.get("/api/tournaments/:tournamentId/categories/:categoryId/bracket", async (req, res) => {
    try {
      const { tournamentId, categoryId } = req.params;
      console.log("🏆 BRACKET ENDPOINT CHAMADO v2.0:", tournamentId, categoryId);

      console.log("📝 Iniciando busca das partidas...");
      // Buscar todas as partidas da categoria organizadas por fase
      const phases = ["group", "knockout", "round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"];
      const bracket: any = {};

      // COPA DO MUNDO: Verificar se eliminatórias existem, se não, criar placeholders automaticamente
      const eliminationPhases = ["knockout", "round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"];
      let hasEliminationMatches = false;
      
      console.log("🔍 Verificando eliminatórias existentes...");
      for (const phase of eliminationPhases) {
        try {
          const phaseMatches = await storage.getMatchesByCategoryPhase(tournamentId, categoryId, phase);
          console.log(`📋 Fase ${phase}: ${phaseMatches.length} partidas`);
          if (phaseMatches.length > 0) {
            hasEliminationMatches = true;
            break;
          }
        } catch (error) {
          console.error(`❌ Erro ao buscar fase ${phase}:`, error);
        }
      }

      console.log("⚡ hasEliminationMatches:", hasEliminationMatches);

      // SEMPRE executar reconciliação se houver partidas de grupo
      console.log("🔍 Verificando partidas de grupo...");
      const groupMatches = await storage.getMatchesByCategoryPhase(tournamentId, categoryId, 'group');
      console.log("📋 Partidas de grupo encontradas:", groupMatches.length);
      
      if (groupMatches.length > 0) {
        // Detectar quantos grupos existem
        const groupsSet = new Set(groupMatches.map(m => m.groupName).filter(Boolean));
        const numberOfGroups = groupsSet.size;
        console.log("📊 Grupos detectados:", numberOfGroups);
        
        if (numberOfGroups > 0) {
          // Se não há eliminatórias, criar bracket apenas UMA VEZ
          if (!hasEliminationMatches) {
            console.log("🏗️ Criando bracket completo automaticamente...");
            const placeholderBracket = await bracketManager.createPlaceholderBracket(
              tournamentId,
              categoryId,
              numberOfGroups,
              2 // 2 qualificados por grupo
            );
            
            if (placeholderBracket && placeholderBracket.allMatches.length > 0) {
              console.log(`🏆 Bracket com placeholders criado automaticamente! ${placeholderBracket.allMatches.length} partidas.`);
            }
          }
          
          // SEMPRE executar reconciliação para garantir que atletas reais apareçam
          console.log("🔄 Iniciando reconciliação automática...");
          await bracketManager.reconcilePlaceholders(tournamentId, categoryId, 2);
          
          // CRÍTICO: Forçar conexões mesmo com bracket existente
          console.log("🔗 Forçando conexões entre partidas...");
          await bracketManager.forceConnectMatches(tournamentId, categoryId);
          
          // Auto-completar partidas BYE
          console.log("⚡ Auto-completando partidas BYE...");
          await bracketManager.autoCompleteBYEMatches(tournamentId, categoryId);
          
          // CRÍTICO: Forçar propagação de todas as partidas completadas
          console.log("🚀 Forçando propagação de vencedores...");
          try {
            await bracketManager.forceCompleteMatches(tournamentId, categoryId);
            console.log("🎯 Propagação forçada executada com sucesso!");
          } catch (error) {
            console.error("❌ Erro na propagação forçada:", error);
          }
          
          console.log("✅ Reconciliação automática finalizada!");
        }
      }

      for (const phase of phases) {
        const phaseMatches = await storage.getMatchesByCategoryPhase(tournamentId, categoryId, phase);
        if (phaseMatches.length > 0) {
          bracket[phase] = phaseMatches;
        }
      }

      // Adicionar informações da classificação dos grupos se existir fase de grupos
      if (bracket.group && bracket.group.length > 0) {
        try {
          const groupStandings = await storage.computeGroupStandings(tournamentId, categoryId);
          bracket.groupStandings = groupStandings;
        } catch (standingsError) {
          console.warn("Erro ao calcular classificação dos grupos:", standingsError);
        }
      }

      res.json(bracket);

    } catch (error) {
      console.error("Error fetching bracket:", error);
      res.status(500).json({ error: "Failed to fetch bracket" });
    }
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      
      // Verificar se já existe categoria com mesmo nome e gênero
      const existingCategories = await storage.getAllCategories();
      const duplicateCategory = existingCategories.find(cat => 
        cat.name.toLowerCase().trim() === validatedData.name.toLowerCase().trim() &&
        cat.gender === validatedData.gender
      );
      
      if (duplicateCategory) {
        return res.status(400).json({ 
          error: "Categoria já existe", 
          message: `Já existe uma categoria "${validatedData.name}" para o gênero ${validatedData.gender}` 
        });
      }
      
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Remover categoria de um torneio
  // Update tournament category format
  app.patch("/api/tournaments/:tournamentId/categories/:categoryId", requireAuth, async (req, res) => {
    try {
      const { tournamentId, categoryId } = req.params;
      const { format, settings } = req.body;

      console.log(`📝 Atualizando formato da categoria: ${categoryId} para: ${format}`, { settings });

      if (!format) {
        return res.status(400).json({ error: "Formato é obrigatório" });
      }

      // Verificar se o torneio existe
      const tournament = await storage.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: "Torneio não encontrado" });
      }

      // Buscar a categoria específica do torneio
      const categories = await storage.getTournamentCategories(tournamentId);
      const category = categories.find(c => c.id === categoryId);

      if (!category) {
        return res.status(404).json({ error: "Categoria não encontrada no torneio" });
      }

      // Verificar se há chaveamento existente para esta categoria
      const existingMatches = await storage.getMatchesByCategory(tournamentId, categoryId);
      let bracketWasReset = false;

      if (existingMatches.length > 0) {
        console.log(`🔄 Encontradas ${existingMatches.length} partidas existentes. Resetando chaveamento...`);
        
        // Deletar todas as partidas da categoria pois o formato mudou
        await storage.deleteMatchesByCategory(tournamentId, categoryId);
        bracketWasReset = true;
        
        console.log(`🗑️ Chaveamento resetado! ${existingMatches.length} partidas removidas.`);
      }

      // Serializar configurações para JSON se fornecidas
      const serializedSettings = settings ? JSON.stringify(settings) : null;

      // Atualizar o formato e configurações da categoria
      const updatedCategory = await storage.updateTournamentCategory(categoryId, { 
        format,
        settings: serializedSettings
      });

      console.log(`✅ Formato da categoria "${category.name}" atualizado para: ${format} com configurações:`, settings);

      // Mensagem personalizada baseada se houve reset do chaveamento
      const message = bracketWasReset 
        ? `Formato da categoria atualizado! O chaveamento foi resetado devido à mudança de formato - você pode gerar um novo chaveamento.`
        : "Formato da categoria atualizado com sucesso";

      res.json({
        success: true,
        message,
        category: updatedCategory,
        bracketWasReset // Informar frontend se houve reset
      });

    } catch (error) {
      console.error("Error updating category format:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/tournaments/:tournamentId/categories/:categoryId", requireAuth, async (req, res) => {
    try {
      const { tournamentId, categoryId } = req.params;
      
      // Verificar se a categoria pertence ao torneio
      const tournamentCategories = await storage.getTournamentCategories(tournamentId);
      const categoryExists = tournamentCategories.some(cat => cat.id === categoryId);
      
      if (!categoryExists) {
        return res.status(404).json({ 
          error: "Categoria não encontrada neste torneio" 
        });
      }
      
      // Verificar se há participantes nesta categoria
      const participants = await storage.getTournamentParticipantsWithCategories(tournamentId);
      const categoryParticipants = participants.filter(p => p.categoryId === categoryId);
      
      if (categoryParticipants.length > 0) {
        return res.status(400).json({
          error: "Não é possível remover categoria com participantes",
          message: `Esta categoria possui ${categoryParticipants.length} participante(s) inscrito(s). Remova os participantes primeiro.`,
          participantCount: categoryParticipants.length
        });
      }
      
      // Verificar se há partidas nesta categoria
      const matches = await storage.getMatchesByCategory(tournamentId, categoryId);
      if (matches.length > 0) {
        return res.status(400).json({
          error: "Não é possível remover categoria com partidas",
          message: "Esta categoria possui partidas registradas. Remova as partidas primeiro."
        });
      }
      
      // Remover a categoria do torneio
      await storage.removeTournamentCategory(tournamentId, categoryId);
      
      res.json({ 
        success: true,
        message: "Categoria removida do torneio com sucesso" 
      });
      
    } catch (error) {
      console.error("Error removing tournament category:", error);
      res.status(500).json({ error: "Failed to remove category from tournament" });
    }
  });

  // Financial module routes

  // Payments routes (PROTEGIDOS)
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      console.log("Creating payment with data:", req.body);
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Payment validation error:", error.errors);
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.updatePayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  // Endpoint específico para marcar pagamento como pago
  app.patch("/api/payments/:id/pay", async (req, res) => {
    try {
      const { paymentDate, paymentMethod } = req.body;
      const payment = await storage.updatePayment(req.params.id, {
        status: "paid",
        paymentDate,
        paymentMethod,
      });
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      res.status(500).json({ error: "Failed to mark payment as paid" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    try {
      const success = await storage.deletePayment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // Revenues routes
  app.get("/api/revenues", async (req, res) => {
    try {
      const revenues = await storage.getAllRevenues();
      res.json(revenues);
    } catch (error) {
      console.error("Error fetching revenues:", error);
      res.status(500).json({ error: "Failed to fetch revenues" });
    }
  });

  app.get("/api/revenues/:id", async (req, res) => {
    try {
      const revenue = await storage.getRevenue(req.params.id);
      if (!revenue) {
        return res.status(404).json({ error: "Revenue not found" });
      }
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching revenue:", error);
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });

  app.post("/api/revenues", async (req, res) => {
    try {
      console.log("Creating revenue with data:", req.body);
      const validatedData = insertRevenueSchema.parse(req.body);
      const revenue = await storage.createRevenue(validatedData);
      res.status(201).json(revenue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Revenue validation error:", error.errors);
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating revenue:", error);
      res.status(500).json({ error: "Failed to create revenue" });
    }
  });

  app.patch("/api/revenues/:id", async (req, res) => {
    try {
      const revenue = await storage.updateRevenue(req.params.id, req.body);
      if (!revenue) {
        return res.status(404).json({ error: "Revenue not found" });
      }
      res.json(revenue);
    } catch (error) {
      console.error("Error updating revenue:", error);
      res.status(500).json({ error: "Failed to update revenue" });
    }
  });

  app.delete("/api/revenues/:id", async (req, res) => {
    try {
      const success = await storage.deleteRevenue(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Revenue not found" });
      }
      res.json({ message: "Revenue deleted successfully" });
    } catch (error) {
      console.error("Error deleting revenue:", error);
      res.status(500).json({ error: "Failed to delete revenue" });
    }
  });

  // Expenses routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      console.log("Creating expense with data:", req.body);
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Expense validation error:", error.errors);
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.updateExpense(req.params.id, req.body);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const success = await storage.deleteExpense(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Endpoint para extornar pagamento
  app.patch("/api/payments/:id/reverse", async (req, res) => {
    try {
      const { reason } = req.body;
      const payment = await storage.updatePayment(req.params.id, {
        isReversed: true,
        reversedAt: new Date(),
        reversedBy: 'admin', // TODO: pegar usuário da sessão
        reversalReason: reason || 'Sem motivo especificado',
        status: 'pending'
      });
      
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error) {
      console.error("Error reversing payment:", error);
      res.status(500).json({ error: "Failed to reverse payment" });
    }
  });

  // Endpoint para marcar receita como paga
  app.patch("/api/revenues/:id/pay", async (req, res) => {
    try {
      const { paymentDate, paymentMethod } = req.body;
      const revenue = await storage.updateRevenue(req.params.id, {
        status: 'received',
        paymentDate,
        paymentMethod
      });
      
      if (!revenue) {
        return res.status(404).json({ error: "Revenue not found" });
      }
      
      res.json(revenue);
    } catch (error) {
      console.error("Error marking revenue as paid:", error);
      res.status(500).json({ error: "Failed to mark revenue as paid" });
    }
  });

  // Endpoint para extornar receita
  app.patch("/api/revenues/:id/reverse", async (req, res) => {
    try {
      const { reason } = req.body;
      const revenue = await storage.updateRevenue(req.params.id, {
        isReversed: true,
        reversedAt: new Date(),
        reversedBy: 'admin', // TODO: pegar usuário da sessão
        reversalReason: reason || 'Sem motivo especificado',
        status: 'pending'
      });
      
      if (!revenue) {
        return res.status(404).json({ error: "Revenue not found" });
      }
      
      res.json(revenue);
    } catch (error) {
      console.error("Error reversing revenue:", error);
      res.status(500).json({ error: "Failed to reverse revenue" });
    }
  });

  // Endpoint para marcar despesa como paga
  app.patch("/api/expenses/:id/pay", async (req, res) => {
    try {
      const { paymentDate, paymentMethod } = req.body;
      const expense = await storage.updateExpense(req.params.id, {
        status: 'paid',
        paymentDate,
        paymentMethod
      });
      
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error marking expense as paid:", error);
      res.status(500).json({ error: "Failed to mark expense as paid" });
    }
  });

  // Endpoint para extornar despesa
  app.patch("/api/expenses/:id/reverse", async (req, res) => {
    try {
      const { reason } = req.body;
      const expense = await storage.updateExpense(req.params.id, {
        isReversed: true,
        reversedAt: new Date(),
        reversedBy: 'admin', // TODO: pegar usuário da sessão
        reversalReason: reason || 'Sem motivo especificado',
        status: 'pending'
      });
      
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error reversing expense:", error);
      res.status(500).json({ error: "Failed to reverse expense" });
    }
  });

  // External Links routes
  
  // Endpoint público para redirecionamento
  app.get("/api/public/external-links/redirect/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      const link = await storage.getExternalLinkByShortCode(shortCode);
      
      if (!link) {
        return res.status(404).json({ error: "Link não encontrado" });
      }
      
      // Incrementar contador de acesso
      await storage.incrementLinkAccess(shortCode);
      
      // Redirecionar para o link original
      res.redirect(link.originalUrl);
    } catch (error) {
      console.error("Error redirecting external link:", error);
      res.status(500).json({ error: "Erro no redirecionamento" });
    }
  });

  // Endpoint público para gerar links de QR code
  app.post("/api/public/external-links/generate", async (req, res) => {
    try {
      const parsedData = insertExternalLinkSchema.parse(req.body);
      const link = await storage.createExternalLink(parsedData);
      
      // Retornar apenas os dados necessários
      res.json({
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        shortUrl: `/api/public/external-links/redirect/${link.shortCode}`,
        linkType: link.linkType
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      console.error("Error generating external link:", error);
      res.status(500).json({ error: "Falha ao gerar link externo" });
    }
  });

  // Endpoints protegidos para gerenciar links
  app.get("/api/external-links", requireAuth, async (req, res) => {
    try {
      const links = await storage.getAllExternalLinks();
      res.json(links);
    } catch (error) {
      console.error("Error fetching external links:", error);
      res.status(500).json({ error: "Failed to fetch external links" });
    }
  });

  app.get("/api/external-links/:id", requireAuth, async (req, res) => {
    try {
      const link = await storage.getExternalLink(req.params.id);
      if (!link) {
        return res.status(404).json({ error: "Link não encontrado" });
      }
      res.json(link);
    } catch (error) {
      console.error("Error fetching external link:", error);
      res.status(500).json({ error: "Failed to fetch external link" });
    }
  });

  app.post("/api/external-links", requireAuth, async (req, res) => {
    try {
      const parsedData = insertExternalLinkSchema.parse(req.body);
      const link = await storage.createExternalLink(parsedData);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating external link:", error);
      res.status(500).json({ error: "Failed to create external link" });
    }
  });

  app.put("/api/external-links/:id", requireAuth, async (req, res) => {
    try {
      const parsedData = insertExternalLinkSchema.partial().parse(req.body);
      const link = await storage.updateExternalLink(req.params.id, parsedData);
      if (!link) {
        return res.status(404).json({ error: "Link não encontrado" });
      }
      res.json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating external link:", error);
      res.status(500).json({ error: "Failed to update external link" });
    }
  });

  app.delete("/api/external-links/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deleteExternalLink(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Link não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting external link:", error);
      res.status(500).json({ error: "Failed to delete external link" });
    }
  });

  // Assets routes (Controle Patrimonial)
  app.get("/api/assets", requireAuth, requirePermission('assets.read'), async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/active", requireAuth, requirePermission('assets.read'), async (req, res) => {
    try {
      const assets = await storage.getActiveAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching active assets:", error);
      res.status(500).json({ error: "Failed to fetch active assets" });
    }
  });

  app.get("/api/assets/category/:category", requireAuth, requirePermission('assets.read'), async (req, res) => {
    try {
      const { category } = req.params;
      const assets = await storage.getAssetsByCategory(category);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets by category:", error);
      res.status(500).json({ error: "Failed to fetch assets by category" });
    }
  });

  app.get("/api/assets/situation/:situation", requireAuth, requirePermission('assets.read'), async (req, res) => {
    try {
      const { situation } = req.params;
      const assets = await storage.getAssetsBySituation(situation);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets by situation:", error);
      res.status(500).json({ error: "Failed to fetch assets by situation" });
    }
  });

  app.get("/api/assets/:id", requireAuth, requirePermission('assets.read'), async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", requireAuth, requirePermission('assets.create'), async (req, res) => {
    try {
      const validatedData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(validatedData);
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  app.put("/api/assets/:id", requireAuth, requirePermission('assets.update'), async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(id, validatedData);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error updating asset:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", requireAuth, requirePermission('assets.delete'), async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAsset(id);
      if (!success) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  app.put("/api/assets/:id/inactivate", requireAuth, requirePermission('assets.update'), async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.inactivateAsset(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error inactivating asset:", error);
      res.status(500).json({ error: "Failed to inactivate asset" });
    }
  });

  app.put("/api/assets/:id/activate", requireAuth, requirePermission('assets.update'), async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.activateAsset(id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error activating asset:", error);
      res.status(500).json({ error: "Failed to activate asset" });
    }
  });

  // Dynamic favicon endpoint - simplified and secure
  app.get("/api/favicon", async (req, res) => {
    try {
      const faviconSetting = await storage.getSystemSetting('favicon');
      
      // Headers para compatibilidade e cache
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      if (faviconSetting && faviconSetting.fileUrl) {
        // Validação de segurança: só aceitar arquivos em uploads
        const fileUrl = faviconSetting.fileUrl;
        
        // Verificar se o path é seguro (dentro de uploads)
        if (!fileUrl.startsWith('/uploads/') && !fileUrl.startsWith('uploads/')) {
          console.warn(`Favicon path outside uploads directory: ${fileUrl}`);
        } else {
          // Normalizar path e validar
          const safePath = fileUrl.replace(/^\/+/, ''); // Remove barras iniciais
          const faviconPath = path.join(process.cwd(), 'client', 'public', safePath);
          
          // Verificar se o path resolve dentro do diretório uploads
          const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
          if (faviconPath.startsWith(uploadsDir) && fs.existsSync(faviconPath)) {
            // Determinar content type
            const ext = path.extname(faviconPath).toLowerCase();
            let contentType = 'image/x-icon';
            
            if (ext === '.png') contentType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.gif') contentType = 'image/gif';
            else if (ext === '.svg') contentType = 'image/svg+xml';
            
            res.setHeader('Content-Type', contentType);
            return res.sendFile(path.resolve(faviconPath));
          } else {
            console.warn(`Favicon file not accessible: ${faviconPath}`);
          }
        }
      }
      
      // Fallback para favicon padrão
      const defaultPaths = [
        path.join(process.cwd(), 'client', 'public', 'favicon.ico'),
        path.join(process.cwd(), 'client', 'public', 'favicon.png')
      ];
      
      for (const defaultPath of defaultPaths) {
        if (fs.existsSync(defaultPath)) {
          const ext = path.extname(defaultPath).toLowerCase();
          const contentType = ext === '.png' ? 'image/png' : 'image/x-icon';
          res.setHeader('Content-Type', contentType);
          return res.sendFile(path.resolve(defaultPath));
        }
      }
      
      // Favicon inline como último recurso
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect width="32" height="32" fill="#8A05FF"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">P</text>
      </svg>`);
      
    } catch (error: any) {
      console.error("Error serving favicon:", error.message || error);
      res.status(500).json({ error: "Failed to serve favicon" });
    }
  });

  // System Settings routes
  app.get("/api/system/settings", requireAuth, requirePermission('system.manage'), async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  });

  app.get("/api/system/settings/:key", requireAuth, requirePermission('system.manage'), async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ error: "Failed to fetch system setting" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow only favicon-compatible files
      const allowedTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/ico'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only ICO and PNG files are allowed.'));
      }
    }
  });

  app.post("/api/system/settings", requireAuth, requirePermission('system.manage'), upload.single('file'), async (req, res) => {
    try {
      const { key, value, description, category } = req.body;
      let fileUrl: string | undefined = undefined;

      // Handle file upload if present
      if (req.file) {
        const fileName = `${key}_${Date.now()}_${req.file.originalname}`;
        const filePath = path.join(process.cwd(), 'client', 'public', 'uploads', fileName);
        
        // Create uploads directory if it doesn't exist
        const uploadDir = path.dirname(filePath);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Save file to disk
        fs.writeFileSync(filePath, req.file.buffer);
        fileUrl = `/uploads/${fileName}`;
      }

      const setting = await storage.createOrUpdateSystemSetting(
        key,
        value || undefined,
        fileUrl,
        description || undefined,
        category || 'general'
      );

      res.json(setting);
    } catch (error) {
      console.error("Error saving system setting:", error);
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to save system setting" });
    }
  });

  app.delete("/api/system/settings/:key", requireAuth, requirePermission('system.manage'), async (req, res) => {
    try {
      const { key } = req.params;
      const success = await storage.deleteSystemSetting(key);
      if (!success) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system setting:", error);
      res.status(500).json({ error: "Failed to delete system setting" });
    }
  });

  app.delete("/api/system/settings/:key/file", requireAuth, requirePermission('system.manage'), async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }

      if (setting.fileUrl) {
        // Remove file from disk
        const filePath = path.join(process.cwd(), 'client', 'public', setting.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Update setting to remove file URL
        await storage.createOrUpdateSystemSetting(
          key,
          setting.value || undefined,
          undefined, // Clear file URL
          setting.description || undefined,
          setting.category || 'general'
        );
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error removing system setting file:", error);
      res.status(500).json({ error: "Failed to remove system setting file" });
    }
  });

  return httpServer;
}
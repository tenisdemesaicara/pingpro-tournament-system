import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAthleteSchema, insertTournamentSchema, insertTournamentParticipantSchema, insertMatchSchema, insertCategorySchema, insertPaymentSchema, insertRevenueSchema, insertExpenseSchema, insertConsentSchema, insertExternalLinkSchema, tournamentRegistrationSchema } from "@shared/schema";
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

  // DEBUG: Endpoint para verificar se ambos domínios usam mesmo DB
  app.get("/api/debug/env", (req, res) => {
    const dbUrl = process.env.DATABASE_URL || 'no-db-url';
    const dbHash = dbUrl.substring(0, 20) + '...' + dbUrl.substring(dbUrl.length - 10);
    
    res.json({
      host: req.headers.host,
      forwarded_host: req.headers['x-forwarded-host'],
      forwarded_proto: req.headers['x-forwarded-proto'],
      origin: req.headers.origin,
      database_hash: dbHash,
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

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
      req.session.user = user;
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
      // Retorna TODOS os atletas - o frontend faz a segmentação por status
      res.json(athletes);
    } catch (error) {
      console.error("Error fetching athletes:", error);
      res.status(500).json({ error: "Failed to fetch athletes", details: error instanceof Error ? error.message : String(error) });
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
            if (category.gender === "misto") {
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
        status: 'pending' as const,
        type: 'atleta' as const,
        points: 0
      };
      
      const athlete = await storage.createAthlete(athleteData);
      console.log("✅ Atleta salvo no banco:", athlete.id);
      
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
          return res.status(400).json({ 
            error: "CPF já cadastrado", 
            message: "Este CPF já está cadastrado no sistema. Se você já tem cadastro, entre em contato com os administradores para verificar sua situação." 
          });
        }
      }
      
      // Check RG (if provided)
      if (validatedData.rg) {
        const existingRg = existingAthletes.find(a => a.rg === validatedData.rg);
        if (existingRg) {
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating athlete:", error);
      res.status(500).json({ error: "Failed to create athlete" });
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
        
        const { tournamentId, category: categoryId, athleteId, consentData, ...athleteData } = validatedData;
        
        // 2. Validate tournament exists and is accepting registrations
        console.log(`🏆 Validating tournament ${tournamentId}...`);
        const tournament = await storage.getTournament(tournamentId);
        if (!tournament) {
          throw new Error("Torneio não encontrado");
        }
        
        if (tournament.status === 'completed') {
          throw new Error("Este torneio já foi finalizado");
        }
        
        if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
          throw new Error("Prazo de inscrição expirado");
        }
        
        // 3. Validate category exists and belongs to tournament
        console.log(`📋 Validating category ${categoryId}...`);
        const tournamentCategories = await storage.getTournamentCategories(tournamentId);
        const selectedCategory = tournamentCategories.find(cat => cat.id === categoryId);
        
        if (!selectedCategory) {
          throw new Error("Categoria selecionada não pertence a este torneio");
        }
        
        // 4. Athlete eligibility validation
        console.log(`👤 Validating athlete eligibility...`);
        const tournamentYear = extractYearFromDate(tournament.startDate?.toISOString() || new Date().toISOString());
        const ageInTournament = calculateAgeInTournamentYear(athleteData.birthDate, tournamentYear);
        
        // Validate age eligibility for the category
        if (!selectedCategory.name.toLowerCase().includes('absoluto')) {
          if (selectedCategory.minAge !== null && ageInTournament < selectedCategory.minAge) {
            throw new Error(`Idade mínima para a categoria ${selectedCategory.name}: ${selectedCategory.minAge} anos`);
          }
          if (selectedCategory.maxAge !== null && ageInTournament > selectedCategory.maxAge) {
            throw new Error(`Idade máxima para a categoria ${selectedCategory.name}: ${selectedCategory.maxAge} anos`);
          }
        }
        
        // Validate gender eligibility
        if (selectedCategory.gender !== 'misto') {
          const normalizedAthleteGender = athleteData.gender === 'masculino' ? 'masculino' : 'feminino';
          const normalizedCategoryGender = selectedCategory.gender === 'masculino' ? 'masculino' : 'feminino';
          
          if (normalizedAthleteGender !== normalizedCategoryGender) {
            throw new Error(`Esta categoria é exclusiva para o sexo ${selectedCategory.gender}`);
          }
        }
        
        let finalAthleteId = athleteId;
        let createdNewAthlete = false;
        
        // 5. Handle athlete creation/validation
        if (!athleteId) {
          console.log("👤 Creating new athlete...");
          
          // Check for existing athlete with same CPF or email
          const existingAthletes = await storage.getAllAthletes();
          
          if (athleteData.cpf) {
            const existingCpf = existingAthletes.find(a => a.cpf === athleteData.cpf);
            if (existingCpf) {
              throw new Error("Este CPF já está cadastrado no sistema. Use a opção 'Buscar Atleta' se você já tem conta.");
            }
          }
          
          const existingEmail = existingAthletes.find(a => a.email === athleteData.email);
          if (existingEmail) {
            throw new Error("Este email já está cadastrado no sistema.");
          }
          
          // Create new athlete
          const newAthlete = await storage.createAthlete({
            ...athleteData,
            status: 'pending' // New athletes need approval
          });
          
          finalAthleteId = newAthlete.id;
          createdNewAthlete = true;
          console.log(`✅ New athlete created: ${finalAthleteId}`);
          
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
        const existingParticipants = await storage.getTournamentParticipants(tournamentId);
        const alreadyRegistered = existingParticipants.some(p => p.id === finalAthleteId);
        
        if (alreadyRegistered) {
          throw new Error("Você já está inscrito neste torneio");
        }
        
        // 7. Check category participant limit
        const categoryParticipants = await storage.getTournamentParticipantsWithCategories(tournamentId);
        const categoryParticipantCount = categoryParticipants.filter(p => p.categoryId === categoryId).length;
        
        // Note: maxParticipants per category would need to be added to the schema
        // For now, checking global tournament limit
        if (tournament.maxParticipants && existingParticipants.length >= tournament.maxParticipants) {
          throw new Error("Torneio já atingiu o limite máximo de participantes");
        }
        
        // 8. Create participation record
        console.log(`🎾 Creating participation record...`);
        const participation = await storage.addParticipant({
          tournamentId,
          athleteId: finalAthleteId,
          categoryId
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
          });
          
          return {
            status: 400,
            data: {
              error: "Dados inválidos",
              message: "Por favor, verifique os dados fornecidos.",
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
      const tournament = await storage.updateTournament(req.params.id, req.body);
      if (!tournament) {
        return res.status(404).json({ error: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error updating tournament:", error);
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

  // Gerar chaveamento para uma categoria específica (com configuração dinâmica baseada no formato)
  app.post("/api/tournaments/:id/categories/:categoryId/generate-bracket", requireAuth, async (req, res) => {
    try {
      console.log("=== GENERATE CATEGORY BRACKET DEBUG ===");
      console.log("Tournament ID:", req.params.id);
      console.log("Category ID:", req.params.categoryId);
      console.log("User:", req.session.user?.username, "Role:", req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user');
      console.log("Request body:", req.body);
      
      // Verificar permissões (só admin pode gerar chaveamento)
      if (req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user' !== 'admin') {
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
      
      switch (format) {
        case 'group_stage_knockout':
          // Para grupos + mata-mata, precisa de configurações dinâmicas
          const groupConfig = req.body.groupConfig || {};
          const numGroups = groupConfig.numGroups || Math.min(4, Math.ceil(participants.length / 4));
          const advancesPerGroup = groupConfig.advancesPerGroup || 2;
          
          console.log(`Group stage config: ${numGroups} grupos, ${advancesPerGroup} avançam por grupo`);
          
          matches = await generateGroupStageMatches(
            req.params.id, 
            req.params.categoryId, 
            participants, 
            numGroups,
            advancesPerGroup
          );
          break;
          
        case 'round_robin':
          console.log("Creating round-robin (todos contra todos) matches...");
          matches = await generateRoundRobinMatches(req.params.id, req.params.categoryId, participants);
          break;
          
        case 'single_elimination':
        case 'double_elimination':
        default:
          console.log("Creating knockout elimination matches...");
          matches = await generateKnockoutMatches(req.params.id, req.params.categoryId, participants, format);
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
      if (req.session.user?.roles?.some(r => r.name === 'admin') ? 'admin' : 'user' !== 'admin') {
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

      if (tournament.status === 'finished') {
        return res.status(400).json({ error: "Não é possível inscrever atletas em torneio finalizado" });
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
  app.post("/api/debug/fix-bracket/:tournamentId/:categoryId", async (req, res) => {
    try {
      console.log(`[DEBUG] Forçando reconciliação manual para ${req.params.tournamentId}/${req.params.categoryId}`);
      
      // Forçar reconciliação de placeholders
      await bracketManager.reconcilePlaceholders(req.params.tournamentId, req.params.categoryId, 2);
      
      // Auto-completar partidas BYE
      await bracketManager.autoCompleteBYEMatches(req.params.tournamentId, req.params.categoryId);
      
      res.json({ success: true, message: "Bracket reconciliation forced" });
    } catch (error) {
      console.error("Error in bracket reconciliation:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });
  
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
      const phases = ["group", "round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"];
      const bracket: any = {};

      // COPA DO MUNDO: Verificar se eliminatórias existem, se não, criar placeholders automaticamente
      const eliminationPhases = ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"];
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
      res.status(204).send();
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
      res.status(204).send();
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
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
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

  return httpServer;
}
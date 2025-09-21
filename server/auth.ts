import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users, roles, permissions, userRoles, rolePermissions, userPermissionOverrides } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { User, UserWithRoles, Permission } from '@shared/schema';

// Interface para o usuário na sessão
interface SessionUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  profileImageUrl?: string;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
    permissions: Permission[];
  }>;
  effectivePermissions: string[]; // Lista de nomes de permissões efetivas (roles + grants - denies)
  token?: string; // JWT token para cross-domain em produção
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

/**
 * Calcula as permissões efetivas de um usuário
 * Fórmula: (permissões dos roles ∪ grants individuais) - denies individuais
 */
async function computeEffectivePermissions(userId: string, rolePermissions: Permission[]): Promise<string[]> {
  try {
    // Buscar overrides individuais do usuário
    const overrides = await db.select({
      permissionName: permissions.name,
      effect: userPermissionOverrides.effect,
    })
    .from(userPermissionOverrides)
    .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id))
    .where(eq(userPermissionOverrides.userId, userId));

    // Criar sets para performance
    const basePermissions = new Set(rolePermissions.map(p => p.name));
    const grants = new Set(overrides.filter(o => o.effect === 'grant').map(o => o.permissionName));
    const denies = new Set(overrides.filter(o => o.effect === 'deny').map(o => o.permissionName));

    // Calcular permissões efetivas: (base ∪ grants) - denies
    const effective = new Set([...Array.from(basePermissions), ...Array.from(grants)]);
    
    // Remover negações (deny sempre ganha)
    denies.forEach(deny => effective.delete(deny));

    return Array.from(effective);
  } catch (error) {
    console.error('Erro ao calcular permissões efetivas:', error);
    return rolePermissions.map(p => p.name); // Fallback para permissões dos roles
  }
}

/**
 * Busca um usuário completo com suas roles e permissões
 */
export async function getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
  try {
    // Buscar o usuário
    const userResult = await db.select().from(users).where(eq(users.id, userId));
    if (!userResult.length) return null;
    
    const user = userResult[0];
    if (!user.isActive) return null;

    // Buscar roles do usuário
    const userRolesResult = await db.select({
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDisplayName: roles.displayName,
      roleDescription: roles.description,
    }).from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

    // Buscar permissões para cada role
    const rolesWithPermissions = await Promise.all(
      userRolesResult.map(async (userRole) => {
        const rolePermissionsResult = await db.select({
          permissionId: permissions.id,
          permissionName: permissions.name,
          permissionDisplayName: permissions.displayName,
          permissionDescription: permissions.description,
          permissionModule: permissions.module,
          permissionAction: permissions.action,
        }).from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, userRole.roleId));

        return {
          id: userRole.roleId,
          name: userRole.roleName,
          displayName: userRole.roleDisplayName,
          description: userRole.roleDescription,
          createdAt: new Date(),
          isSystemRole: false,
          permissions: rolePermissionsResult.map(p => ({
            id: p.permissionId,
            name: p.permissionName,
            displayName: p.permissionDisplayName,
            description: p.permissionDescription,
            module: p.permissionModule,
            action: p.permissionAction,
            createdAt: new Date(),
          }))
        };
      })
    );

    // Coletar todas as permissões dos roles
    const allRolePermissions = rolesWithPermissions.flatMap(role => role.permissions);
    
    // Calcular permissões efetivas
    const effectivePermissions = await computeEffectivePermissions(userId, allRolePermissions);

    return {
      ...user,
      roles: rolesWithPermissions,
      effectivePermissions
    };
  } catch (error) {
    console.error('Erro ao buscar usuário com roles:', error);
    return null;
  }
}

/**
 * Autentica um usuário usando username/email e senha
 */
export async function authenticateUser(usernameOrEmail: string, password: string): Promise<SessionUser | null> {
  try {
    // Buscar usuário por username ou email
    const userResult = await db.select().from(users).where(
      eq(users.username, usernameOrEmail)
    );
    
    if (!userResult.length) {
      // Tentar buscar por email
      const emailResult = await db.select().from(users).where(
        eq(users.email, usernameOrEmail)
      );
      if (!emailResult.length) return null;
      userResult.push(emailResult[0]);
    }

    const user = userResult[0];
    if (!user.isActive) return null;

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) return null;

    // Atualizar último login
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Buscar usuário com roles e permissões
    const userWithRoles = await getUserWithRoles(user.id);
    if (!userWithRoles) return null;

    // Converter para formato da sessão
    const sessionUser: SessionUser = {
      id: userWithRoles.id,
      username: userWithRoles.username,
      email: userWithRoles.email,
      firstName: userWithRoles.firstName,
      lastName: userWithRoles.lastName,
      isActive: userWithRoles.isActive ?? true,
      profileImageUrl: userWithRoles.profileImageUrl || undefined,
      roles: userWithRoles.roles,
      effectivePermissions: userWithRoles.effectivePermissions
    };

    // CORREÇÃO CRÍTICA: Usar JWT para cross-domain em vez de session
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      const token = jwt.sign(
        { userId: sessionUser.id, timestamp: Date.now() },
        process.env.JWT_SECRET || 'dev-jwt-secret',
        { expiresIn: '24h' }
      );
      return { ...sessionUser, token };
    }

    return sessionUser;
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return null;
  }
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Acesso negado. Login necessário.' });
  }
  
  if (!req.session.user.isActive) {
    return res.status(401).json({ message: 'Usuário inativo.' });
  }
  
  next();
}

/**
 * Middleware para verificar se o usuário tem uma permissão específica
 * CORREÇÃO DE SEGURANÇA: Agora usa permissões efetivas (inclui overrides individuais)
 */
export function requirePermission(permissionName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Acesso negado. Login necessário.' });
    }

    const user = req.session.user;
    
    // SEGURANÇA: Verificar usando permissões efetivas que incluem overrides individuais
    const hasPermission = user.effectivePermissions.includes(permissionName);

    if (!hasPermission) {
      console.log(`🔒 ACESSO NEGADO: Usuário ${user.username} (${user.id}) tentou acessar permissão '${permissionName}' mas não tem acesso`);
      console.log(`📋 Permissões efetivas do usuário: ${user.effectivePermissions.join(', ')}`);
      return res.status(403).json({ 
        message: 'Acesso negado. Permissão insuficiente.',
        required: permissionName
      });
    }

    console.log(`✅ ACESSO PERMITIDO: Usuário ${user.username} (${user.id}) acessou permissão '${permissionName}'`);
    next();
  };
}

/**
 * Middleware para verificar se o usuário tem uma das permissões especificadas
 * CORREÇÃO DE SEGURANÇA: Agora usa permissões efetivas (inclui overrides individuais)
 */
export function requireAnyPermission(permissionNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Acesso negado. Login necessário.' });
    }

    const user = req.session.user;
    
    // SEGURANÇA: Verificar usando permissões efetivas que incluem overrides individuais
    const hasAnyPermission = permissionNames.some(permissionName => 
      user.effectivePermissions.includes(permissionName)
    );

    if (!hasAnyPermission) {
      console.log(`🔒 ACESSO NEGADO: Usuário ${user.username} (${user.id}) tentou acessar uma das permissões [${permissionNames.join(', ')}] mas não tem acesso`);
      console.log(`📋 Permissões efetivas do usuário: ${user.effectivePermissions.join(', ')}`);
      return res.status(403).json({ 
        message: 'Acesso negado. Permissão insuficiente.',
        required: permissionNames
      });
    }

    console.log(`✅ ACESSO PERMITIDO: Usuário ${user.username} (${user.id}) acessou uma das permissões [${permissionNames.join(', ')}]`);
    next();
  };
}

/**
 * Middleware para verificar se o usuário tem uma role específica
 */
export function requireRole(roleName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Acesso negado. Login necessário.' });
    }

    const user = req.session.user;
    const hasRole = user.roles.some((role: any) => role.name === roleName);

    if (!hasRole) {
      return res.status(403).json({ 
        message: 'Acesso negado. Role insuficiente.',
        required: roleName
      });
    }

    next();
  };
}

/**
 * Função utilitária para verificar permissões programaticamente
 * CORREÇÃO DE SEGURANÇA: Agora usa permissões efetivas (inclui overrides individuais)
 */
export function userHasPermission(user: SessionUser, permissionName: string): boolean {
  return user.effectivePermissions.includes(permissionName);
}

/**
 * Função utilitária para verificar roles programaticamente
 */
export function userHasRole(user: SessionUser, roleName: string): boolean {
  return user.roles.some((role: any) => role.name === roleName);
}

/**
 * Função para recarregar as permissões do usuário da sessão
 */
export async function refreshUserSession(req: Request): Promise<boolean> {
  if (!req.session?.user) return false;

  try {
    const userWithRoles = await getUserWithRoles(req.session.user.id);
    if (!userWithRoles) return false;

    // Atualizar sessão com dados atualizados
    req.session.user = {
      id: userWithRoles.id,
      username: userWithRoles.username,
      email: userWithRoles.email,
      firstName: userWithRoles.firstName,
      lastName: userWithRoles.lastName,
      isActive: userWithRoles.isActive ?? true,
      profileImageUrl: userWithRoles.profileImageUrl || undefined,
      roles: userWithRoles.roles,
      effectivePermissions: userWithRoles.effectivePermissions
    };

    return true;
  } catch (error) {
    console.error('Erro ao recarregar sessão do usuário:', error);
    return false;
  }
}

/**
 * LEGADO: Manter retrocompatibilidade temporariamente
 * @deprecated - Usar authenticateUser ao invés disso
 */
export async function createDefaultPasswords() {
  console.log('🔐 Sistema de usuários migrado para banco de dados');
  console.log('👤 Login: use as credenciais configuradas no sistema');
  console.log('🛡️  Por segurança, credenciais não são exibidas no console');
  console.log('');
}
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  action: string;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: Permission[];
}

interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  profileImageUrl?: string;
  roles: Role[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyPermission: (permissionNames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    // Definir rotas que não precisam de autenticação
    const currentPath = window.location.pathname;
    const publicRoutes = [
      '/consent/',
      '/cadastro-',
      '/self-registration',
      '/tournament/',
      '/simple-register/',
      '/register/tournament/'
    ];

    const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));

    if (isPublicRoute) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Logout local mesmo se falhar no servidor
    } finally {
      setUser(null);
    }
  };

  // Funções de verificação de permissão
  const hasPermission = (permissionName: string): boolean => {
    if (!user || !user.roles) return false;
    
    return user.roles.some(role => 
      role.permissions?.some(permission => permission.name === permissionName)
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !user.roles) return false;
    
    return user.roles.some(role => role.name === roleName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    if (!user || !user.roles) return false;
    
    return permissionNames.some(permissionName => hasPermission(permissionName));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    isLoading,
    login,
    logout,
    checkAuth,
    hasPermission,
    hasRole,
    hasAnyPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
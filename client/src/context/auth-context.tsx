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
  token?: string; // JWT token para cross-domain
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

// Helper: Garantir URL absoluta HTTPS em produção para evitar perda de headers
function ensureHttpsUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && path.startsWith('/')) {
    return window.location.origin + path;
  }
  return path;
}

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
      // Verificar se há token JWT armazenado
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(ensureHttpsUrl('/api/auth/me'), {
        headers,
        credentials: 'include' // Manter para development
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Se falhar com token, limpar localStorage
        if (token) {
          localStorage.removeItem('authToken');
        }
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
      const response = await fetch(ensureHttpsUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include' // Manter para development
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Se receber JWT token, armazenar no localStorage
        if (userData.token) {
          localStorage.setItem('authToken', userData.token);
        }
        
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
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(ensureHttpsUrl('/api/auth/logout'), { 
        method: 'POST',
        headers,
        credentials: 'include'
      });
    } catch (error) {
      // Logout local mesmo se falhar no servidor
    } finally {
      // Limpar token do localStorage
      localStorage.removeItem('authToken');
      setUser(null);
      // Redirecionar para a página de apresentação
      window.location.href = '/';
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
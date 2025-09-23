import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, hasPermission, hasRole, hasAnyPermission } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => location === path;

  const navigationItems = [
    { href: "/dashboard", label: "Início", testId: "nav-home" },
    { href: "/tournaments", label: "Torneios", testId: "nav-tournaments" },
    { href: "/ranking", label: "Ranking", testId: "nav-ranking" },
    { href: "/financeiro", label: "Financeiro", testId: "nav-financeiro" },
    { href: "/patrimonio", label: "Patrimônio", testId: "nav-patrimonio" },
  ];

  const registrationItems = [
    { href: "/athletes", label: "Atletas", testId: "nav-athletes" },
    { href: "/associates", label: "Associados", testId: "nav-associates" },
  ];

  return (
    <nav className="bg-card border-b border-border material-elevation-1 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/dashboard" className="flex items-center space-x-3" data-testid="logo-link">
            <div className="ping-pong-ball animate-bounce-light"></div>
            <h1 className="text-2xl font-bold text-primary">Pong Pro</h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className={`transition-colors ${isActive(item.href) ? 'text-primary font-medium' : 'text-foreground hover:text-primary'}`}
                data-testid={item.testId}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Dropdown de Cadastros */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center transition-colors text-foreground hover:text-primary">
                Cadastros
                <ChevronDown className="ml-1 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {registrationItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link 
                      href={item.href}
                      className={`w-full ${isActive(item.href) ? 'text-primary font-medium' : 'text-foreground'}`}
                      data-testid={item.testId}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Dropdown de Administração - Controle baseado em permissões reais */}
            {hasAnyPermission(['users.read', 'system.manage', 'athletes.manage']) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="hidden sm:inline-flex"
                    data-testid="button-admin"
                  >
                    <span className="material-icons mr-2">admin_panel_settings</span>
                    {hasPermission('system.manage') ? 'Admin' : 'Operador'}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {hasPermission('users.read') && (
                    <DropdownMenuItem asChild>
                      <Link 
                        href="/admin/users"
                        className="w-full"
                        data-testid="nav-admin-users"
                      >
                        👥 Usuários
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasPermission('athletes.manage') && (
                    <DropdownMenuItem asChild>
                      <Link 
                        href="/admin/approvals"
                        className="w-full"
                        data-testid="nav-admin-approvals"
                      >
                        ✅ Aprovações
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system.manage') && (
                    <DropdownMenuItem asChild>
                      <Link 
                        href="/admin/consents"
                        className="w-full"
                        data-testid="nav-admin-consents"
                      >
                        🔒 Consentimentos LGPD
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system.manage') && (
                    <DropdownMenuItem asChild>
                      <Link 
                        href="/admin/system"
                        className="w-full"
                        data-testid="nav-admin-system"
                      >
                        ⚙️ Sistema
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Dropdown do usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-user-menu">
                  <User className="h-4 w-4 mr-2" />
                  {user?.username || 'Admin'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link 
                    href="/profile"
                    className="w-full"
                    data-testid="nav-profile"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={async () => {
                    await logout();
                    toast({
                      title: "Logout realizado",
                      description: "Você foi desconectado com sucesso.",
                    });
                  }}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/cadastro-atleta">
              <Button 
                className="material-elevation-1 text-sm sm:text-base px-3 sm:px-4"
                data-testid="button-register"
              >
                <span className="sm:hidden">+</span>
                <span className="hidden sm:inline">Cadastrar</span>
              </Button>
            </Link>
            
            {/* Mobile menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  data-testid="button-mobile-menu"
                  onTouchStart={() => setIsMobileMenuOpen(true)}
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <span className="material-icons">menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-white flex flex-col h-full">
                <SheetHeader className="pb-6 flex-shrink-0">
                  <SheetTitle className="text-left flex items-center space-x-2 text-xl font-bold">
                    <div className="ping-pong-ball"></div>
                    <span>Pong Pro</span>
                  </SheetTitle>
                  <SheetDescription className="text-left text-gray-600">
                    Sistema de gerenciamento de torneios de tênis de mesa
                  </SheetDescription>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-1 pb-6">
                    {navigationItems.map((item) => (
                    <Link 
                      key={item.href}
                      href={item.href}
                      className={`block px-6 py-4 text-lg font-medium transition-all duration-200 ${
                        isActive(item.href) 
                          ? 'bg-orange-500 text-white font-semibold rounded-lg mx-2 shadow-lg' 
                          : 'text-gray-800 hover:bg-gray-50 hover:text-orange-500'
                      }`}
                      data-testid={`mobile-${item.testId}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  
                  {/* Seção de Cadastros no Mobile */}
                  <div className="pt-6 mt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500 mb-4 px-6 uppercase tracking-wide">Cadastros</h3>
                    <div className="space-y-1">
                      {registrationItems.map((item) => (
                        <Link 
                          key={item.href}
                          href={item.href}
                          className={`block px-6 py-4 text-lg font-medium transition-all duration-200 ${
                            isActive(item.href) 
                              ? 'bg-orange-500 text-white font-semibold rounded-lg mx-2 shadow-lg' 
                              : 'text-gray-800 hover:bg-gray-50 hover:text-orange-500'
                          }`}
                          data-testid={`mobile-${item.testId}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="pt-2 space-y-1">
                      <h3 className="text-sm font-medium text-gray-500 mb-4 px-6 uppercase tracking-wide">Administração</h3>
                      <Link href="/admin/approvals">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          data-testid="mobile-button-admin-approvals"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span className="material-icons mr-2">admin_panel_settings</span>
                          Aprovações
                        </Button>
                      </Link>
                      <Link href="/admin/consents">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          data-testid="mobile-button-admin-consents"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span className="material-icons mr-2">shield</span>
                          Consentimentos LGPD
                        </Button>
                      </Link>
                    </div>
                    <Link href="/cadastro-atleta">
                      <Button 
                        className="w-full justify-start material-elevation-1"
                        data-testid="mobile-button-register"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="material-icons mr-2">person_add</span>
                        Cadastrar
                      </Button>
                    </Link>

                    {/* Botão de Logout no Mobile */}
                    <div className="pt-4 border-t border-gray-200 mt-4">
                      <Button 
                        variant="outline"
                        className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                        onClick={async () => {
                          await logout();
                          setIsMobileMenuOpen(false);
                          toast({
                            title: "Logout realizado",
                            description: "Você foi desconectado com sucesso.",
                          });
                        }}
                        data-testid="mobile-button-logout"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair ({user?.username})
                      </Button>
                    </div>
                  </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}

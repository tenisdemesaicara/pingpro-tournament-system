import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Users, Trophy, BarChart3, LogIn, UserPlus, Eye } from "lucide-react";

export default function Home() {
  const actions = [
    {
      icon: LogIn,
      title: "Entrar no Sistema",
      description: "Acesso para administradores e colaboradores",
      href: "/login",
      variant: "default" as const,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      icon: UserPlus,
      title: "Inscrever-se",
      description: "Criar conta para gestão de clube ou associação",
      href: "#",
      variant: "outline" as const,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      comingSoon: true,
    },
    {
      icon: Eye,
      title: "Visualizar Torneios",
      description: "Ver torneios ativos e resultados",
      href: "/torneios-publicos",
      variant: "outline" as const,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  const resources = [
    {
      icon: CreditCard,
      title: "Gestão financeira",
      description: "Controle contas a pagar e receber.",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      icon: Users,
      title: "Atletas e associados",
      description: "Cadastro organizado e atualizado.",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      icon: Trophy,
      title: "Torneios e ranking",
      description: "Acompanhe resultados e desempenho em tempo real.",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      icon: BarChart3,
      title: "Relatórios práticos",
      description: "Informações claras para apoiar decisões.",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900 text-white py-20 lg:py-32">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="text-hero-title">
            Gestão da Associação
            <br />
            <span className="text-blue-200">Mesatenista de Içara</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto" data-testid="text-hero-subtitle">
            Controle financeiro, mensalidades, atletas, associados, torneios e ranking em uma única plataforma
            fácil de usar.
          </p>
          
          {/* Botões de Ação Principal */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {actions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <div key={index} className="relative">
                  <Link href={action.href}>
                    <Button 
                      size="lg" 
                      variant={action.variant}
                      className={`text-lg font-medium px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 ${
                        action.variant === 'default' 
                          ? 'bg-white text-blue-600 hover:bg-gray-100' 
                          : 'bg-white/10 border-2 border-white text-white hover:bg-white hover:text-blue-600 backdrop-blur-sm'
                      }`}
                      disabled={action.comingSoon}
                      data-testid={`button-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <IconComponent className="h-5 w-5 mr-2" />
                      {action.title}
                    </Button>
                  </Link>
                  {action.comingSoon && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      Em breve
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Seção de Recursos */}
      <section id="recursos" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tudo o que você precisa em um só lugar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {resources.map((resource, index) => {
              const IconComponent = resource.icon;
              return (
                <Card 
                  key={index} 
                  className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  data-testid={`resource-card-${index}`}
                >
                  <CardContent className="pt-6">
                    <div className={`w-16 h-16 ${resource.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className={`h-8 w-8 ${resource.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" data-testid={`resource-title-${index}`}>
                      {resource.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm" data-testid={`resource-description-${index}`}>
                      {resource.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Seção Sobre */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Sobre o Sistema
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            A Associação Mesatenista de Içara agora conta com um sistema digital que une gestão administrativa, 
            financeira e esportiva em um só ambiente. Simples, ágil e confiável.
          </p>
        </div>
      </section>

      {/* Chamada Final (Call to Action) */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Mais tempo para o esporte, menos preocupação com a gestão.
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Simplifique a administração da sua associação e foque no que realmente importa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button 
                size="lg" 
                className="text-lg font-medium px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-cta-login"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Entrar no Sistema
              </Button>
            </Link>
            <Link href="/torneios-publicos">
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg font-medium px-8 py-4 bg-white/10 border-2 border-white text-white hover:bg-white hover:text-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
                data-testid="button-cta-tournaments"
              >
                <Eye className="h-5 w-5 mr-2" />
                Ver Torneios
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
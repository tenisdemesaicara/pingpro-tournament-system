import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  CreditCard, Users, Trophy, BarChart3, Plus, Calendar, 
  UserCheck, DollarSign, TrendingUp, TrendingDown, Shield,
  PieChart, Award, Briefcase
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalAthletes: number;
  maleAthletes: number;
  femaleAthletes: number;
  totalUsers: number;
  activeTournaments: number;
  totalTeams: number;
  totalRevenue: number;
  totalExpenses: number;
  monthlyRevenue: number;
}

export default function Dashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-red-600 dark:text-red-400 text-4xl">⚠️</div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                Erro ao carregar estatísticas
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm">
                Não foi possível carregar os dados do dashboard
              </p>
              <Button onClick={() => refetch()} variant="destructive" data-testid="button-retry-stats">
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const balance = stats.totalRevenue - stats.totalExpenses;

  const statsCards = [
    {
      title: "Atletas Cadastrados",
      value: stats.totalAthletes,
      subtitle: `${stats.maleAthletes} homens, ${stats.femaleAthletes} mulheres`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      href: "/athletes"
    },
    {
      title: "Torneios Ativos",
      value: stats.activeTournaments,
      subtitle: "Em andamento ou inscrições abertas",
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
      href: "/tournaments"
    },
    {
      title: "Equipes Registradas",
      value: stats.totalTeams,
      subtitle: "Times competindo",
      icon: Shield,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      href: "/teams"
    },
    {
      title: "Usuários do Sistema",
      value: stats.totalUsers,
      subtitle: "Administradores ativos",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      href: "/system/users"
    },
  ];

  const financialCards = [
    {
      title: "Saldo Total",
      value: `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: balance >= 0 ? "Saldo positivo" : "Saldo negativo",
      icon: balance >= 0 ? TrendingUp : TrendingDown,
      color: balance >= 0 ? "text-green-600" : "text-red-600",
      bgColor: balance >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
      href: "/financeiro"
    },
    {
      title: "Receitas Totais",
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: "Total arrecadado",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      href: "/financeiro"
    },
    {
      title: "Despesas Totais",
      value: `R$ ${stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: "Total de gastos",
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
      href: "/financeiro"
    },
    {
      title: "Mensalidades",
      value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: "Recebido em mensalidades",
      icon: Briefcase,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
      href: "/financeiro"
    },
  ];

  const dashboardActions = [
    {
      title: "Torneios",
      description: "Gerenciar torneios e competições",
      icon: Trophy,
      href: "/tournaments",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Ranking",
      description: "Ranking e estatísticas",
      icon: BarChart3,
      href: "/ranking",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Relatórios",
      description: "Análises e relatórios",
      icon: PieChart,
      href: "/financeiro",
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300" data-testid="text-dashboard-subtitle">
          Visão geral da Associação Mesatenista de Içara
        </p>
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4" data-testid="text-quick-actions">
          🚀 Ações Rápidas
        </h2>
        <div className="flex gap-4 flex-wrap">
          <Link href="/create-tournament">
            <Button className="flex items-center gap-2" data-testid="button-create-tournament">
              <Plus className="h-4 w-4" />
              Criar Torneio
            </Button>
          </Link>
          <Link href="/cadastro-atleta">
            <Button variant="outline" className="flex items-center gap-2" data-testid="button-register-athlete">
              <Users className="h-4 w-4" />
              Cadastrar Atleta
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          📊 Estatísticas Gerais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <Link key={index} href={card.href}>
                <Card 
                  className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
                  data-testid={`card-stat-${index}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`h-6 w-6 ${card.color}`} />
                      </div>
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {card.value}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {card.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cards Financeiros */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          💰 Gestão Financeira
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <Link key={index} href={card.href}>
                <Card 
                  className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
                  data-testid={`card-financial-${index}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`h-6 w-6 ${card.color}`} />
                      </div>
                    </div>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {card.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cards de Acesso Rápido */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🎯 Acesso Rápido
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardActions.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <Link key={index} href={card.href}>
                <Card 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  data-testid={`card-action-${index}`}
                >
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                      <IconComponent className={`h-6 w-6 ${card.color}`} />
                    </div>
                    <CardTitle className="text-lg" data-testid={`text-action-title-${index}`}>
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-300 text-sm" data-testid={`text-action-description-${index}`}>
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

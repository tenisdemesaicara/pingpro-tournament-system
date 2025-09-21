import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CreditCard, Users, Trophy, BarChart3, Plus, Calendar } from "lucide-react";

export default function Dashboard() {
  const dashboardCards = [
    {
      title: "Torneios",
      description: "Gerenciar torneios e competições",
      icon: Trophy,
      href: "/tournaments",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Atletas",
      description: "Cadastro e gestão de atletas",
      icon: Users,
      href: "/athletes",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Associados",
      description: "Cadastro e gestão de associados",
      icon: Users,
      href: "/associates",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
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
      title: "Financeiro",
      description: "Gestão financeira",
      icon: CreditCard,
      href: "/financeiro",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2" data-testid="text-dashboard-subtitle">
          Gestão da Associação Mesatenista de Içara
        </p>
      </div>

      {/* Ações Rápidas */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4" data-testid="text-quick-actions">
          Ações Rápidas
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

      {/* Cards do Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Link key={index} href={card.href}>
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                data-testid={`card-dashboard-${index}`}
              >
                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                    <IconComponent className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <CardTitle className="text-lg" data-testid={`text-card-title-${index}`}>
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-sm" data-testid={`text-card-description-${index}`}>
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
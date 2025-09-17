import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import HeroSection from "@/components/hero-section";
import TournamentCard from "@/components/tournament-card";
import RankingTable from "@/components/ranking-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Tournament, type AthleteWithStats } from "@shared/schema";

export default function Home() {
  const { data: liveTournaments, isLoading: loadingTournaments } = useQuery<Tournament[]>({
    queryKey: ['/api/tournaments'],
    select: (data) => data?.filter(t => t.status === 'in_progress' || t.status === 'registration_open').slice(0, 6) || [],
  });

  const { data: topAthletes, isLoading: loadingRanking } = useQuery<AthleteWithStats[]>({
    queryKey: ['/api/athletes/ranking'],
    select: (data) => data?.slice(0, 3) || [],
  });

  const tournamentFormats = [
    {
      name: "Eliminação Simples",
      description: "Eliminação imediata após perder uma partida. Ideal para torneios rápidos.",
      icon: "schedule",
      badge: "Duração: Rápida",
      badgeColor: "primary",
    },
    {
      name: "Eliminação Dupla",
      description: "Segunda chance para todos. Eliminação após perder duas partidas.",
      icon: "favorite",
      badge: "Mais Popular",
      badgeColor: "secondary",
    },
    {
      name: "Round Robin",
      description: "Todos contra todos. Cada jogador enfrenta todos os demais.",
      icon: "group",
      badge: "Máxima Participação",
      badgeColor: "primary",
    },
    {
      name: "Sistema Suíço",
      description: "Emparelhamentos baseados na força, sem eliminação direta.",
      icon: "trending_up",
      badge: "Equilibrado",
      badgeColor: "primary",
    },
    {
      name: "Liga",
      description: "Competição contínua com ranking baseado em pontuação acumulada.",
      icon: "emoji_events",
      badge: "Longo Prazo",
      badgeColor: "secondary",
    },
    {
      name: "Personalizado",
      description: "Crie regras únicas e formatos especiais para suas necessidades.",
      icon: "settings",
      badge: "Totalmente Flexível",
      badgeColor: "primary",
    },
  ];

  const stats = [
    { value: "150K+", label: "Torneios Criados" },
    { value: "50K+", label: "Atletas Ativos" },
    { value: "1.2M+", label: "Partidas Disputadas" },
  ];

  const features = [
    {
      icon: "person_add",
      title: "Cadastro de Atletas",
      description: "Gerencie perfis completos dos jogadores com estatísticas e histórico",
      color: "primary",
    },
    {
      icon: "sports",
      title: "Chaveamento Automático",
      description: "Geração inteligente de chaves com base no ranking e categorias",
      color: "secondary",
    },
    {
      icon: "trending_up",
      title: "Ranking Dinâmico",
      description: "Sistema de pontuação baseado na performance em torneios",
      color: "primary",
    },
    {
      icon: "notifications",
      title: "Notificações",
      description: "Alertas em tempo real para jogadores e organizadores",
      color: "secondary",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Tournament Stats */}
      <section className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2" data-testid={`stat-value-${index}`}>
                  {stat.value}
                </div>
                <div className="text-muted-foreground" data-testid={`stat-label-${index}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tournament Formats */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Formatos de Torneio</h3>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Escolha entre diversos formatos para criar o torneio perfeito para sua comunidade de tênis de mesa
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {tournamentFormats.map((format, index) => (
              <Card 
                key={index} 
                className="material-elevation-1 hover:material-elevation-2 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`format-card-${index}`}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="mb-4 md:mb-6 h-32 md:h-48 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
                    <span className="material-icons text-4xl md:text-6xl text-primary">
                      {format.icon}
                    </span>
                  </div>
                  <h4 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3" data-testid={`format-name-${index}`}>
                    {format.name}
                  </h4>
                  <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4" data-testid={`format-description-${index}`}>
                    {format.description}
                  </p>
                  <div className={`flex items-center text-${format.badgeColor}`}>
                    <span className="material-icons mr-2">{format.icon}</span>
                    <span className="text-sm" data-testid={`format-badge-${index}`}>
                      {format.badge}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Tournaments */}
      <section className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Torneios em Andamento</h3>
            <p className="text-lg text-muted-foreground">Acompanhe os torneios mais emocionantes acontecendo agora</p>
          </div>

          {loadingTournaments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-20"></div>
                      <div className="h-8 bg-muted rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveTournaments?.map((tournament) => (
                <TournamentCard 
                  key={tournament.id} 
                  tournament={tournament}
                  onViewClick={(id) => window.location.href = `/tournaments/${id}`}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/tournaments">
              <Button 
                className="material-elevation-1"
                data-testid="button-view-all-tournaments"
              >
                Ver Todos os Torneios
              </Button>
            </Link>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Recursos Completos</h3>
            <p className="text-lg text-muted-foreground">Tudo que você precisa para gerenciar torneios profissionais</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center" data-testid={`feature-${index}`}>
                <div className={`w-16 h-16 bg-${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <span className={`material-icons text-${feature.color}-foreground text-2xl`}>
                    {feature.icon}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2" data-testid={`feature-title-${index}`}>
                  {feature.title}
                </h4>
                <p className="text-sm text-muted-foreground" data-testid={`feature-description-${index}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-foreground mb-4">Pronto para Começar?</h3>
          <p className="text-lg text-muted-foreground mb-8">
            Junte-se a milhares de organizadores que confiam na nossa plataforma para 
            gerenciar seus torneios de tênis de mesa.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/create-tournament">
              <Button 
                size="lg" 
                className="text-lg font-medium material-elevation-2"
                data-testid="button-cta-create"
              >
                Criar Torneio Gratuito
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button 
                variant="outline" 
                size="lg"
                data-testid="button-cta-explore"
              >
                Explorar Demo
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            Plano gratuito • Sem cartão de crédito • Configuração em 2 minutos
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <Link href="/create-tournament">
        <button 
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full material-elevation-3 hover:material-elevation-2 transition-all duration-300 z-50"
          data-testid="fab-create-tournament"
        >
          <span className="material-icons">add</span>
        </button>
      </Link>
    </div>
  );
}

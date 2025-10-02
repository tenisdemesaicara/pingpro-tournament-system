import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type TournamentWithParticipants, type Athlete, type Match } from "@shared/schema";
import EditTournamentCover from "@/components/edit-tournament-cover";
import EditTournamentDetails from "@/components/edit-tournament-details";
import DeleteTournament from "@/components/delete-tournament";
import QRCodeGenerator from "@/components/qr-code-generator";
import MatchManagementInterface from "@/components/match-management-interface";
import PublicRegistrationLinks from "@/components/public-registration-links";
import ManageTournamentCategories from "@/components/manage-tournament-categories";
import ScoringSystemExplanation from "@/components/scoring-system-explanation";
import CategoryBracketManagement from "@/components/category-bracket-management";
import DirectEnrollmentInterface from "@/components/direct-enrollment-interface";
import ParticipantsWithFilters from "@/components/participants-with-filters";
import TeamManagement from "@/components/team-management";

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // Verificar se há uma aba específica na URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch tournament data
  const { data: tournament, isLoading: tournamentLoading, isError: tournamentError } = useQuery<TournamentWithParticipants>({
    queryKey: ['/api/tournaments', id],
  });

  // Fetch athletes data  
  const { data: athletes } = useQuery<Athlete[]>({
    queryKey: ['/api/athletes'],
  });

  // Fetch matches data
  const { data: matches } = useQuery<Match[]>({
    queryKey: ['/api/tournaments', id, 'matches'],
  });

  // Mutations for tournament actions
  const startTournamentMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/tournaments/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', id] });
      toast({
        title: "Sucesso!",
        description: "Torneio iniciado com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao iniciar torneio:", error);
      const errorMessage = error?.message || "Não foi possível iniciar o torneio.";
      toast({
        title: "Erro ao Iniciar Torneio",
        description: errorMessage.includes("chaveamento") 
          ? "Algumas categorias ainda não têm chaveamento. Gere os chaveamentos primeiro na aba 'Chaveamento'."
          : errorMessage,
        variant: "destructive",
      });
    }
  });

  const finishTournamentMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/tournaments/${id}/finish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', id] });
      toast({
        title: "Sucesso!",
        description: "Torneio finalizado com sucesso!",
      });
    },
  });

  const generateBracketMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/tournaments/${id}/generate-bracket`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', id, 'matches'] });
      toast({
        title: "Chaveamento Gerado!",
        description: "O chaveamento foi criado com sucesso! As partidas já estão disponíveis.",
      });
    },
    onError: (error) => {
      console.error("Erro ao gerar chaveamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o chaveamento. Verifique se há participantes suficientes.",
        variant: "destructive",
      });
    }
  });

  const pauseTournamentMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/tournaments/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', id] });
      toast({
        title: "Torneio Pausado!",
        description: "O torneio foi pausado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao pausar torneio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível pausar o torneio. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const resumeTournamentMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/tournaments/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', id] });
      toast({
        title: "Torneio Retomado!",
        description: "O torneio foi retomado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao retomar torneio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível retomar o torneio. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleClearAttentionClick = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    try {
      await apiRequest('PATCH', `/api/matches/${matchId}/clear-attention`);
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', id, 'matches'] });
      toast({
        title: "Sucesso!",
        description: "Atenção removida da partida.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover atenção da partida.",
        variant: "destructive",
      });
    }
  };

  if (tournamentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-icons text-4xl text-muted-foreground mb-4 block animate-spin">
            hourglass_empty
          </span>
          <p className="text-muted-foreground">Carregando torneio...</p>
        </div>
      </div>
    );
  }

  if (tournamentError || !tournament) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <span className="material-icons text-6xl text-muted-foreground mb-4 block">
                error_outline
              </span>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Torneio não encontrado
              </h3>
              <p className="text-muted-foreground mb-6">
                O torneio que você está procurando não foi encontrado.
              </p>
              <Link href="/tournaments">
                <Button>Voltar aos Torneios</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "destructive";
      case "registration_open":
        return "default";
      case "completed":
        return "secondary";
      case "ready_to_finish":
        return "default";
      case "paused":
        return "secondary";
      case "draft":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress":
        return "Em Andamento";
      case "registration_open":
        return "Inscrições Abertas";
      case "completed":
        return "Finalizado";
      case "ready_to_finish":
        return "Pronto para Finalizar";
      case "draft":
        return "Rascunho";
      case "paused":
        return "Pausado";
      default:
        return status;
    }
  };

  // Função para buscar nome do jogador pelo ID do participant ou athlete
  const getPlayerName = (rawId: string | number | null): string | null => {
    if (rawId == null) return null;
    const id = String(rawId);
    
    // Procurar diretamente nos athletes (funciona para athleteId)
    const athlete = athletes?.find(a => String(a.id) === id);
    if (athlete) return athlete.name;
    
    // Procurar nos participants
    const participant = tournament?.participants?.find(p => String(p.id) === id);
    if (participant) return participant.name;
    
    return null;
  };

  // Função para buscar informações completas do jogador pelo ID
  const getPlayerFullInfo = (rawId: string | number | null): { name: string; club?: string; city?: string; state?: string } | null => {
    if (rawId == null) return null;
    const id = String(rawId);
    
    // Primeiro, procurar nos participants por ID do participant ou athleteId
    const participant = tournament?.participants?.find(p => 
      String(p.id) === id || String((p as any).athleteId) === id
    );
    if (participant) {
      return {
        name: (participant as any).name ?? (participant as any).athleteName,
        club: participant.club || undefined,
        city: participant.city || undefined,
        state: participant.state || undefined
      };
    }
    
    // Fallback: procurar diretamente nos athletes
    const athlete = athletes?.find(a => String(a.id) === id);
    if (!athlete) return null;
    
    return {
      name: athlete.name,
      club: athlete.club || undefined,
      city: athlete.city || undefined,
      state: athlete.state || undefined
    };
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header - Responsivo */}
        <div className="mb-6 md:mb-8">
          {/* Capa do Torneio */}
          {tournament.coverImage && (
            <Card className="overflow-hidden mb-4">
              <div className="relative h-32 md:h-40 lg:h-48 overflow-hidden">
                <img 
                  src={tournament.coverImage} 
                  alt={`Capa do ${tournament.name}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              </div>
            </Card>
          )}
          
          <div className="flex flex-col gap-4 md:gap-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground break-words" data-testid="tournament-name">
                      {tournament.name}
                    </h1>
                    {/* Badge para torneios por equipe */}
                    {(tournament.format === 'team_round_robin' || tournament.format === 'team_group_knockout') && (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-semibold px-3 py-1 text-sm">
                        🏆 Por Equipes
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground mt-1" data-testid="tournament-organizer">
                    Organizado por {tournament.organizer}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getStatusColor(tournament.status)} data-testid="tournament-status" className="shrink-0">
                    {getStatusText(tournament.status)}
                  </Badge>
                  {(tournament.scoringSystem as any)?.enabled && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 shrink-0">
                      🏆 Pontuação Avançada
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Botões de ação - Responsivos */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex flex-wrap gap-2 min-w-0">
                {/* Botão Iniciar Torneio - aparece quando status é draft ou registration_open */}
                {(tournament.status === 'draft' || tournament.status === 'registration_open') && (
                  <Button
                    onClick={() => startTournamentMutation.mutate()}
                    disabled={startTournamentMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl"
                    data-testid="button-start-tournament"
                  >
                    <span className="material-icons text-base mr-2">play_arrow</span>
                    {startTournamentMutation.isPending ? 'Iniciando...' : 'Iniciar Torneio'}
                  </Button>
                )}
                
                {/* Botão Pausar Torneio - aparece quando status é in_progress */}
                {tournament.status === 'in_progress' && (
                  <Button
                    onClick={() => pauseTournamentMutation.mutate()}
                    disabled={pauseTournamentMutation.isPending}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-lg hover:shadow-xl"
                    data-testid="button-pause-tournament"
                  >
                    <span className="material-icons text-base mr-2">pause</span>
                    {pauseTournamentMutation.isPending ? 'Pausando...' : 'Pausar Torneio'}
                  </Button>
                )}
                
                {/* Botão Retomar Torneio - aparece quando status é paused */}
                {tournament.status === 'paused' && (
                  <Button
                    onClick={() => resumeTournamentMutation.mutate()}
                    disabled={resumeTournamentMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl"
                    data-testid="button-resume-tournament"
                  >
                    <span className="material-icons text-base mr-2">play_arrow</span>
                    {resumeTournamentMutation.isPending ? 'Retomando...' : 'Retomar Torneio'}
                  </Button>
                )}
                
                {/* Botão Finalizar Torneio - aparece quando status é ready_to_finish */}
                {tournament.status === 'ready_to_finish' && (
                  <Button
                    onClick={() => finishTournamentMutation.mutate()}
                    disabled={finishTournamentMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl"
                    data-testid="button-finish-tournament"
                  >
                    <span className="material-icons text-base mr-2">flag</span>
                    {finishTournamentMutation.isPending ? 'Finalizando...' : 'Finalizar Torneio'}
                  </Button>
                )}
                
                <EditTournamentDetails
                  tournamentId={tournament.id}
                  currentDeadline={tournament.registrationDeadline}
                  currentStartDate={tournament.startDate}
                  currentEndDate={tournament.endDate}
                  currentLocation={tournament.location}
                />
                <EditTournamentCover 
                  tournamentId={tournament.id} 
                  currentCover={tournament.coverImage}
                />
                <DeleteTournament 
                  tournamentId={tournament.id} 
                  tournamentName={tournament.name}
                />
                <QRCodeGenerator 
                  originalUrl={`${import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin}/tournament/${id}`}
                  linkType="tournament_public"
                  tournamentId={tournament.id}
                  title={`QR Code - ${tournament.name}`}
                  size={256}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Design melhorado para mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-12 w-max min-w-full items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground mb-6">
              <TabsTrigger 
                value="overview" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[100px] md:min-w-[120px]"
                data-testid="tab-overview"
              >
                <span className="material-icons text-base mr-1 md:mr-2">dashboard</span>
                <span className="text-xs md:text-sm">Visão Geral</span>
              </TabsTrigger>
              <TabsTrigger 
                value="participants" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[100px] md:min-w-[120px]"
                data-testid="tab-participants"
              >
                <span className="material-icons text-base mr-1 md:mr-2">group</span>
                <span className="text-xs md:text-sm">Participantes</span>
              </TabsTrigger>
              
              {/* Aba de Equipes - apenas para torneios por equipe */}
              {tournament && (tournament.format === 'team_round_robin' || tournament.format === 'team_group_knockout') && (
                <TabsTrigger 
                  value="teams" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[100px] md:min-w-[120px]"
                  data-testid="tab-teams"
                >
                  <span className="material-icons text-base mr-1 md:mr-2">groups</span>
                  <span className="text-xs md:text-sm">Equipes</span>
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="registration" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[100px] md:min-w-[120px]"
                data-testid="tab-registration"
              >
                <span className="material-icons text-base mr-1 md:mr-2">link</span>
                <span className="text-xs md:text-sm">Links</span>
              </TabsTrigger>
              <TabsTrigger 
                value="direct-enrollment" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[100px] md:min-w-[120px]"
                data-testid="tab-direct-enrollment"
              >
                <span className="material-icons text-base mr-1 md:mr-2">person_add</span>
                <span className="text-xs md:text-sm">Inscrições</span>
              </TabsTrigger>
              <TabsTrigger 
                value="matches" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[100px] md:min-w-[120px]"
                data-testid="tab-matches"
              >
                <span className="material-icons text-base mr-1 md:mr-2">sports_tennis</span>
                <span className="text-xs md:text-sm">Partidas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="bracket" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[100px] md:min-w-[120px]"
                data-testid="tab-bracket"
              >
                <span className="material-icons text-base mr-1 md:mr-2">account_tree</span>
                <span className="text-xs md:text-sm">Chaveamento</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Torneio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Descrição</h4>
                    <p className="text-muted-foreground text-sm md:text-base">{tournament.description || "Nenhuma descrição disponível"}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Participantes</h4>
                    <p className="text-muted-foreground text-sm md:text-base">
                      {tournament.participants?.length || 0} inscritos
                      {tournament.maxParticipants && ` de ${tournament.maxParticipants} máximo`}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Categorias</h4>
                      <ManageTournamentCategories 
                        tournamentId={tournament.id}
                        currentCategories={tournament.categories || []}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tournament.categories && tournament.categories.length > 0 ? (
                        tournament.categories.map((category) => (
                          <Badge key={category.id} variant="secondary" className="text-xs">
                            {category.name}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">Nenhuma categoria definida</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explicação do Sistema de Pontuação */}
            <ScoringSystemExplanation variant="card" scoringSystem={tournament?.scoringSystem} />
          </TabsContent>

          <TabsContent value="participants" className="mt-6">
            <ParticipantsWithFilters 
              tournament={tournament}
              athletes={athletes || []}
            />
          </TabsContent>

          {/* Aba de Gestão de Equipes - apenas para torneios por equipe */}
          {tournament && (tournament.format === 'team_round_robin' || tournament.format === 'team_group_knockout') && (
            <TabsContent value="teams" className="mt-6">
              {(() => {
                const categories = tournament.categories || [];
                
                // Se não há categorias, mostrar mensagem
                if (categories.length === 0) {
                  return (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">
                          Este torneio ainda não possui categorias configuradas. 
                          Configure as categorias na aba "Detalhes" para poder gerenciar equipes.
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                
                // Se há apenas uma categoria, usar automaticamente
                if (categories.length === 1) {
                  return (
                    <TeamManagement 
                      tournamentId={tournament.id}
                      categoryId={categories[0].id}
                    />
                  );
                }
                
                // Se há múltiplas categorias, mostrar seletor (implementar futuramente)
                return (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        Este torneio possui múltiplas categorias. 
                        O seletor de categoria para gestão de equipes será implementado em breve.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {categories.map((category) => (
                          <Badge key={category.id} variant="secondary">
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </TabsContent>
          )}

          <TabsContent value="registration" className="mt-6">
            <PublicRegistrationLinks 
              tournamentId={tournament.id}
              tournamentName={tournament.name}
            />
          </TabsContent>

          <TabsContent value="direct-enrollment" className="mt-6">
            <DirectEnrollmentInterface 
              tournamentId={tournament.id}
              athletes={athletes || []}
              categories={tournament.categories || []}
              existingParticipants={tournament.participants || []}
              tournament={tournament}
            />
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <MatchManagementInterface 
              tournament={tournament} 
              matches={matches || null} 
              getPlayerName={getPlayerName} 
              getPlayerFullInfo={getPlayerFullInfo} 
              athletes={athletes} 
              handleClearAttentionClick={handleClearAttentionClick}
            />
          </TabsContent>

          <TabsContent value="bracket" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="material-icons text-blue-500">account_tree</span>
                  Chaveamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournament.status === 'draft' ? (
                  <CategoryBracketManagement tournament={tournament} />
                ) : tournament.status === 'registration_open' ? (
                  <CategoryBracketManagement tournament={tournament} />
                ) : tournament.status === 'in_progress' ? (
                  <CategoryBracketManagement tournament={tournament} />
                ) : tournament.status === 'paused' ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <span className="material-icons text-4xl mb-4 block text-orange-500">pause_circle</span>
                    <h3 className="text-lg font-semibold mb-2">Torneio Pausado</h3>
                    <p className="mb-4">O chaveamento está definido mas o torneio foi pausado.</p>
                    <p className="text-sm">Use o botão "Retomar Torneio" para continuar.</p>
                  </div>
                ) : tournament.status === 'completed' ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <span className="material-icons text-4xl mb-4 block text-green-500">emoji_events</span>
                    <h3 className="text-lg font-semibold mb-2">Torneio Finalizado</h3>
                    <p>Veja os resultados finais na aba "Partidas".</p>
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <span className="material-icons text-4xl mb-4 block">info</span>
                    <p>Chaveamento não disponível para o status atual do torneio.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
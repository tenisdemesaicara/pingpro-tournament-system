import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Trophy, Users, Clock, AlertCircle, Filter, Star, Award, Target } from "lucide-react";
import MatchManagementInterface from "@/components/match-management-interface";
import { type Athlete } from "@shared/schema";

export default function PublicTournamentView() {
  const { id } = useParams() as { id: string };
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");

  // Buscar dados do torneio (APENAS LEITURA - endpoint público)
  const { data: tournament, isLoading } = useQuery({
    queryKey: ['/api/public/tournaments', id],
    enabled: !!id
  });

  const tournamentData = tournament as any;

  // Buscar partidas se o torneio estiver iniciado
  const tournamentStarted = tournamentData?.status && 
    ['in_progress', 'paused', 'completed', 'ready_to_finish'].includes(tournamentData.status);
  
  const { data: matches } = useQuery({
    queryKey: ['/api/public/tournaments', id, 'matches'],
    enabled: !!id && tournamentStarted
  });

  const matchesData = matches as any[];

  // Buscar atletas para o pódio
  const { data: athletes } = useQuery<Athlete[]>({
    queryKey: ['/api/athletes'],
    enabled: tournamentStarted
  });

  // Funções helper para nomes de jogadores (igual ao tournament-detail)
  const getPlayerName = (rawId: string | number | null): string | null => {
    if (rawId == null) return null;
    const id = String(rawId);
    
    const athlete = athletes?.find(a => String(a.id) === id);
    if (athlete) return athlete.name;
    
    const participant = tournamentData?.participants?.find((p: any) => String(p.id) === id);
    if (participant) return participant.name;
    
    return null;
  };

  const getPlayerFullInfo = (rawId: string | number | null): { name: string; club?: string; city?: string; state?: string } | null => {
    if (rawId == null) return null;
    const id = String(rawId);
    
    const participant = tournamentData?.participants?.find((p: any) => 
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
    
    const athlete = athletes?.find(a => String(a.id) === id);
    if (athlete) {
      return {
        name: athlete.name,
        club: athlete.club || undefined,
        city: athlete.city || undefined,
        state: athlete.state || undefined
      };
    }
    
    return null;
  };

  const handleClearAttentionClick = async (e: React.MouseEvent, matchId: string) => {
    // Versão pública - não permite ações
    e.stopPropagation();
  };

  // Filtrar participantes
  const filteredParticipants = useMemo(() => {
    if (!tournamentData?.participants) return [];
    
    return tournamentData.participants.filter((participant: any) => {
      const categoryMatch = selectedCategory === "all" || participant.categoryId === selectedCategory;
      
      // Filtro por gênero (baseado no nome da categoria ou dados do atleta)
      let genderMatch = true;
      if (selectedGender !== "all") {
        const category = tournamentData.categories?.find((c: any) => c.id === participant.categoryId);
        const categoryName = category?.name?.toLowerCase() || "";
        
        if (selectedGender === "masculino") {
          genderMatch = categoryName.includes("masculino") || categoryName.includes("masc") || 
                       categoryName.includes("homens") || categoryName.includes("male");
        } else if (selectedGender === "feminino") {
          genderMatch = categoryName.includes("feminino") || categoryName.includes("fem") || 
                       categoryName.includes("mulheres") || categoryName.includes("female");
        }
      }
      
      return categoryMatch && genderMatch;
    });
  }, [tournamentData?.participants, tournamentData?.categories, selectedCategory, selectedGender]);

  // Estatísticas avançadas
  const stats = useMemo(() => {
    if (!tournamentData?.participants) return null;
    
    const total = tournamentData.participants.length;
    const confirmed = tournamentData.participants.filter((p: any) => p.status === 'confirmed').length;
    const clubs = new Set(tournamentData.participants.map((p: any) => p.athlete?.club).filter(Boolean)).size;
    const categories = tournamentData.categories?.length || 0;
    
    // Contagem por gênero - baseado no gênero REAL do atleta
    const masculine = tournamentData.participants.filter((p: any) => {
      const athleteGender = p.athlete?.gender || p.gender;
      return athleteGender === 'masculino';
    }).length;
    
    const feminine = tournamentData.participants.filter((p: any) => {
      const athleteGender = p.athlete?.gender || p.gender;
      return athleteGender === 'feminino';
    }).length;
    
    return { total, confirmed, clubs, categories, masculine, feminine };
  }, [tournamentData?.participants, tournamentData?.categories]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Carregando Torneio</h2>
          <p className="text-white/70">Aguarde enquanto carregamos as informações...</p>
        </div>
      </div>
    );
  }

  if (!tournamentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-red-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto text-center border-0 bg-white/10 backdrop-blur-lg">
          <CardContent className="p-8">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4 text-white">Torneio Não Encontrado</h2>
            <p className="text-white/70 mb-6">
              O torneio que você está tentando acessar não foi encontrado ou não está mais disponível.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                ← Voltar
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.close()}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section Impactante */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='2'/%3E%3Ccircle cx='7' cy='53' r='2'/%3E%3Ccircle cx='53' cy='7' r='2'/%3E%3Ccircle cx='53' cy='53' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Header Content */}
        <div className="relative z-10 px-6 py-12 lg:py-20">
          <div className="max-w-7xl mx-auto">
            {/* Tournament Cover */}
            {tournamentData.coverImage && (
              <div className="mb-8">
                <div className="relative h-64 lg:h-80 rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src={tournamentData.coverImage} 
                    alt={`Capa do ${tournamentData.name}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-purple-500/90 text-white border-0 px-3 py-1">
                        <Trophy className="w-4 h-4 mr-1" />
                        Torneio Oficial
                      </Badge>
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-bold text-white mb-3 leading-tight">
                      {tournamentData.name}
                    </h1>
                    <p className="text-xl text-white/90 flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Organizado por {tournamentData.organizer || 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tournament Title (if no cover) */}
            {!tournamentData.coverImage && (
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <div className="p-6 bg-purple-500/20 rounded-full">
                    <Trophy className="w-16 h-16 text-purple-400" />
                  </div>
                </div>
                <Badge className="bg-purple-500/90 text-white border-0 px-4 py-2 mb-4">
                  <Trophy className="w-4 h-4 mr-1" />
                  Torneio Oficial
                </Badge>
                <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight">
                  {tournamentData.name}
                </h1>
                <p className="text-2xl text-white/80 flex items-center justify-center gap-2">
                  <Star className="w-6 h-6" />
                  Organizado por {tournamentData.organizer || 'Não informado'}
                </p>
              </div>
            )}

            {/* Tournament Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Data do Evento</h3>
                  <p className="text-white/80 text-sm">
                    {tournamentData.startDate && tournamentData.endDate ? (
                      (() => {
                        const start = new Date(tournamentData.startDate);
                        const end = new Date(tournamentData.endDate);
                        const sameDay = start.toDateString() === end.toDateString();
                        const startDate = start.toLocaleDateString('pt-BR');
                        const endDate = end.toLocaleDateString('pt-BR');
                        const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const endTime = end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const hasStartTime = startTime !== '00:00';
                        const hasEndTime = endTime !== '00:00';
                        
                        if (sameDay) {
                          if (hasStartTime && hasEndTime) {
                            return `Previsão: ${startDate} das ${startTime} às ${endTime}`;
                          } else if (hasStartTime) {
                            return `Previsão: ${startDate} às ${startTime}`;
                          } else {
                            return `Previsão: ${startDate}`;
                          }
                        } else {
                          if (hasStartTime && hasEndTime) {
                            return `Previsão: ${startDate} às ${startTime} até ${endDate} às ${endTime}`;
                          } else {
                            return `Previsão: ${startDate} até ${endDate}`;
                          }
                        }
                      })()
                    ) : tournamentData.startDate ? (
                      (() => {
                        const start = new Date(tournamentData.startDate);
                        const startDate = start.toLocaleDateString('pt-BR');
                        const startTime = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const hasTime = startTime !== '00:00';
                        return hasTime ? `Previsão: ${startDate} às ${startTime}` : `Previsão: ${startDate}`;
                      })()
                    ) : (
                      'A definir'
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <MapPin className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Local</h3>
                  <p className="text-white/80">{tournamentData.location || 'A definir'}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Formato</h3>
                  <p className="text-white/80">
                    {tournamentData.format === 'group_stage_knockout' ? 'Grupos + Eliminatória' : 
                     tournamentData.format === 'single_elimination' ? 'Eliminatória Simples' :
                     tournamentData.format === 'double_elimination' ? 'Eliminatória Dupla' :
                     tournamentData.format === 'round_robin' ? 'Todos contra Todos' :
                     tournamentData.format === 'swiss' ? 'Sistema Suíço' : 'Formato Personalizado'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Statistics Dashboard */}
          {stats && (
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-white flex items-center gap-3">
                  <Target className="w-6 h-6 text-purple-400" />
                  Estatísticas do Torneio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-400/20">
                    <div className="text-3xl font-bold text-blue-400 mb-1">{stats.total}</div>
                    <div className="text-sm text-white/70">Total Inscritos</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg border border-green-400/20">
                    <div className="text-3xl font-bold text-green-400 mb-1">{stats.confirmed}</div>
                    <div className="text-sm text-white/70">Confirmados</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg border border-purple-400/20">
                    <div className="text-3xl font-bold text-purple-400 mb-1">{stats.categories}</div>
                    <div className="text-sm text-white/70">Categorias</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg border border-orange-400/20">
                    <div className="text-3xl font-bold text-orange-400 mb-1">{stats.clubs}</div>
                    <div className="text-sm text-white/70">Clubes</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-lg border border-cyan-400/20">
                    <div className="text-3xl font-bold text-cyan-400 mb-1">{stats.masculine}</div>
                    <div className="text-sm text-white/70">Masculino</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-lg border border-pink-400/20">
                    <div className="text-3xl font-bold text-pink-400 mb-1">{stats.feminine}</div>
                    <div className="text-sm text-white/70">Feminino</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tournament Status Message */}
          {!tournamentStarted && (
            <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-lg border-yellow-400/30 overflow-hidden">
              <CardContent className="p-8 text-center">
                <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-3">Torneio Ainda Não Iniciado</h3>
                <p className="text-white/80 text-lg mb-2">
                  {tournamentData.status === 'draft' && 'O torneio está em fase de preparação.'}
                  {tournamentData.status === 'registration_open' && 'As inscrições estão abertas! O torneio será iniciado em breve.'}
                </p>
                <p className="text-white/70 text-sm">
                  Acompanhe esta página para ver os jogos e resultados quando o torneio começar.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Matches Section - Using the same component as internal system */}
          {tournamentStarted && tournamentData && matchesData && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
              <MatchManagementInterface 
                tournament={tournamentData}
                matches={matchesData}
                getPlayerName={getPlayerName}
                getPlayerFullInfo={getPlayerFullInfo}
                athletes={athletes}
                handleClearAttentionClick={handleClearAttentionClick}
              />
            </div>
          )}

          {/* Filters Section */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-3">
                <Filter className="w-5 h-5 text-purple-400" />
                Filtrar Participantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Categoria</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="all" className="text-white hover:bg-gray-800">Todas as Categorias</SelectItem>
                      {tournamentData.categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id} className="text-white hover:bg-gray-800">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Gênero</label>
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Todos os gêneros" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="all" className="text-white hover:bg-gray-800">Todos os Gêneros</SelectItem>
                      <SelectItem value="masculino" className="text-white hover:bg-gray-800">Masculino</SelectItem>
                      <SelectItem value="feminino" className="text-white hover:bg-gray-800">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 text-sm text-white/60">
                Mostrando {filteredParticipants.length} de {tournamentData.participants?.length || 0} participantes
              </div>
            </CardContent>
          </Card>

          {/* Participants Section */}
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-400" />
                Participantes Inscritos
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                  {filteredParticipants.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredParticipants.length > 0 ? (
                <div className="space-y-6">
                  {/* Agrupar por categoria */}
                  {tournamentData.categories?.map((category: any) => {
                    const participantsInCategory = filteredParticipants.filter(
                      (p: any) => p.categoryId === category.id
                    );
                    
                    if (participantsInCategory.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                          <Award className="w-5 h-5 text-purple-400" />
                          <h3 className="text-xl font-semibold text-white">{category.name}</h3>
                          <Badge variant="outline" className="border-purple-400/30 text-purple-300">
                            {participantsInCategory.length} atletas
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {participantsInCategory.map((participant: any, index: number) => (
                            <div 
                              key={participant.id} 
                              className="group relative p-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {participant.athlete?.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  {participant.status === 'confirmed' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-white truncate">
                                    {participant.athlete?.name || 'Nome não disponível'}
                                  </h4>
                                  <p className="text-sm text-white/60 truncate">
                                    {participant.athlete?.club || 'Independente'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {participant.status === 'confirmed' ? (
                                      <Badge className="text-xs bg-green-500/20 text-green-300 border-green-400/30">
                                        Confirmado
                                      </Badge>
                                    ) : (
                                      <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                                        Pendente
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-white/40" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">
                    {selectedCategory !== "all" || selectedGender !== "all" 
                      ? "Nenhum participante encontrado" 
                      : "Aguardando Inscrições"}
                  </h3>
                  <p className="text-white/60 max-w-md mx-auto mb-6">
                    {selectedCategory !== "all" || selectedGender !== "all" 
                      ? "Tente ajustar os filtros para ver mais participantes." 
                      : "As inscrições serão exibidas aqui conforme os atletas se registrarem no torneio."}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-white/40">
                    <Clock className="w-4 h-4" />
                    <span>Atualizações em tempo real</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Description */}
          {tournamentData.description && (
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white">Sobre o Torneio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 leading-relaxed">{tournamentData.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-lg border-purple-400/30">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">PingPong Pro</h3>
              </div>
              <p className="text-white/70 mb-6 max-w-2xl mx-auto">
                Plataforma profissional para gerenciamento de torneios de tênis de mesa. 
                Organização moderna, resultados em tempo real e experiência completa para atletas e espectadores.
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  ← Voltar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.close()}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
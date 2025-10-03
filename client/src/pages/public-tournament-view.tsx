import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Trophy, Users, Clock, AlertCircle, Filter, Star, Award, Target, Info, Medal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PublicMatchView from "@/components/public-match-view";
import { type Athlete } from "@shared/schema";

export default function PublicTournamentView() {
  const { id } = useParams() as { id: string };
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");

  console.log('🎬 PublicTournamentView renderizado! ID do torneio:', id);

  // Buscar dados do torneio (APENAS LEITURA - endpoint público)
  const { data: tournament, isLoading, error } = useQuery({
    queryKey: ['/api/public/tournaments', id],
    enabled: !!id
  });

  console.log('📊 Query state:', { isLoading, hasData: !!tournament, error });

  const tournamentData = tournament as any;

  // Buscar partidas se o torneio estiver iniciado
  const tournamentStarted = tournamentData?.status && 
    ['in_progress', 'paused', 'completed', 'ready_to_finish'].includes(tournamentData.status);
  
  const { data: matches } = useQuery({
    queryKey: ['/api/public/tournaments', id, 'matches'],
    enabled: !!id && tournamentStarted
  });

  const matchesData = matches as any[];

  // Buscar atletas para o pódio (endpoint público)
  const { data: athletes } = useQuery<Athlete[]>({
    queryKey: ['/api/public/athletes'],
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

  // Detectar o tipo de gênero da categoria selecionada
  const selectedCategoryInfo = useMemo(() => {
    if (selectedCategory === "all" || !tournamentData?.categories) {
      return { gender: "all", allowsMasculino: true, allowsFeminino: true };
    }
    
    const category = tournamentData.categories.find((c: any) => c.id === selectedCategory);
    if (!category) {
      return { gender: "all", allowsMasculino: true, allowsFeminino: true };
    }
    
    const categoryGender = category.gender?.toLowerCase();
    
    // Categoria mista: ambos gêneros competem juntos
    if (categoryGender === "mista" || categoryGender === "misto") {
      return { gender: "mista", allowsMasculino: true, allowsFeminino: true };
    }
    
    // Categoria masculina: apenas masculino
    if (categoryGender === "masculino") {
      return { gender: "masculino", allowsMasculino: true, allowsFeminino: false };
    }
    
    // Categoria feminina: apenas feminino
    if (categoryGender === "feminino") {
      return { gender: "feminino", allowsMasculino: false, allowsFeminino: true };
    }
    
    // Fallback: permitir ambos
    return { gender: "all", allowsMasculino: true, allowsFeminino: true };
  }, [selectedCategory, tournamentData?.categories]);

  // Ajustar automaticamente o filtro de gênero quando a categoria muda
  useEffect(() => {
    if (selectedCategoryInfo.gender === "masculino" && selectedGender !== "masculino") {
      setSelectedGender("masculino");
    } else if (selectedCategoryInfo.gender === "feminino" && selectedGender !== "feminino") {
      setSelectedGender("feminino");
    } else if (selectedCategoryInfo.gender === "all" || selectedCategoryInfo.gender === "mista") {
      // Quando volta para "all" ou "mista", resetar para "all"
      if (selectedGender !== "all" && selectedGender !== "masculino" && selectedGender !== "feminino") {
        setSelectedGender("all");
      }
    }
  }, [selectedCategoryInfo, selectedGender]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section Clean */}
      <div className="relative bg-white border-b">
        {/* Subtle Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-gray-50 opacity-50" />

        {/* Header Content */}
        <div className="relative z-10 px-6 py-12 lg:py-20">
          <div className="max-w-7xl mx-auto">
            {/* Tournament Cover */}
            {tournamentData.coverImage && (
              <div className="mb-8">
                <div className="relative h-64 lg:h-80 rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src={tournamentData.coverImage} 
                    alt={`Capa do ${tournamentData.name}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-blue-600 text-white border-0 px-3 py-1">
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
                  <div className="p-6 bg-blue-100 rounded-full">
                    <Trophy className="w-16 h-16 text-blue-600" />
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white border-0 px-4 py-2 mb-4">
                  <Trophy className="w-4 h-4 mr-1" />
                  Torneio Oficial
                </Badge>
                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-4 leading-tight">
                  {tournamentData.name}
                </h1>
                <p className="text-2xl text-gray-600 flex items-center justify-center gap-2">
                  <Star className="w-6 h-6" />
                  Organizado por {tournamentData.organizer || 'Não informado'}
                </p>
              </div>
            )}

            {/* Tournament Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Data do Evento</h3>
                  <p className="text-gray-600 text-sm">
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

              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6 text-center">
                  <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Local</h3>
                  <p className="text-gray-600">{tournamentData.location || 'A definir'}</p>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-sm">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Formato</h3>
                  <p className="text-gray-600">
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

      {/* Main Content - SISTEMA DE ABAS */}
      <div className="px-6 pb-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="informacoes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white border shadow-sm p-1 h-auto" data-testid="tabs-tournament">
              <TabsTrigger 
                value="informacoes" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 text-gray-600 py-3 font-medium"
                data-testid="tab-informacoes"
              >
                <Info className="w-4 h-4 mr-2" />
                Informações
              </TabsTrigger>
              <TabsTrigger 
                value="inscritos" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 text-gray-600 py-3 font-medium"
                data-testid="tab-inscritos"
              >
                <Users className="w-4 h-4 mr-2" />
                Inscritos
              </TabsTrigger>
              <TabsTrigger 
                value="jogos" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 text-gray-600 py-3 font-medium"
                data-testid="tab-jogos"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Jogos
              </TabsTrigger>
            </TabsList>

            {/* ABA: INFORMAÇÕES */}
            <TabsContent value="informacoes" className="mt-6 space-y-6">
              {/* Statistics Dashboard */}
              {stats && (
                <Card className="bg-white border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl text-gray-900 flex items-center gap-3">
                      <Target className="w-6 h-6 text-blue-600" />
                      Estatísticas do Torneio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-3xl font-bold text-blue-600 mb-1">{stats.total}</div>
                        <div className="text-sm text-gray-600">Total Inscritos</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-3xl font-bold text-green-600 mb-1">{stats.confirmed}</div>
                        <div className="text-sm text-gray-600">Confirmados</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-3xl font-bold text-purple-600 mb-1">{stats.categories}</div>
                        <div className="text-sm text-gray-600">Categorias</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="text-3xl font-bold text-orange-600 mb-1">{stats.clubs}</div>
                        <div className="text-sm text-gray-600">Clubes</div>
                      </div>
                      <div className="text-center p-4 bg-cyan-50 rounded-lg border border-cyan-100">
                        <div className="text-3xl font-bold text-cyan-600 mb-1">{stats.masculine}</div>
                        <div className="text-sm text-gray-600">Masculino</div>
                      </div>
                      <div className="text-center p-4 bg-pink-50 rounded-lg border border-pink-100">
                        <div className="text-3xl font-bold text-pink-600 mb-1">{stats.feminine}</div>
                        <div className="text-sm text-gray-600">Feminino</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Categorias do Torneio */}
              {tournamentData.categories && tournamentData.categories.length > 0 && (
                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl text-gray-900 flex items-center gap-3">
                      <Award className="w-6 h-6 text-blue-600" />
                      Categorias do Torneio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tournamentData.categories.map((category: any) => (
                        <div key={category.id} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <h4 className="font-semibold text-gray-900 mb-2">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Descrição do Torneio */}
              {tournamentData.description && (
                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900">Sobre o Torneio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">{tournamentData.description}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ABA: INSCRITOS */}
            <TabsContent value="inscritos" className="mt-6 space-y-6">
              {/* Filters Section */}
              <Card className="bg-white border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900 flex items-center gap-3">
                    <Filter className="w-5 h-5 text-blue-600" />
                    Filtrar Participantes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-700 mb-2 block font-medium">Categoria</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">Todas as Categorias</SelectItem>
                          {tournamentData.categories?.map((category: any) => (
                            <SelectItem key={category.id} value={category.id} className="text-gray-900 hover:bg-gray-100">
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700 mb-2 block font-medium">Gênero</label>
                      <Select 
                        value={selectedGender} 
                        onValueChange={setSelectedGender}
                        disabled={selectedCategoryInfo.gender === "masculino" || selectedCategoryInfo.gender === "feminino"}
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue placeholder="Todos os gêneros" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {(selectedCategoryInfo.gender === "all" || selectedCategoryInfo.gender === "mista") && (
                            <SelectItem value="all" className="text-gray-900 hover:bg-gray-100">Todos os Gêneros</SelectItem>
                          )}
                          {selectedCategoryInfo.allowsMasculino && (
                            <SelectItem value="masculino" className="text-gray-900 hover:bg-gray-100">Masculino</SelectItem>
                          )}
                          {selectedCategoryInfo.allowsFeminino && (
                            <SelectItem value="feminino" className="text-gray-900 hover:bg-gray-100">Feminino</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedCategoryInfo.gender === "masculino" && (
                        <p className="text-xs text-gray-500 mt-1">Categoria exclusiva masculina</p>
                      )}
                      {selectedCategoryInfo.gender === "feminino" && (
                        <p className="text-xs text-gray-500 mt-1">Categoria exclusiva feminina</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    Mostrando {filteredParticipants.length} de {tournamentData.participants?.length || 0} participantes
                  </div>
                </CardContent>
              </Card>

              {/* Participants Section */}
              <Card className="bg-white border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900 flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    Participantes Inscritos
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
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
                        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                          <Award className="w-5 h-5 text-blue-600" />
                          <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
                          <Badge variant="outline" className="border-blue-200 text-blue-700">
                            {participantsInCategory.length} atletas
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {participantsInCategory.map((participant: any, index: number) => (
                            <div 
                              key={participant.id} 
                              className="group relative p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow">
                                    {participant.athlete?.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  {participant.status === 'confirmed' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {participant.athlete?.name || 'Nome não disponível'}
                                  </h4>
                                  <p className="text-sm text-gray-600 truncate">
                                    {participant.athlete?.club || 'Independente'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {participant.status === 'confirmed' ? (
                                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                                        Confirmado
                                      </Badge>
                                    ) : (
                                      <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
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
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    {selectedCategory !== "all" || selectedGender !== "all" 
                      ? "Nenhum participante encontrado" 
                      : "Aguardando Inscrições"}
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    {selectedCategory !== "all" || selectedGender !== "all" 
                      ? "Tente ajustar os filtros para ver mais participantes." 
                      : "As inscrições serão exibidas aqui conforme os atletas se registrarem no torneio."}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Atualizações em tempo real</span>
                  </div>
                </div>
              )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA: JOGOS */}
            <TabsContent value="jogos" className="mt-6 space-y-6">
              {matchesData && matchesData.length > 0 ? (
                <>
                  {/* Classificação acima dos jogos - mostra quando há ao menos 1 jogo completo */}
                  {matchesData.some((m: any) => m.status === 'completed') && (
                    <Card className="bg-white border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-2xl text-gray-900 flex items-center gap-3">
                          <Medal className="w-6 h-6 text-amber-500" />
                          {matchesData.every((m: any) => m.status === 'completed') 
                            ? 'Classificação Final' 
                            : 'Classificação Parcial'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 text-center">
                        <Medal className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {matchesData.every((m: any) => m.status === 'completed') 
                            ? 'Pódio e Classificação Final' 
                            : 'Classificação em Andamento'}
                        </h3>
                        <p className="text-gray-600">
                          {matchesData.every((m: any) => m.status === 'completed')
                            ? 'A classificação final será exibida aqui após todas as partidas serem concluídas.'
                            : 'A classificação parcial será atualizada conforme as partidas forem sendo concluídas.'}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Partidas */}
                  <Card className="bg-white border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-2xl text-gray-900 flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-blue-600" />
                        Partidas e Resultados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <PublicMatchView 
                        tournament={tournamentData}
                        matches={matchesData}
                        athletes={athletes}
                        getPlayerName={getPlayerName}
                        getPlayerFullInfo={getPlayerFullInfo}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : tournamentStarted ? (
                <Card className="bg-amber-50 border border-amber-200 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Partidas em Preparação</h3>
                    <p className="text-gray-600">
                      As partidas serão exibidas em breve. Aguarde enquanto organizamos as chaves!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-blue-50 border border-blue-200 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Torneio Ainda Não Iniciado</h3>
                    <p className="text-gray-600 text-lg mb-2">
                      {tournamentData.status === 'draft' && 'O torneio está em fase de preparação.'}
                      {tournamentData.status === 'registration_open' && 'As inscrições estão abertas! O torneio será iniciado em breve.'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Acompanhe esta página para ver os jogos e resultados quando o torneio começar.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
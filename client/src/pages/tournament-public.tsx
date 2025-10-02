import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Trophy, Users, Clock, AlertCircle, Filter, Star, Award, Target } from "lucide-react";

export default function TournamentPublic() {
  const { id } = useParams() as { id: string };
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");

  // Buscar dados do torneio (APENAS LEITURA - endpoint público)
  const { data: tournament, isLoading } = useQuery({
    queryKey: ['/api/public/tournaments', id],
    enabled: !!id
  });

  // Buscar partidas do torneio para cálculo do pódium
  const { data: matches } = useQuery({
    queryKey: ['/api/public/tournaments', id, 'matches'],
    enabled: !!id
  });

  const tournamentData = tournament as any;
  const matchesData = matches as any[];

  // Verificar se deve esconder o filtro de gênero
  const shouldHideGenderFilter = useMemo(() => {
    if (selectedCategory === 'all' || !tournamentData?.categories) return false;
    
    const category = tournamentData.categories.find((c: any) => c.id === selectedCategory);
    if (!category) return false;
    
    const categoryName = category.name.toLowerCase();
    
    // Esconder se categoria é mista
    if (categoryName.includes('misto') || categoryName.includes('mista') || categoryName.includes('mixed') || categoryName.includes('mixto')) {
      return true;
    }
    
    // Esconder se categoria já tem gênero específico
    if (categoryName.includes('masculino') || categoryName.includes('masc') || categoryName.includes('feminino') || categoryName.includes('fem')) {
      return true;
    }
    
    return false;
  }, [selectedCategory, tournamentData?.categories]);

  // 🏆 LÓGICA DO PÓDIUM - Calcular posições quando categoria está completa
  const calculatePodiumPositions = () => {
    if (!selectedCategory || selectedCategory === 'all' || !matchesData || !tournamentData?.participants) return [];
    
    const category = tournamentData.categories?.find((c: any) => c.id === selectedCategory);
    if (!category) return [];
    
    // Filtrar partidas da categoria selecionada
    const categoryMatches = matchesData.filter((match: any) => match.categoryId === category.id);
    
    // Verificar se é um torneio de eliminação (tem fases como semifinal e final)
    const finalMatches = categoryMatches.filter((match: any) => match.phase === 'final');
    const semifinalMatches = categoryMatches.filter((match: any) => match.phase === 'semifinal');
    
    if (finalMatches.length === 0) return [];
    
    const finalMatch = finalMatches[0];
    if (finalMatch.status !== 'completed' || !finalMatch.winnerId) return [];
    
    const positions = [];
    
    // 1º lugar: vencedor da final
    const winner = tournamentData.participants.find((p: any) => (p.athlete?.id || p.id) === finalMatch.winnerId);
    if (winner) {
      const winnerData = winner.athlete || winner;
      positions.push({
        playerId: winnerData.id,
        playerName: winnerData.name,
        photoUrl: winnerData.photoUrl,
        position: 1
      });
    }
    
    // 2º lugar: perdedor da final
    const runnerUpId = finalMatch.player1Id === finalMatch.winnerId ? finalMatch.player2Id : finalMatch.player1Id;
    const runnerUp = tournamentData.participants.find((p: any) => (p.athlete?.id || p.id) === runnerUpId);
    if (runnerUp) {
      const runnerUpData = runnerUp.athlete || runnerUp;
      positions.push({
        playerId: runnerUpData.id,
        playerName: runnerUpData.name,
        photoUrl: runnerUpData.photoUrl,
        position: 2
      });
    }
    
    // 3º lugar: perdedores das semifinais (AMBOS recebem 3º lugar - regra do tênis de mesa)
    semifinalMatches.forEach((semifinalMatch: any) => {
      if (semifinalMatch.status === 'completed' && semifinalMatch.winnerId) {
        const loserId = semifinalMatch.player1Id === semifinalMatch.winnerId 
          ? semifinalMatch.player2Id 
          : semifinalMatch.player1Id;
        
        const loser = tournamentData.participants.find((p: any) => (p.athlete?.id || p.id) === loserId);
        if (loser) {
          const loserData = loser.athlete || loser;
          positions.push({
            playerId: loserData.id,
            playerName: loserData.name,
            photoUrl: loserData.photoUrl,
            position: 3
          });
        }
      }
    });
    
    return positions;
  };

  const podiumPositions = calculatePodiumPositions();

  // DEBUG: Log dos dados carregados
  console.log("🏆 DEBUG PÁGINA PÚBLICA - VERSÃO NOVA:");
  console.log("  - Tournament data:", tournamentData);
  console.log("  - Matches data:", matchesData);
  console.log("  - Selected category:", selectedCategory);
  console.log("  - Should hide gender filter:", shouldHideGenderFilter);
  console.log("  - Podium positions:", podiumPositions);
  
  // FORÇAR ATUALIZAÇÃO: Verificar categoria
  if (selectedCategory !== 'all' && tournamentData?.categories) {
    const categoryData = tournamentData.categories.find((c: any) => c.id === selectedCategory);
    if (categoryData) {
      console.log("🔍 CATEGORIA SELECIONADA:", categoryData.name);
      console.log("🔍 DEVE ESCONDER FILTRO:", shouldHideGenderFilter);
    }
  }

  // Filtrar participantes
  const filteredParticipants = useMemo(() => {
    if (!tournamentData?.participants) return [];
    
    return tournamentData.participants.filter((participant: any) => {
      // Verificar estrutura - pode ser que venha como {athlete: {...}} ou direto
      const athleteData = participant.athlete || participant;
      const participantCategoryId = participant.categoryId;
      
      const categoryMatch = selectedCategory === "all" || participantCategoryId === selectedCategory;
      
      // Filtro por gênero (baseado no nome da categoria)
      let genderMatch = true;
      if (selectedGender !== "all") {
        const category = tournamentData.categories?.find((c: any) => c.id === participantCategoryId);
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
    const confirmed = tournamentData.participants.filter((p: any) => (p.athlete?.status || p.status) === 'approved').length;
    const clubs = new Set(tournamentData.participants.map((p: any) => p.athlete?.club).filter(Boolean)).size;
    const categories = tournamentData.categories?.length || 0;
    
    // Contagem por gênero
    const masculine = tournamentData.participants.filter((p: any) => {
      const category = tournamentData.categories?.find((c: any) => c.id === p.categoryId);
      const categoryName = category?.name?.toLowerCase() || "";
      return categoryName.includes("masculino") || categoryName.includes("masc") || 
             categoryName.includes("homens") || categoryName.includes("male");
    }).length;
    
    const feminine = tournamentData.participants.filter((p: any) => {
      const category = tournamentData.categories?.find((c: any) => c.id === p.categoryId);
      const categoryName = category?.name?.toLowerCase() || "";
      return categoryName.includes("feminino") || categoryName.includes("fem") || 
             categoryName.includes("mulheres") || categoryName.includes("female");
    }).length;
    
    return { total, confirmed, clubs, categories, masculine, feminine };
  }, [tournamentData?.participants, tournamentData?.categories]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-800 dark:text-white">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-300/50 dark:border-white/30 border-t-slate-600 dark:border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 dark:border-t-purple-400 rounded-full animate-ping mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Carregando Torneio</h2>
          <p className="text-slate-600 dark:text-white/70">Aguarde enquanto carregamos as informações...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
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
                    <Trophy className="w-16 h-16 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white border-0 px-4 py-2 mb-4">
                  <Trophy className="w-4 h-4 mr-1" />
                  Torneio Oficial
                </Badge>
                <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                  {tournamentData.name}
                </h1>
                <p className="text-2xl text-slate-800 dark:text-white flex items-center justify-center gap-2">
                  <Star className="w-6 h-6" />
                  Organizado por {tournamentData.organizer || 'Não informado'}
                </p>
              </div>
            )}

            {/* Tournament Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white/95 dark:bg-white/20 backdrop-blur-lg border-purple-200 dark:border-white/30 shadow-xl">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-purple-600 dark:text-white mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Data do Evento</h3>
                  <p className="text-slate-700 dark:text-white text-base font-medium">
                    {tournamentData.startDate ? new Date(tournamentData.startDate).toLocaleDateString('pt-BR') : 'A definir'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 dark:bg-white/20 backdrop-blur-lg border-purple-200 dark:border-white/30 shadow-xl">
                <CardContent className="p-6 text-center">
                  <MapPin className="w-8 h-8 text-purple-600 dark:text-white mx-auto mb-3" />
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Local</h3>
                  <p className="text-slate-700 dark:text-white text-base font-medium">{tournamentData.location || 'A definir'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Registration CTA */}
            {tournamentData.status === 'registration_open' && (
              <div className="text-center mb-8">
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/20 dark:to-emerald-500/20 backdrop-blur-lg border-green-300 dark:border-green-400/30 shadow-xl">
                  <CardContent className="p-8">
                    <Trophy className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4 animate-pulse" />
                    <h2 className="text-3xl font-bold text-green-800 dark:text-white mb-3">Inscrições Abertas!</h2>
                    <p className="text-slate-800 dark:text-white text-base mb-6 max-w-md mx-auto font-medium">
                      Faça sua inscrição agora e participe deste torneio incrível. 
                      Cadastre-se rapidamente e garante sua vaga!
                    </p>
                    <Button 
                      onClick={() => window.location.href = `/tournament/${id}/register`}
                      size="lg"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      data-testid="button-register"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      Inscrever-se Agora
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Statistics Dashboard */}
          {stats && (
            <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-900/30 dark:to-blue-900/30">
                <CardTitle className="text-2xl text-slate-800 dark:text-white flex items-center gap-3 font-bold">
                  <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  Estatísticas do Torneio
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-slate-50 dark:bg-slate-900/50">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-md">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-300 mb-1">{stats.total}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Total Inscritos</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 rounded-lg border-2 border-green-200 dark:border-green-700 shadow-md">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-300 mb-1">{stats.confirmed}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Confirmados</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40 rounded-lg border-2 border-purple-200 dark:border-purple-700 shadow-md">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-300 mb-1">{stats.categories}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Categorias</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 rounded-lg border-2 border-orange-200 dark:border-orange-700 shadow-md">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-300 mb-1">{stats.clubs}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Clubes</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/40 dark:to-cyan-800/40 rounded-lg border-2 border-cyan-200 dark:border-cyan-700 shadow-md">
                    <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-300 mb-1">{stats.masculine}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Masculino</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/40 dark:to-pink-800/40 rounded-lg border-2 border-pink-200 dark:border-pink-700 shadow-md">
                    <div className="text-3xl font-bold text-pink-600 dark:text-pink-300 mb-1">{stats.feminine}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 font-semibold">Feminino</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Filters Section */}
          <Card className="bg-white dark:bg-slate-800 backdrop-blur-lg border-slate-300 dark:border-slate-600 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900 dark:text-white flex items-center gap-3">
                <Filter className="w-5 h-5 text-blue-600 dark:text-purple-400" />
                Filtrar Participantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-700 dark:text-slate-300 mb-2 block font-medium">Categoria</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                      <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Todas as Categorias</SelectItem>
                      {tournamentData.categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!shouldHideGenderFilter && (
                  <div>
                    <label className="text-sm text-slate-700 dark:text-slate-300 mb-2 block font-medium">Gênero</label>
                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 text-slate-900 dark:text-white">
                        <SelectValue placeholder="Todos os gêneros" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                        <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Todos os Gêneros</SelectItem>
                        <SelectItem value="masculino" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Masculino</SelectItem>
                        <SelectItem value="feminino" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="mt-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
                Mostrando {filteredParticipants.length} de {tournamentData.participants?.length || 0} participantes
              </div>
            </CardContent>
          </Card>

          {/* Informações sobre o formato da categoria */}
          {selectedCategory !== 'all' && (() => {
            const selectedCategoryData = tournamentData?.categories?.find((c: any) => c.id === selectedCategory);
            if (!selectedCategoryData) return null;
            
            // Usar formato da categoria ou fallback para o torneio
            const categoryFormat = selectedCategoryData.format || tournamentData?.format;
            
            // Contar participantes da categoria
            const categoryParticipants = filteredParticipants.length;
            
            // Informações da categoria
            const categoryName = selectedCategoryData.name;
            const categoryGender = selectedCategoryData.gender;
            const minAge = selectedCategoryData.minAge;
            const maxAge = selectedCategoryData.maxAge;
            
            // Construir descrição da faixa etária
            let ageDescription = '';
            if (minAge && maxAge) {
              ageDescription = `${minAge} a ${maxAge} anos`;
            } else if (minAge) {
              ageDescription = `${minAge}+ anos`;
            } else if (maxAge) {
              ageDescription = `até ${maxAge} anos`;
            }
            
            return (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-900 dark:text-white flex items-center gap-3">
                    <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Informações da Categoria: {categoryName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações da Categoria */}
                  <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Detalhes da Categoria
                    </h3>
                    <div className="space-y-2 text-slate-700 dark:text-slate-300 text-sm">
                      <p><strong className="text-slate-900 dark:text-white">Participantes:</strong> {categoryParticipants} atletas inscritos</p>
                      {categoryGender && <p><strong className="text-slate-900 dark:text-white">Gênero:</strong> {categoryGender === 'masculino' ? 'Masculino' : categoryGender === 'feminino' ? 'Feminino' : 'Misto'}</p>}
                      {ageDescription && <p><strong className="text-slate-900 dark:text-white">Faixa Etária:</strong> {ageDescription}</p>}
                    </div>
                  </div>

                  {/* Formato de Disputa */}
                  {categoryFormat && (
                    <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        {categoryFormat === 'single_elimination' && 'Sistema de Eliminação Simples'}
                        {categoryFormat === 'double_elimination' && 'Sistema de Eliminação Dupla'}
                        {categoryFormat === 'round_robin' && 'Sistema de Todos Contra Todos (Round Robin)'}
                        {categoryFormat === 'swiss' && 'Sistema Suíço'}
                      </h3>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-3">
                        {categoryFormat === 'single_elimination' && 
                          'Cada atleta compete em um chaveamento direto. Uma derrota significa a eliminação do torneio. O campeão é definido pela vitória na partida final, sem direito a revanche. É o formato mais ágil e dramático, onde cada partida é decisiva.'}
                        {categoryFormat === 'double_elimination' && 
                          'Cada atleta tem direito a uma segunda chance. Após a primeira derrota, o atleta vai para a "chave da repescagem". O campeão é definido quando um atleta vence ambas as chaves ou quando o vencedor da chave principal derrota o da repescagem na final. Esse formato garante mais oportunidades e partidas emocionantes.'}
                        {categoryFormat === 'round_robin' && 
                          'Todos os atletas enfrentam todos os outros atletas da categoria. O campeão é definido pelo maior número de vitórias, com critérios de desempate aplicados se necessário (saldo de sets, saldo de pontos, confronto direto). Este formato garante justiça máxima, pois todos têm as mesmas oportunidades.'}
                        {categoryFormat === 'swiss' && 
                          'Os atletas são pareados a cada rodada com base em seu desempenho anterior. Atletas com desempenhos similares enfrentam-se. O campeão é definido pelo maior número de vitórias após todas as rodadas, sem eliminação direta. Ideal para torneios com muitos participantes.'}
                      </p>
                    </div>
                  )}

                  {/* Decisão do Campeão */}
                  <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Como o Campeão é Definido
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                      {(categoryFormat === 'single_elimination' || categoryFormat === 'double_elimination') && 
                        `O campeão é definido na partida final entre os 2 melhores atletas. No tênis de mesa, as partidas geralmente são disputadas em melhor de 5 ou 7 sets (jogos). Cada set vai até 11 pontos, com vantagem de 2 pontos necessária para vencer (exemplo: 11-9, 12-10). Os semifinalistas derrotados recebem medalha de bronze (3º lugar), seguindo a tradição olímpica. ${categoryParticipants > 0 ? `Nesta categoria, ${categoryParticipants} atletas estão competindo pelo título.` : ''}`}
                      {categoryFormat === 'round_robin' && 
                        `O campeão é o atleta com mais vitórias ao final de todas as partidas. ${categoryParticipants > 2 ? `Com ${categoryParticipants} participantes, serão disputadas ${(categoryParticipants * (categoryParticipants - 1)) / 2} partidas no total.` : ''} Em caso de empate, os critérios de desempate são aplicados na seguinte ordem: (1) confronto direto entre os empatados, (2) saldo de sets (diferença entre sets ganhos e perdidos), e (3) saldo de pontos (diferença entre pontos marcados e sofridos).`}
                      {categoryFormat === 'swiss' && 
                        `Após todas as rodadas, o atleta com maior pontuação é declarado campeão. ${categoryParticipants > 0 ? `Com ${categoryParticipants} participantes, serão realizadas múltiplas rodadas onde todos disputam o mesmo número de partidas.` : ''} Este sistema garante que todos disputem o mesmo número de partidas e que atletas de níveis similares se enfrentem, proporcionando competições equilibradas e emocionantes do início ao fim.`}
                      {!categoryFormat && 'O formato de disputa será definido pelo organizador do torneio. Aguarde mais informações sobre como o campeão será decidido nesta categoria.'}
                    </p>
                  </div>

                  {/* Sobre o Tênis de Mesa */}
                  <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Sobre o Tênis de Mesa
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                      O tênis de mesa é um esporte olímpico que exige reflexos rápidos, concentração máxima e estratégia refinada. Cada ponto é uma batalha de milissegundos, onde velocidade, efeito na bola e posicionamento fazem toda a diferença. Com origem no século XIX, o esporte evoluiu para se tornar uma das modalidades mais praticadas no mundo, especialmente popular na Ásia, Europa e América Latina. No Brasil, o tênis de mesa tem tradição forte e produz atletas de alto nível internacional. A raquete, a mesa e a bolinha criam um jogo de xadrez em alta velocidade, onde cada golpe pode mudar o rumo da partida.
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* 🏆 PÓDIUM DA CATEGORIA - APARECE APÓS SELECIONAR CATEGORIA */}
          {podiumPositions.length > 0 && (
            <Card className="bg-gradient-to-r from-amber-50/95 to-yellow-50/95 dark:from-amber-900/50 dark:to-yellow-900/50 border-amber-300 dark:border-amber-600 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-2xl font-bold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-3">
                  <Trophy className="w-7 h-7 text-amber-600" />
                  🏆 Pódium da Categoria: {tournamentData.categories?.find((c: any) => c.id === selectedCategory)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-end justify-center gap-6 sm:gap-12">
                  {/* 2º Lugar */}
                  {podiumPositions.find((p: any) => p.position === 2) && (
                    <div className="flex flex-col items-center">
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-3 border-gray-500 mb-3">
                        {podiumPositions.find((p: any) => p.position === 2)?.photoUrl ? (
                          <AvatarImage src={podiumPositions.find((p: any) => p.position === 2)?.photoUrl || undefined} />
                        ) : null}
                        <AvatarFallback className="bg-gray-500 text-white font-bold text-xl">
                          {podiumPositions.find((p: any) => p.position === 2)?.playerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center bg-gray-100 dark:bg-gray-700 px-4 py-6 rounded-t-lg min-h-[80px] flex flex-col justify-end">
                        <div className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">2º</div>
                        <div className="text-base font-semibold text-gray-800 dark:text-gray-200">{podiumPositions.find((p: any) => p.position === 2)?.playerName}</div>
                      </div>
                    </div>
                  )}

                  {/* 1º Lugar */}
                  {podiumPositions.find((p: any) => p.position === 1) && (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-yellow-400 mb-3">
                          {podiumPositions.find((p: any) => p.position === 1)?.photoUrl ? (
                            <AvatarImage src={podiumPositions.find((p: any) => p.position === 1)?.photoUrl || undefined} />
                          ) : null}
                          <AvatarFallback className="bg-yellow-500 text-white font-bold text-2xl">
                            {podiumPositions.find((p: any) => p.position === 1)?.playerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-3 -right-2 text-4xl">👑</div>
                      </div>
                      <div className="text-center bg-yellow-200 dark:bg-yellow-700 px-6 py-8 rounded-t-lg min-h-[100px] flex flex-col justify-end">
                        <div className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-1">1º</div>
                        <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">{podiumPositions.find((p: any) => p.position === 1)?.playerName}</div>
                      </div>
                    </div>
                  )}

                  {/* 3º Lugar (só o primeiro, mais destacado) */}
                  {podiumPositions.find((p: any) => p.position === 3) && (
                    <div className="flex flex-col items-center">
                      <Avatar className="w-14 h-14 sm:w-18 sm:h-18 border-3 border-amber-500 mb-3">
                        {podiumPositions.find((p: any) => p.position === 3)?.photoUrl ? (
                          <AvatarImage src={podiumPositions.find((p: any) => p.position === 3)?.photoUrl} />
                        ) : null}
                        <AvatarFallback className="bg-amber-500 text-white font-bold text-lg">
                          {podiumPositions.find((p: any) => p.position === 3)?.playerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center bg-amber-100 dark:bg-amber-700 px-4 py-5 rounded-t-lg min-h-[60px] flex flex-col justify-end">
                        <div className="text-base font-bold text-amber-700 dark:text-amber-300 mb-1">3º</div>
                        <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">{podiumPositions.find((p: any) => p.position === 3)?.playerName}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Segundo 3º lugar se existir */}
                {podiumPositions.filter((p: any) => p.position === 3).length > 1 && (
                  <div className="mt-6 pt-4 border-t border-amber-300 dark:border-amber-600">
                    <div className="flex justify-center">
                      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 px-6 py-3 rounded-lg">
                        <Avatar className="w-12 h-12 border-2 border-amber-500">
                          {podiumPositions.filter((p: any) => p.position === 3)[1]?.photoUrl ? (
                            <AvatarImage src={podiumPositions.filter((p: any) => p.position === 3)[1]?.photoUrl} />
                          ) : null}
                          <AvatarFallback className="bg-amber-500 text-white font-bold">
                            {podiumPositions.filter((p: any) => p.position === 3)[1]?.playerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-bold text-amber-700 dark:text-amber-300">3º lugar</div>
                          <div className="text-base font-semibold text-amber-800 dark:text-amber-200">{podiumPositions.filter((p: any) => p.position === 3)[1]?.playerName}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Participants Section */}
          <Card className="bg-white dark:bg-slate-800 backdrop-blur-lg border-slate-300 dark:border-slate-600 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900 dark:text-white flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600 dark:text-purple-400" />
                Participantes Inscritos
                <Badge variant="secondary" className="bg-blue-100 dark:bg-purple-500/20 text-blue-800 dark:text-purple-300 border-blue-300 dark:border-purple-400/30">
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
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-300 dark:border-slate-600">
                          <Award className="w-5 h-5 text-blue-600 dark:text-purple-400" />
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{category.name}</h3>
                          <Badge variant="outline" className="border-blue-300 dark:border-purple-400/30 text-blue-800 dark:text-purple-300 bg-blue-50 dark:bg-transparent">
                            {participantsInCategory.length} atletas
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {participantsInCategory.map((participant: any, index: number) => (
                            <div 
                              key={participant.id} 
                              className="group relative p-4 bg-slate-50 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-purple-400/50 hover:shadow-lg transition-all duration-300"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {(participant.athlete?.photoUrl || participant.photoUrl) ? (
                                    <img 
                                      src={participant.athlete?.photoUrl || participant.photoUrl} 
                                      alt={participant.athlete?.name || participant.name}
                                      className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-slate-300 dark:border-slate-500"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-purple-500 dark:to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                      {(participant.athlete?.name || participant.name)?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                  )}
                                  {(participant.athlete?.status || participant.status) === 'approved' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-700 rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                                    {participant.athlete?.name || participant.name || 'Nome não disponível'}
                                  </h4>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                                    {participant.athlete?.club || participant.club || 'Independente'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {(participant.athlete?.status || participant.status) === 'approved' ? (
                                      <Badge className="text-xs bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300 border-green-300 dark:border-green-400/30">
                                        Confirmado
                                      </Badge>
                                    ) : (
                                      <Badge className="text-xs bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-400/30">
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
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                    {selectedCategory !== "all" || selectedGender !== "all" 
                      ? "Nenhum participante encontrado" 
                      : "Aguardando Inscrições"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6">
                    {selectedCategory !== "all" || selectedGender !== "all" 
                      ? "Tente ajustar os filtros para ver mais participantes." 
                      : "As inscrições serão exibidas aqui conforme os atletas se registrarem no torneio."}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>Atualizações em tempo real</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Matches Section - Show when in progress */}
          {tournamentData.status === 'in_progress' && (
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center gap-3">
                  <div className="relative">
                    <Trophy className="w-6 h-6 text-red-400" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                  Torneio em Andamento
                  <Badge className="bg-red-500/20 text-red-300 border-red-400/30 animate-pulse">
                    AO VIVO
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Live Updates Message */}
                  <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <h3 className="text-xl font-semibold text-white">Acompanhe em Tempo Real</h3>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-white/80 mb-4">
                      O torneio está em andamento! Os resultados e chaveamento são atualizados automaticamente.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                      <Clock className="w-4 h-4" />
                      <span>Última atualização: agora</span>
                    </div>
                  </div>

                  {/* Current Round Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/30">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">1ª</div>
                        <div className="text-sm text-white/70">Rodada Atual</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/30">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">8</div>
                        <div className="text-sm text-white/70">Partidas em Curso</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/30">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400 mb-1">24</div>
                        <div className="text-sm text-white/70">Partidas Restantes</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Results */}
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-400" />
                      Resultados Recentes
                    </h4>
                    <div className="space-y-3">
                      {/* Mock recent matches - in real app this would come from API */}
                      {[
                        { player1: "João Silva", player2: "Maria Santos", score: "3-1", category: "Masculino A" },
                        { player1: "Pedro Costa", player2: "Ana Oliveira", score: "3-2", category: "Feminino B" },
                        { player1: "Carlos Lima", player2: "José Souza", score: "3-0", category: "Masculino A" }
                      ].map((match, index) => (
                        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="font-semibold text-white">{match.player1}</div>
                                <div className="text-sm text-green-400">Vencedor</div>
                              </div>
                              <div className="text-2xl font-bold text-white">vs</div>
                              <div className="text-center">
                                <div className="font-semibold text-white/70">{match.player2}</div>
                                <div className="text-sm text-white/50">Finalista</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-green-400">{match.score}</div>
                              <div className="text-sm text-white/60">{match.category}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Matches */}
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Próximas Partidas
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(() => {
                        // Filtrar apenas partidas reais que ainda não começaram
                        const upcomingMatches = matchesData?.filter((match: any) => 
                          match.status === 'pending' && 
                          match.scheduledTime &&
                          new Date(match.scheduledTime) > new Date()
                        ) || [];
                        
                        if (upcomingMatches.length === 0) {
                          return (
                            <div className="col-span-full text-center py-8">
                              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-white/70 text-lg">Nenhuma partida agendada no momento.</p>
                              <p className="text-white/50 text-sm mt-2">As próximas partidas aparecerão aqui quando forem programadas.</p>
                            </div>
                          );
                        }
                        
                        return upcomingMatches.slice(0, 4).map((match: any, index: number) => {
                          const player1 = tournamentData.participants?.find((p: any) => (p.athlete?.id || p.id) === match.player1Id);
                          const player2 = tournamentData.participants?.find((p: any) => (p.athlete?.id || p.id) === match.player2Id);
                          const player1Name = player1?.athlete?.name || player1?.name || 'Jogador 1';
                          const player2Name = player2?.athlete?.name || player2?.name || 'Jogador 2';
                          
                          return (
                            <div key={match.id} className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
                                  {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Badge>
                                <Badge variant="outline" className="border-purple-400/30 text-purple-300 text-xs">
                                  {match.tableNumber ? `Mesa ${match.tableNumber}` : 'Mesa TBD'}
                                </Badge>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-white text-sm">{player1Name}</div>
                                <div className="text-white/50 text-xs my-1">vs</div>
                                <div className="font-semibold text-white text-sm">{player2Name}</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tournament Description */}
          {tournamentData.description && (
            <Card className="bg-white dark:bg-slate-800 backdrop-blur-lg border-slate-300 dark:border-slate-600">
              <CardHeader>
                <CardTitle className="text-xl text-slate-900 dark:text-white">Sobre o Torneio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{tournamentData.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <Card className="bg-white dark:bg-slate-800 backdrop-blur-lg border-slate-300 dark:border-slate-600">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 dark:bg-purple-500 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">PingPong Pro</h3>
              </div>
              <p className="text-slate-700 dark:text-slate-300 mb-6 max-w-2xl mx-auto">
                Plataforma profissional para gerenciamento de torneios de tênis de mesa. 
                Organização moderna, resultados em tempo real e experiência completa para atletas e espectadores.
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  ← Voltar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.close()}
                  className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600"
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
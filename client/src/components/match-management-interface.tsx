import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { type TournamentWithParticipants, type Athlete, type Match } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import BracketView from "./bracket-view";

interface MatchManagementInterfaceProps {
  tournament: TournamentWithParticipants;
  matches: Match[] | null;
  getPlayerName: (id: string | number | null) => string | null;
  getPlayerFullInfo: (id: string | number | null) => { name: string; club?: string; city?: string; state?: string } | null;
  athletes: Athlete[] | undefined;
  handleClearAttentionClick: (e: React.MouseEvent, matchId: string) => Promise<void>;
}

export default function MatchManagementInterface({ 
  tournament, 
  matches, 
  getPlayerName, 
  getPlayerFullInfo, 
  athletes, 
  handleClearAttentionClick 
}: MatchManagementInterfaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [editingScoreMatch, setEditingScoreMatch] = useState<Match | null>(null);
  const [tempSets, setTempSets] = useState<Array<{player1Score: number, player2Score: number}>>([]);
  const { toast } = useToast();


  // Obter categorias únicas dos participantes através das categorias do torneio
  const getUniqueCategories = () => {
    if (!tournament.categories) return [];
    return tournament.categories.map(c => c.name);
  };

  // Verificar se a categoria selecionada é mista
  const isMixedCategory = () => {
    if (!selectedCategory || !tournament.categories) return false;
    
    // Encontrar a categoria selecionada
    const category = tournament.categories.find(c => c.name === selectedCategory);
    
    // Primeiro, tentar usar o campo gender se disponível
    if (category && category.gender) {
      return category.gender.toLowerCase() === 'misto' || category.gender.toLowerCase() === 'mixed';
    }
    
    // Fallback: usar regex no nome da categoria para cobrir variações
    return /\b(misto|mista|mixed)\b/i.test(selectedCategory.toLowerCase());
  };

  // Obter gêneros baseados na categoria selecionada
  const getAvailableGenders = () => {
    if (!selectedCategory || !tournament.categories) return [];
    
    // Se categoria é mista, não mostrar opções de gênero
    if (isMixedCategory()) return [];
    
    // Encontrar a categoria selecionada
    const category = tournament.categories.find(c => c.name === selectedCategory);
    if (!category) return [];
    
    // Obter gêneros dos atletas que se inscreveram nesta categoria
    if (!tournament.participants) return [];
    
    const gendersInCategory = tournament.participants
      .map(p => p.gender) // Usando o campo gender do atleta
      .filter(Boolean);
    
    return Array.from(new Set(gendersInCategory));
  };

  // Obter fases disponíveis para a categoria selecionada
  const getAvailablePhases = () => {
    if (!selectedCategory) return [];
    
    // Sempre mostrar ambas as fases para qualquer categoria selecionada
    return ['group', 'knockout'];
  };

  // Obter grupos disponíveis para a fase selecionada
  const getAvailableGroups = () => {
    if (!selectedCategory || !selectedPhase || !matches) return [];
    
    const category = tournament.categories?.find(c => c.name === selectedCategory);
    if (!category) return [];
    
    // Filtrar partidas por categoria e fase, depois obter grupos únicos
    const phaseMatches = matches.filter(match => 
      match.categoryId === category.id && match.phase === selectedPhase
    );
    
    const groups: string[] = Array.from(new Set(
      phaseMatches.map(match => match.groupName).filter(Boolean) as string[]
    ));
    
    return groups.sort();
  };

  // Traduzir nome da fase para português
  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'group': return 'Fase de Grupos';
      case 'knockout': return 'Eliminatórias';
      case 'round_of_32': return '32avos de Final';
      case 'round_of_16': return 'Oitavas de Final';
      case 'quarterfinal': return 'Quartas de Final';
      case 'semifinal': return 'Semifinais';
      case 'third_place': return 'Disputa do 3º Lugar';
      case 'final': return 'Final';
      default: return phase;
    }
  };

  // Funções para gerenciar placares
  const initializeScoreEditing = (match: Match) => {
    setEditingScoreMatch(match);
    // Inicializar com sets existentes ou 3 sets vazios por padrão
    const existingSets = match.sets as Array<{player1Score: number, player2Score: number}> || [];
    const defaultSets = existingSets.length > 0 ? existingSets : 
      Array(match.bestOfSets || 3).fill(null).map(() => ({player1Score: 0, player2Score: 0}));
    setTempSets(defaultSets);
  };

  const addSet = () => {
    setTempSets([...tempSets, {player1Score: 0, player2Score: 0}]);
  };

  const removeSet = (index: number) => {
    if (tempSets.length > 1) {
      const newSets = tempSets.filter((_, i) => i !== index);
      setTempSets(newSets);
    }
  };

  const updateSetScore = (setIndex: number, player: 'player1' | 'player2', score: number) => {
    const newSets = [...tempSets];
    newSets[setIndex] = {
      ...newSets[setIndex],
      [`${player}Score`]: score
    };
    setTempSets(newSets);
  };

  const calculateMatchScore = (sets: Array<{player1Score: number, player2Score: number}>) => {
    let player1Sets = 0;
    let player2Sets = 0;
    
    sets.forEach(set => {
      if (set.player1Score > set.player2Score) player1Sets++;
      else if (set.player2Score > set.player1Score) player2Sets++;
    });
    
    return {player1Sets, player2Sets, totalSets: sets.length};
  };

  const saveMatchScore = async () => {
    if (!editingScoreMatch) return;
    
    const {player1Sets, player2Sets} = calculateMatchScore(tempSets);
    const isCompleted = player1Sets !== player2Sets && (player1Sets > tempSets.length / 2 || player2Sets > tempSets.length / 2);
    
    try {
      // Determinar vencedor se a partida estiver completa
      let winnerId = null;
      if (isCompleted) {
        winnerId = player1Sets > player2Sets ? editingScoreMatch.player1Id : editingScoreMatch.player2Id;
      }
      
      await apiRequest('PATCH', `/api/matches/${editingScoreMatch.id}`, {
        sets: tempSets,
        status: isCompleted ? 'completed' : 'in_progress',
        winnerId: winnerId,
      });
      
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournament.id, 'matches'] });
      
      toast({
        title: "Placar salvo",
        description: `${getPlayerName(editingScoreMatch.player1Id)} ${player1Sets} x ${player2Sets} ${getPlayerName(editingScoreMatch.player2Id)}`,
      });
      
      setEditingScoreMatch(null);
      setTempSets([]);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o placar",
        variant: "destructive",
      });
    }
  };

  const cancelScoreEditing = () => {
    setEditingScoreMatch(null);
    setTempSets([]);
  };

  // Extract filtered matches logic into useMemo to avoid JSX complexity
  const filteredMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    
    // Filtrar partidas hierarquicamente: Categoria → Fase → Grupo → Gênero
    let filtered = matches;

    // 1. FILTRO POR CATEGORIA (obrigatório)
    if (selectedCategory) {
      const category = tournament.categories?.find(c => c.name === selectedCategory);
      if (category) {
        filtered = filtered.filter(match => 
          match.categoryId === category.id
        );
      }
    }

    // 2. FILTRO POR FASE (se selecionada)
    if (selectedPhase) {
      if (selectedPhase === 'knockout') {
        // Se "Eliminatórias" selecionada, mostrar todas as fases eliminatórias
        const eliminationPhases = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'];
        filtered = filtered.filter(match => 
          eliminationPhases.includes(match.phase || '')
        );
      } else {
        // Fase específica selecionada
        filtered = filtered.filter(match => 
          match.phase === selectedPhase
        );
      }
    }

    // 3. FILTRO POR GRUPO (se selecionado)
    if (selectedGroup) {
      filtered = filtered.filter(match => 
        match.groupName === selectedGroup
      );
    }

    // 4. FILTRO POR GÊNERO (se não for categoria mista e gênero selecionado)
    if (selectedGender && !isMixedCategory() && athletes) {
      filtered = filtered.filter(match => {
        const player1Athlete = athletes.find(a => a.id === match.player1Id);
        const player2Athlete = match.player2Id ? athletes.find(a => a.id === match.player2Id) : null;
        
        const player1Gender = player1Athlete?.gender || '';
        const player2Gender = player2Athlete ? (player2Athlete.gender || '') : '';
        
        const normalizedSelectedGender = selectedGender.toLowerCase();
        const normalizedPlayer1Gender = player1Gender.toLowerCase();
        const normalizedPlayer2Gender = player2Gender.toLowerCase();
        
        return normalizedPlayer1Gender === normalizedSelectedGender || 
               (player2Athlete && normalizedPlayer2Gender === normalizedSelectedGender);
      });
    }

    // Log dos filtros aplicados
    const appliedFilters: string[] = [];
    if (selectedCategory) appliedFilters.push(`Categoria: ${selectedCategory}`);
    if (selectedPhase) appliedFilters.push(`Fase: ${getPhaseDisplayName(selectedPhase)}`);
    if (selectedGroup) appliedFilters.push(`Grupo: ${selectedGroup}`);
    if (selectedGender) appliedFilters.push(`Naipe: ${selectedGender}`);
    
    if (appliedFilters.length > 0 && filtered.length !== matches.length) {
      console.log(`🔍 Filtros aplicados: ${appliedFilters.join(' → ')} | ${matches.length} → ${filtered.length} partidas`);
    }

    return filtered;
  }, [matches, selectedCategory, selectedPhase, selectedGroup, selectedGender, tournament.categories, athletes, isMixedCategory]);

  // Calcular classificação do grupo em tempo real a partir das partidas
  const computeGroupStandingsRealTime = useMemo(() => {
    if (selectedPhase !== 'group' || !selectedGroup || !filteredMatches || !athletes) {
      return [];
    }

    // Filtrar partidas do grupo selecionado
    const groupMatches = filteredMatches.filter(match => 
      match.groupName === selectedGroup && match.status === 'completed'
    );

    // Coletar todos os jogadores do grupo
    const playerStats = new Map();
    
    // Inicializar stats dos jogadores
    groupMatches.forEach(match => {
      [match.player1Id, match.player2Id].forEach(playerId => {
        if (playerId && !playerStats.has(playerId)) {
          const athlete = athletes.find(a => a.id === playerId);
          playerStats.set(playerId, {
            playerId,
            name: athlete?.name || 'Jogador',
            photoUrl: athlete?.photoUrl,
            matchesWon: 0,
            matchesLost: 0,
            matchesPlayed: 0,
            setsWon: 0,
            setsLost: 0,
            pointsScored: 0,
            pointsConceded: 0,
            points: 0 // 2 pontos por vitória
          });
        }
      });
    });

    // Calcular resultados
    groupMatches.forEach(match => {
      if (!match.sets || !Array.isArray(match.sets) || match.sets.length === 0) return;
      
      const sets = match.sets as Array<{player1Score: number, player2Score: number}>;
      const player1Sets = sets.filter(set => set.player1Score > set.player2Score).length;
      const player2Sets = sets.filter(set => set.player2Score > set.player1Score).length;
      
      const player1Stats = playerStats.get(match.player1Id);
      const player2Stats = playerStats.get(match.player2Id);
      
      if (player1Stats && player2Stats) {
        // Atualizar partidas jogadas
        player1Stats.matchesPlayed++;
        player2Stats.matchesPlayed++;
        
        // Atualizar sets
        player1Stats.setsWon += player1Sets;
        player1Stats.setsLost += player2Sets;
        player2Stats.setsWon += player2Sets;
        player2Stats.setsLost += player1Sets;
        
        // Calcular pontos de cada set
        sets.forEach(set => {
          player1Stats.pointsScored += set.player1Score;
          player1Stats.pointsConceded += set.player2Score;
          player2Stats.pointsScored += set.player2Score;
          player2Stats.pointsConceded += set.player1Score;
        });
        
        // Definir vencedor e atualizar pontos
        if (player1Sets > player2Sets) {
          player1Stats.matchesWon++;
          player1Stats.points += 2;
          player2Stats.matchesLost++;
        } else if (player2Sets > player1Sets) {
          player2Stats.matchesWon++;
          player2Stats.points += 2;
          player1Stats.matchesLost++;
        }
      }
    });

    // Converter para array e ordenar
    const standings = Array.from(playerStats.values());
    standings.sort((a, b) => {
      // 1. Pontos (descrescente)
      if (b.points !== a.points) return b.points - a.points;
      // 2. Saldo de sets (descrescente)
      const aSetsBalance = a.setsWon - a.setsLost;
      const bSetsBalance = b.setsWon - b.setsLost;
      if (bSetsBalance !== aSetsBalance) return bSetsBalance - aSetsBalance;
      // 3. Sets ganhos (descrescente)
      if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
      // 4. Saldo de pontos (descrescente)
      const aPointsBalance = a.pointsScored - a.pointsConceded;
      const bPointsBalance = b.pointsScored - b.pointsConceded;
      return bPointsBalance - aPointsBalance;
    });

    return standings;
  }, [selectedPhase, selectedGroup, filteredMatches, athletes]);

  // Check if we should show matches based on filters
  const shouldShowMatches = selectedCategory && selectedPhase && (selectedPhase !== 'group' || selectedGroup) && selectedPhase !== 'knockout';

  // Helper functions to calculate match scores and winners
  const getMatchResults = (match: Match) => {
    if (match.status !== "completed" || !match.sets || !Array.isArray(match.sets) || match.sets.length === 0) {
      return { player1Sets: 0, player2Sets: 0, player1Wins: false, player2Wins: false };
    }
    
    const sets = match.sets as Array<{player1Score: number, player2Score: number}>;
    const player1Sets = sets.filter(set => set.player1Score > set.player2Score).length;
    const player2Sets = sets.filter(set => set.player2Score > set.player1Score).length;
    
    return {
      player1Sets,
      player2Sets,
      player1Wins: player1Sets > player2Sets,
      player2Wins: player2Sets > player1Sets
    };
  };

  // Helper component to render player score
  const PlayerScore = ({ match, isPlayer1 }: { match: Match; isPlayer1: boolean }) => {
    const results = getMatchResults(match);
    if (results.player1Sets === 0 && results.player2Sets === 0) return null;
    
    const sets = isPlayer1 ? results.player1Sets : results.player2Sets;
    const wins = isPlayer1 ? results.player1Wins : results.player2Wins;
    
    return (
      <>
        <span className="text-green-600 font-bold">({sets})</span>
        {wins && <span className="text-yellow-500">🏆</span>}
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="material-icons text-orange-500">sports_tennis</span>
          Gerenciar Partidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção Hierárquica: Categoria → Fase → Grupo */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
            <span className="text-xl">🏆</span>
            <span className="ml-2">Filtrar Partidas por Categoria</span>
          </h3>
          
          {/* Primeira linha: Categoria e Naipe */}
          <div className={`grid gap-4 mb-4 ${isMixedCategory() ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Categoria *
              </label>
              <Select value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value);
                // Limpar seleções dependentes
                setSelectedGender("");
                setSelectedPhase("");
                setSelectedGroup("");
                // Limpar gênero quando categoria mista
                const category = tournament.categories?.find(c => c.name === value);
                if (category && ((category.gender && (category.gender.toLowerCase() === 'misto' || category.gender.toLowerCase() === 'mixed')) || /\b(misto|mista|mixed)\b/i.test(value.toLowerCase()))) {
                  setSelectedGender("");
                }
              }}>
                <SelectTrigger data-testid="select-category" className="w-full h-12 text-base border-2 border-gray-300 hover:border-orange-400 focus:border-orange-500 rounded-lg shadow-sm">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {getUniqueCategories().map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isMixedCategory() && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Naipe
                </label>
                <Select 
                  value={selectedGender} 
                  onValueChange={setSelectedGender}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger 
                    data-testid="select-gender" 
                    className={`w-full h-12 text-base border-2 rounded-lg shadow-sm ${
                      !selectedCategory 
                        ? 'border-gray-200 bg-gray-100 cursor-not-allowed' 
                        : 'border-gray-300 hover:border-orange-400 focus:border-orange-500'
                    }`}
                  >
                    <SelectValue placeholder="Selecione o naipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableGenders().map(gender => (
                      <SelectItem key={gender} value={gender}>
                        {gender === 'M' || gender === 'masculino' ? '👨 Masculino' : 
                         gender === 'F' || gender === 'feminino' ? '👩 Feminino' : gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Segunda linha: Fase e Grupo (condicionais) */}
          {selectedCategory && getAvailablePhases().length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Fase
                </label>
                <Select 
                  value={selectedPhase} 
                  onValueChange={(value) => {
                    setSelectedPhase(value || "");
                    setSelectedGroup(""); // Limpar grupo ao mudar fase
                  }}
                >
                  <SelectTrigger 
                    data-testid="select-phase" 
                    className="w-full h-12 text-base border-2 border-gray-300 hover:border-orange-400 focus:border-orange-500 rounded-lg shadow-sm"
                  >
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailablePhases().map(phase => {
                      const phaseValue = phase || '';
                      return (
                        <SelectItem key={phaseValue} value={phaseValue}>
                          {getPhaseDisplayName(phaseValue)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedPhase && getAvailableGroups().length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Grupo
                  </label>
                  <Select 
                    value={selectedGroup} 
                    onValueChange={(value) => setSelectedGroup(value || "")}
                  >
                    <SelectTrigger 
                      data-testid="select-group" 
                      className="w-full h-12 text-base border-2 border-gray-300 hover:border-orange-400 focus:border-orange-500 rounded-lg shadow-sm"
                    >
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableGroups().map(group => {
                        const groupValue = group || '';
                        return (
                          <SelectItem key={groupValue} value={groupValue}>
                            Grupo {groupValue}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gerar Fases Eliminatórias - botão para criar mata-mata */}
        {(() => {
          if (!selectedCategory || !matches) return null;
          
          const availablePhases = getAvailablePhases();
          const onlyGroupPhase = availablePhases.length === 1 && availablePhases[0] === 'group';
          
          // Verificar se há partidas de grupo (não precisa estar completa)
          const category = tournament.categories?.find(c => c.name === selectedCategory);
          if (!category) return null;
          
          const groupMatches = matches.filter(m => m.categoryId === category.id && m.phase === 'group');
          const hasGroupMatches = groupMatches.length > 0;
          
          if (!onlyGroupPhase || !hasGroupMatches) return null;
          
          return (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                  <span className="text-xl">⚡</span>
                  <span className="ml-2">Gerar Fases Eliminatórias</span>
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  Gere o chaveamento eliminatório! Ele será preenchido automaticamente conforme os grupos forem finalizados.
                </p>
                <Button 
                  onClick={async () => {
                    try {
                      await apiRequest('POST', `/api/tournaments/${tournament.id}/categories/${category.id}/generate-next-phase`);
                      
                      // Invalidar cache para atualizar as partidas
                      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournament.id, 'matches'] });
                      
                      toast({
                        title: "Fases eliminatórias geradas!",
                        description: "Agora você pode gerenciar as partidas do mata-mata.",
                      });
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: `Não foi possível gerar as fases: ${error instanceof Error ? error.message : String(error)}`,
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-generate-bracket"
                >
                  🏆 Gerar Chaveamento Eliminatório
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Chaveamento Eliminatório - aparece para fases eliminatórias ou quando já foi gerado */}
        {(() => {
          if (!selectedCategory) return null;
          
          const category = tournament.categories?.find(c => c.name === selectedCategory);
          if (!category?.id) return null;
          
          const availablePhases = getAvailablePhases();
          const hasEliminationPhases = availablePhases.some(p => p !== 'group');
          
          // Mostrar APENAS quando "Eliminatórias" estiver selecionado no dropdown
          const showBracket = selectedPhase === 'knockout';
          
          if (!showBracket) return null;
          
          return (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                <h3 className="text-xl font-bold text-orange-800 dark:text-orange-300 mb-4 flex items-center">
                  <span className="text-2xl">🏆</span>
                  <span className="ml-2">
                    Chaveamento Eliminatório
                    {selectedPhase === 'knockout' ? ` - ${getPhaseDisplayName(selectedPhase)}` : ''}
                  </span>
                </h3>
                
                <BracketView 
                  tournamentId={tournament.id}
                  categoryId={category.id}
                />
              </div>
            </div>
          );
        })()}

        {/* Classificação do Grupo em Tempo Real */}
        {selectedPhase === 'group' && selectedGroup && computeGroupStandingsRealTime.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Classificação em Tempo Real - Grupo {selectedGroup}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Atleta</th>
                        <th className="text-center p-2">V</th>
                        <th className="text-center p-2">D</th>
                        <th className="text-center p-2">Sets +</th>
                        <th className="text-center p-2">Sets -</th>
                        <th className="text-center p-2">Saldo Sets</th>
                        <th className="text-center p-2">Pts +</th>
                        <th className="text-center p-2">Pts -</th>
                        <th className="text-center p-2">Saldo Pts</th>
                        <th className="text-center p-2">Pontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computeGroupStandingsRealTime.map((standing, index) => (
                        <tr key={standing.playerId} className={`border-b hover:bg-gray-50 ${index < 2 ? 'bg-green-50' : ''}`}>
                          <td className="p-2 font-bold">
                            {index + 1}°
                            {index < 2 && <span className="ml-1 text-green-600">🔝</span>}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                {standing.photoUrl ? (
                                  <AvatarImage src={standing.photoUrl} alt={standing.name} />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {standing.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{standing.name}</span>
                            </div>
                          </td>
                          <td className="text-center p-2 text-green-600 font-bold">{standing.matchesWon}</td>
                          <td className="text-center p-2 text-red-600 font-bold">{standing.matchesLost}</td>
                          <td className="text-center p-2">{standing.setsWon}</td>
                          <td className="text-center p-2">{standing.setsLost}</td>
                          <td className="text-center p-2 font-bold">
                            <span className={standing.setsWon - standing.setsLost >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {standing.setsWon - standing.setsLost > 0 ? '+' : ''}{standing.setsWon - standing.setsLost}
                            </span>
                          </td>
                          <td className="text-center p-2">{standing.pointsScored}</td>
                          <td className="text-center p-2">{standing.pointsConceded}</td>
                          <td className="text-center p-2 font-bold">
                            <span className={standing.pointsScored - standing.pointsConceded >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {standing.pointsScored - standing.pointsConceded > 0 ? '+' : ''}{standing.pointsScored - standing.pointsConceded}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                              {standing.points}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-50 border border-green-200 rounded"></span>
                    Os 2 primeiros avançam para as eliminatórias
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de partidas existentes */}
        {matches && matches.length > 0 && shouldShowMatches && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Partidas do Torneio</h3>
            <div className="grid gap-4">
              {filteredMatches.map(match => {
                // Cast sets para tipo correto antes de usar em JSX
                const sets = (match.sets ?? []) as Array<{ player1Score: number; player2Score: number }>;
                
                return (
                  <Card key={match.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {/* NOVA ESTRUTURA: NOMES COM PLACAR AO LADO + STATUS ABAIXO DE VS */}
                        <div className="text-center mb-3">
                          <div className="flex items-center justify-center gap-4 mb-1">
                            {/* JOGADOR 1 COM PLACAR */}
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {getPlayerName(match.player1Id) || 'Jogador 1'}
                              </span>
                              <PlayerScore match={match} isPlayer1={true} />
                            </div>

                            {/* VS */}
                            <div className="text-lg font-bold text-muted-foreground">
                              VS
                            </div>

                            {/* JOGADOR 2 COM PLACAR */}
                            <div className="flex items-center gap-2">
                              <PlayerScore match={match} isPlayer1={false} />
                              <span className="font-medium">
                                {match.player2Id ? (getPlayerName(match.player2Id) || 'Jogador 2') : '🚫 BYE'}
                              </span>
                            </div>
                          </div>

                          {/* STATUS CENTRALIZADO ABAIXO DE VS */}
                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              match.status === 'completed' ? 'bg-green-100 text-green-800' :
                              match.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {match.status === 'completed' ? 'Finalizada' :
                               match.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                            </span>
                          </div>
                        </div>

                      {/* PONTOS DOS SETS */}
                      {match.status === "completed" && sets.length > 0 && (
                        <div className="flex flex-row flex-wrap justify-center gap-1 text-xs mb-3">
                          {sets.flatMap((set, setIndex) => [
                            <span 
                              key={`${setIndex}-p1`} 
                              className="bg-orange-400 text-white px-2 py-1 rounded font-bold min-w-6 text-center"
                              data-testid={`set-${setIndex}-player1-score`}
                            >
                              {set.player1Score}
                            </span>,
                            <span 
                              key={`${setIndex}-p2`} 
                              className="bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold min-w-6 text-center border"
                              data-testid={`set-${setIndex}-player2-score`}
                            >
                              {set.player2Score}
                            </span>
                          ])}
                        </div>
                      )}

                      {/* MESA E PARTIDA NAS EXTREMIDADES */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        {/* MESA (ESQUERDA) */}
                        <div className="flex items-center gap-2">
                          <span>Mesa {match.tableNumber || 1}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0 text-xs hover:bg-orange-100"
                            onClick={async () => {
                              const newTable = window.prompt(`Alterar mesa (atual: Mesa ${match.tableNumber || 1}):`, `${match.tableNumber || 1}`);
                              if (newTable && !isNaN(Number(newTable))) {
                                try {
                                  await apiRequest('PATCH', `/api/matches/${match.id}`, { tableNumber: Number(newTable) });
                                  
                                  // Invalidar cache para atualizar a lista
                                  queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournament.id, 'matches'] });
                                  
                                  toast({
                                    title: "Mesa alterada",
                                    description: `Partida movida para Mesa ${newTable}`,
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Erro",
                                    description: `Não foi possível alterar a mesa: ${error instanceof Error ? error.message : String(error)}`,
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                            data-testid={`button-edit-table-${match.id}`}
                          >
                            ✏️
                          </Button>
                        </div>

                        {/* PARTIDA (DIREITA) */}
                        <span>Partida #{match.matchNumber}</span>
                      </div>
                      {/* Botão para editar placar */}
                      <div className="mt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => initializeScoreEditing(match)}
                          data-testid={`button-edit-score-${match.id}`}
                          className="w-full"
                        >
                          🏓 {match.sets && Array.isArray(match.sets) && match.sets.length > 0 ? 'Editar Placar' : 'Adicionar Placar'}
                        </Button>
                      </div>
                    </div>
                    {match.needsAttention && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 text-sm">⚠️ Precisa atenção</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e: React.MouseEvent) => handleClearAttentionClick(e, match.id)}
                          data-testid={`button-clear-attention-${match.id}`}
                        >
                          Resolver
                        </Button>
                      </div>
                    )}
                </div>
              </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Status messages for different tournament states */}
        {tournament.status === 'registration_open' ? (
          <div className="text-center p-8 text-muted-foreground">
            <span className="material-icons text-4xl mb-4 block">schedule</span>
            <h3 className="text-lg font-semibold mb-2">Torneio ainda não iniciado</h3>
            <p className="mb-4">As partidas aparecerão aqui após o torneio ser iniciado.</p>
            <p className="text-sm">Use o botão "Iniciar Torneio" para começar a competição.</p>
          </div>
        ) : tournament.status === 'in_progress' ? (
          <div className="text-center p-8 text-muted-foreground">
            <span className="material-icons text-4xl mb-4 block">sports_tennis</span>
            <h3 className="text-lg font-semibold mb-2">Nenhuma partida criada</h3>
            <p className="mb-4">O chaveamento ainda não foi gerado para este torneio.</p>
            <p className="text-sm">Use a aba "Chaveamento" para gerar as partidas.</p>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <span className="material-icons text-4xl mb-4 block">info</span>
            <p>Nenhuma partida encontrada para este torneio.</p>
          </div>
        )}

        {/* Modal de Edição de Placar */}
        {editingScoreMatch && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏓</span>
                  Gerenciar Placar da Partida
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  {getPlayerName(editingScoreMatch.player1Id)} VS {getPlayerName(editingScoreMatch.player2Id)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Placar Geral */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-bold mb-2">Placar Geral</h3>
                  <div className="text-3xl font-bold">
                    {(() => {
                      const {player1Sets, player2Sets} = calculateMatchScore(tempSets);
                      return `${player1Sets} x ${player2Sets}`;
                    })()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {getPlayerName(editingScoreMatch.player1Id)} vs {getPlayerName(editingScoreMatch.player2Id)}
                  </div>
                </div>

                {/* Sets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold">Sets da Partida</h4>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={addSet}
                        className="bg-green-500 hover:bg-green-600"
                        data-testid="button-add-set"
                      >
                        + Adicionar Set
                      </Button>
                    </div>
                  </div>

                  {tempSets.map((set, index) => (
                    <div key={index} className="bg-gray-50 border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Set {index + 1}</span>
                        {tempSets.length > 1 && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => removeSet(index)}
                            data-testid={`button-remove-set-${index}`}
                          >
                            🗑️ Remover
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 items-center">
                        {/* Jogador 1 */}
                        <div className="text-center">
                          <div className="text-sm font-medium mb-1">
                            {getPlayerName(editingScoreMatch.player1Id)}
                          </div>
                          <Input 
                            type="number" 
                            min="0" 
                            max="99"
                            value={set.player1Score}
                            onChange={(e) => updateSetScore(index, 'player1', parseInt(e.target.value) || 0)}
                            className="text-center text-lg font-bold"
                            data-testid={`input-player1-set-${index}`}
                          />
                        </div>

                        {/* VS */}
                        <div className="text-center text-lg font-bold text-muted-foreground">
                          VS
                        </div>

                        {/* Jogador 2 */}
                        <div className="text-center">
                          <div className="text-sm font-medium mb-1">
                            {getPlayerName(editingScoreMatch.player2Id)}
                          </div>
                          <Input 
                            type="number" 
                            min="0" 
                            max="99"
                            value={set.player2Score}
                            onChange={(e) => updateSetScore(index, 'player2', parseInt(e.target.value) || 0)}
                            className="text-center text-lg font-bold"
                            data-testid={`input-player2-set-${index}`}
                          />
                        </div>
                      </div>

                      {/* Resultado do Set */}
                      <div className="text-center mt-2 text-sm">
                        {set.player1Score > set.player2Score ? (
                          <span className="text-green-600 font-medium">
                            ✅ {getPlayerName(editingScoreMatch.player1Id)} venceu
                          </span>
                        ) : set.player2Score > set.player1Score ? (
                          <span className="text-green-600 font-medium">
                            ✅ {getPlayerName(editingScoreMatch.player2Id)} venceu
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Empate</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={saveMatchScore}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    data-testid="button-save-score"
                  >
                    💾 Salvar Placar
                  </Button>
                  <Button 
                    onClick={cancelScoreEditing}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-cancel-score"
                  >
                    ❌ Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
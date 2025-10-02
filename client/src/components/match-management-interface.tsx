import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
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
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [editingScoreMatch, setEditingScoreMatch] = useState<Match | null>(null);
  const [tempSets, setTempSets] = useState<Array<{player1Score: number, player2Score: number}>>([]);
  const { toast } = useToast();

  // Auto-selecionar fase se houver apenas uma opção disponível
  useEffect(() => {
    if (!selectedCategory) return;
    
    const phases = getAvailablePhases();
    if (phases.length === 1 && !selectedPhase) {
      setSelectedPhase(phases[0]);
    }
  }, [selectedCategory]);

  // Resetar rodada selecionada quando filtros mudarem
  useEffect(() => {
    // Verificar se deve mostrar seletor de rodadas
    const showRoundSelector = selectedPhase === 'league' || selectedPhase === 'round_robin';
    
    if (!selectedCategory || !selectedPhase || !showRoundSelector) {
      setSelectedRound(null);
      return;
    }

    if (!matches) {
      setSelectedRound(null);
      return;
    }

    // Calcular rodadas disponíveis inline
    const category = tournament.categories?.find(c => c.name === selectedCategory);
    if (!category) {
      setSelectedRound(null);
      return;
    }

    let phaseMatches = matches.filter(match => 
      match.categoryId === category.id && match.phase === selectedPhase
    );
    
    if (selectedGroup) {
      phaseMatches = phaseMatches.filter(match => match.groupName === selectedGroup);
    }
    
    const rounds: number[] = Array.from(new Set(
      phaseMatches.map(match => match.round).filter(r => r !== null && r !== undefined) as number[]
    )).sort((a, b) => a - b);
    
    // Se não há rodadas disponíveis, limpar seleção
    if (rounds.length === 0) {
      setSelectedRound(null);
      return;
    }

    // Se rodada atual não está mais disponível, selecionar a primeira
    if (selectedRound === null || !rounds.includes(selectedRound)) {
      setSelectedRound(rounds[0]);
    }
  }, [selectedCategory, selectedPhase, selectedGroup, matches, tournament.categories, selectedRound]);

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
    
    // Encontrar a categoria selecionada
    const category = tournament.categories.find(c => c.name === selectedCategory);
    if (!category) return [];
    
    // Se categoria é mista, não mostrar opções de gênero
    if (isMixedCategory()) return [];
    
    // Se a categoria tem gênero definido (masculino ou feminino), não mostrar filtro
    // pois todos os jogadores já são daquele gênero
    if (category.gender && (category.gender.toLowerCase() === 'masculino' || category.gender.toLowerCase() === 'feminino')) {
      return [];
    }
    
    // Obter gêneros dos participantes DESTA CATEGORIA específica
    if (!tournament.participants) return [];
    
    const participantsInCategory = tournament.participants.filter((p: any) => p.categoryId === category.id);
    const gendersInCategory = participantsInCategory
      .map((p: any) => p.gender)
      .filter(Boolean);
    
    const uniqueGenders = Array.from(new Set(gendersInCategory));
    
    // Se há apenas um gênero na categoria, não mostrar filtro
    if (uniqueGenders.length <= 1) return [];
    
    return uniqueGenders;
  };

  // Obter fases disponíveis para a categoria selecionada baseado no formato
  const getAvailablePhases = () => {
    if (!selectedCategory) return [];
    
    // Encontrar a categoria selecionada e seu formato
    const category = tournament.categories?.find(c => c.name === selectedCategory);
    const format = (category as any)?.format || tournament.format || 'single_elimination';
    
    // Retornar fases baseadas no formato da categoria
    switch (format) {
      case 'groups_elimination':
      case 'group_stage_knockout':
        return ['group', 'knockout'];
      case 'single_elimination':
      case 'double_elimination':
        return ['knockout'];
      case 'round_robin':
      case 'league':
        return ['league'];  // Usar 'league' como padrão para pontos corridos
      case 'swiss':
        return ['swiss'];
      case 'cup':
        return ['group', 'knockout'];
      default:
        return ['league']; // Padrão para formatos não reconhecidos
    }
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

  // Obter rodadas disponíveis para a categoria e fase selecionadas
  const getAvailableRounds = () => {
    if (!selectedCategory || !selectedPhase || !matches) return [];
    
    const category = tournament.categories?.find(c => c.name === selectedCategory);
    if (!category) return [];
    
    // Filtrar partidas por categoria e fase
    let phaseMatches = matches.filter(match => 
      match.categoryId === category.id && match.phase === selectedPhase
    );
    
    // Se houver grupo selecionado, filtrar também por grupo
    if (selectedGroup) {
      phaseMatches = phaseMatches.filter(match => match.groupName === selectedGroup);
    }
    
    // Obter rodadas únicas e ordenar
    const rounds: number[] = Array.from(new Set(
      phaseMatches.map(match => match.round).filter(r => r !== null && r !== undefined) as number[]
    ));
    
    return rounds.sort((a, b) => a - b);
  };

  // Verificar se deve mostrar seletor de rodadas (apenas para round-robin e league)
  const shouldShowRoundSelector = () => {
    if (!selectedPhase) return false;
    return selectedPhase === 'league' || selectedPhase === 'round_robin';
  };

  // Funções de navegação de rodadas
  const availableRounds = getAvailableRounds();
  
  const goToFirstRound = () => {
    if (availableRounds.length > 0) {
      setSelectedRound(availableRounds[0]);
    }
  };

  const goToPreviousRound = () => {
    if (selectedRound !== null && availableRounds.length > 0) {
      const currentIndex = availableRounds.indexOf(selectedRound);
      if (currentIndex > 0) {
        setSelectedRound(availableRounds[currentIndex - 1]);
      }
    }
  };

  const goToNextRound = () => {
    if (selectedRound !== null && availableRounds.length > 0) {
      const currentIndex = availableRounds.indexOf(selectedRound);
      if (currentIndex < availableRounds.length - 1) {
        setSelectedRound(availableRounds[currentIndex + 1]);
      }
    }
  };

  const goToLastRound = () => {
    if (availableRounds.length > 0) {
      setSelectedRound(availableRounds[availableRounds.length - 1]);
    }
  };

  // Traduzir nome da fase para português
  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'group': return 'Fase de Grupos';
      case 'knockout': return 'Eliminatórias';
      case 'round_robin': return 'Pontos Corridos';
      case 'league': return 'Pontos Corridos';  // Aceitar 'league' como pontos corridos
      case 'swiss': return 'Sistema Suíço';
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
    // Inicializar com sets existentes ou usar a configuração da partida
    const existingSets = match.sets as Array<{player1Score: number, player2Score: number}> || [];
    const bestOfSets = match.bestOfSets || 3;
    const defaultSets = existingSets.length > 0 ? existingSets : 
      Array(bestOfSets).fill(null).map(() => ({player1Score: 0, player2Score: 0}));
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

  // Algoritmo para otimizar ordem das partidas evitando repetir jogadores em sequência
  const optimizeMatchOrder = (matches: Match[]) => {
    if (!matches || matches.length <= 2) return matches;
    
    // Separar por grupos primeiro para não misturar
    const matchesByGroup = new Map<string, Match[]>();
    matches.forEach(match => {
      const group = match.groupName || 'default';
      if (!matchesByGroup.has(group)) {
        matchesByGroup.set(group, []);
      }
      matchesByGroup.get(group)!.push(match);
    });
    
    const optimizedMatches: Match[] = [];
    
    // Otimizar cada grupo separadamente
    for (const [group, groupMatches] of Array.from(matchesByGroup.entries())) {
      const optimized = optimizeGroupMatches(groupMatches);
      optimizedMatches.push(...optimized);
    }
    
    return optimizedMatches;
  };

  const optimizeGroupMatches = (matches: Match[]) => {
    if (matches.length <= 2) return matches;
    
    const remaining = [...matches];
    const optimized: Match[] = [];
    const recentPlayers = new Set<string>();
    
    while (remaining.length > 0) {
      let bestMatchIndex = -1;
      let bestScore = -1;
      
      // Encontrar a melhor partida que minimize repetição de jogadores
      for (let i = 0; i < remaining.length; i++) {
        const match = remaining[i];
        const players = [match.player1Id, match.player2Id].filter(Boolean);
        
        // Calcular pontuação (quanto maior, melhor)
        let score = 0;
        
        // Bonus se nenhum jogador jogou recentemente
        const hasRecentPlayer = players.some(playerId => playerId && recentPlayers.has(playerId));
        if (!hasRecentPlayer) {
          score += 100; // Bonus alto para evitar repetição
        }
        
        // Bonus se a partida está pendente (priorizar jogos não iniciados)
        if (match.status === 'pending') {
          score += 10;
        }
        
        // Penalizar partidas já finalizadas para que fiquem no final
        if (match.status === 'completed') {
          score -= 50;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatchIndex = i;
        }
      }
      
      // Se não encontrou uma boa opção, pegar a primeira
      if (bestMatchIndex === -1) {
        bestMatchIndex = 0;
      }
      
      const selectedMatch = remaining[bestMatchIndex];
      remaining.splice(bestMatchIndex, 1);
      optimized.push(selectedMatch);
      
      // Atualizar lista de jogadores recentes (manter apenas os últimos 2-3 jogos)
      recentPlayers.clear();
      if (selectedMatch.player1Id) recentPlayers.add(selectedMatch.player1Id);
      if (selectedMatch.player2Id) recentPlayers.add(selectedMatch.player2Id);
      
      // Adicionar jogadores das últimas partidas também
      if (optimized.length >= 2) {
        const prevMatch = optimized[optimized.length - 2];
        if (prevMatch.player1Id) recentPlayers.add(prevMatch.player1Id);
        if (prevMatch.player2Id) recentPlayers.add(prevMatch.player2Id);
      }
    }
    
    return optimized;
  };

  // 🏆 LÓGICA DO PÓDIUM - Calcular posições quando categoria está completa
  const calculatePodiumPositions = () => {
    if (!selectedCategory || !matches || !athletes) return [];
    
    const category = tournament.categories?.find(c => c.name === selectedCategory);
    if (!category) return [];
    
    // Filtrar partidas da categoria selecionada
    const categoryMatches = matches.filter(match => match.categoryId === category.id);
    
    // Verificar se é um torneio de eliminação (tem fases como semifinal e final)
    const finalMatches = categoryMatches.filter(match => match.phase === 'final');
    const semifinalMatches = categoryMatches.filter(match => match.phase === 'semifinal');
    
    if (finalMatches.length === 0) return [];
    
    const finalMatch = finalMatches[0];
    if (finalMatch.status !== 'completed' || !finalMatch.winnerId) return [];
    
    console.log("🏆 CALCULATING PODIUM for category:", selectedCategory);
    console.log("  - Final match:", finalMatch);
    console.log("  - Semifinal matches:", semifinalMatches);
    
    const positions = [];
    
    // 1º lugar: vencedor da final
    const winner = athletes.find(a => a.id === finalMatch.winnerId);
    if (winner) {
      positions.push({
        playerId: winner.id,
        playerName: winner.name,
        photoUrl: winner.photoUrl,
        position: 1
      });
    }
    
    // 2º lugar: perdedor da final
    const runnerUpId = finalMatch.player1Id === finalMatch.winnerId ? finalMatch.player2Id : finalMatch.player1Id;
    const runnerUp = athletes.find(a => a.id === runnerUpId);
    if (runnerUp) {
      positions.push({
        playerId: runnerUp.id,
        playerName: runnerUp.name,
        photoUrl: runnerUp.photoUrl,
        position: 2
      });
    }
    
    // 3º lugar: perdedores das semifinais (AMBOS recebem 3º lugar - regra do tênis de mesa)
    semifinalMatches.forEach(semifinalMatch => {
      if (semifinalMatch.status === 'completed' && semifinalMatch.winnerId) {
        const loserId = semifinalMatch.player1Id === semifinalMatch.winnerId 
          ? semifinalMatch.player2Id 
          : semifinalMatch.player1Id;
        
        const loser = athletes.find(a => a.id === loserId);
        if (loser) {
          positions.push({
            playerId: loser.id,
            playerName: loser.name,
            photoUrl: loser.photoUrl,
            position: 3
          });
        }
      }
    });
    
    console.log("🏆 PODIUM POSITIONS:", positions);
    return positions;
  };

  const podiumPositions = calculatePodiumPositions();

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

    // 4. FILTRO POR RODADA (se selecionada e aplicável)
    if (selectedRound !== null && shouldShowRoundSelector()) {
      filtered = filtered.filter(match => match.round === selectedRound);
    }

    // 5. FILTRO POR GÊNERO (se não for categoria mista e gênero selecionado)
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
    if (selectedRound !== null && shouldShowRoundSelector()) appliedFilters.push(`Rodada: ${selectedRound}`);
    if (selectedGender) appliedFilters.push(`Naipe: ${selectedGender}`);
    
    if (appliedFilters.length > 0 && filtered.length !== matches.length) {
      console.log(`🔍 Filtros aplicados: ${appliedFilters.join(' → ')} | ${matches.length} → ${filtered.length} partidas`);
    }

    // 6. ORDENAÇÃO INTELIGENTE - EVITAR REPETIR O MESMO JOGADOR EM SEQUÊNCIA
    return optimizeMatchOrder(filtered);
  }, [matches, selectedCategory, selectedPhase, selectedGroup, selectedRound, selectedGender, tournament.categories, athletes, isMixedCategory, shouldShowRoundSelector]);

  // Calcular classificação para pontos corridos (league/round_robin)
  const computeLeagueStandings = useMemo(() => {
    // Apenas calcular para fases de pontos corridos
    if (!selectedPhase || (selectedPhase !== 'league' && selectedPhase !== 'round_robin')) {
      return [];
    }

    if (!selectedCategory || !matches || !athletes) {
      return [];
    }

    const category = tournament.categories?.find(c => c.name === selectedCategory);
    if (!category) return [];

    // Filtrar partidas completas da categoria e fase
    let leagueMatches = matches.filter(match => 
      match.categoryId === category.id && 
      match.phase === selectedPhase && 
      match.status === 'completed'
    );

    // Se houver grupo selecionado, filtrar por grupo também
    if (selectedGroup) {
      leagueMatches = leagueMatches.filter(match => match.groupName === selectedGroup);
    }

    // Coletar todos os jogadores
    const playerStats = new Map();

    // Inicializar stats dos jogadores
    leagueMatches.forEach(match => {
      [match.player1Id, match.player2Id].forEach(playerId => {
        if (playerId && !playerStats.has(playerId)) {
          const athlete = athletes.find(a => a.id === playerId);
          if (athlete) {
            playerStats.set(playerId, {
              playerId,
              name: athlete.name,
              photoUrl: athlete.photoUrl,
              matchesWon: 0,
              matchesLost: 0,
              setsWon: 0,
              setsLost: 0,
              pointsScored: 0,
              pointsConceded: 0,
              points: 0,
            });
          }
        }
      });
    });

    // Calcular estatísticas
    leagueMatches.forEach(match => {
      const sets = match.sets as Array<{player1Score: number, player2Score: number}> || [];
      
      let player1Sets = 0;
      let player2Sets = 0;
      let player1Points = 0;
      let player2Points = 0;

      sets.forEach(set => {
        player1Points += set.player1Score || 0;
        player2Points += set.player2Score || 0;
        
        if (set.player1Score > set.player2Score) {
          player1Sets++;
        } else if (set.player2Score > set.player1Score) {
          player2Sets++;
        }
      });

      const player1Stats = playerStats.get(match.player1Id);
      const player2Stats = playerStats.get(match.player2Id);

      if (player1Stats && player2Stats) {
        player1Stats.setsWon += player1Sets;
        player1Stats.setsLost += player2Sets;
        player1Stats.pointsScored += player1Points;
        player1Stats.pointsConceded += player2Points;

        player2Stats.setsWon += player2Sets;
        player2Stats.setsLost += player1Sets;
        player2Stats.pointsScored += player2Points;
        player2Stats.pointsConceded += player1Points;

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

    // Converter para array e ordenar pelos critérios de desempate
    const standings = Array.from(playerStats.values());
    standings.sort((a, b) => {
      // 1. Vitórias (descrescente)
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      // 2. Saldo de sets (descrescente)
      const aSetsBalance = a.setsWon - a.setsLost;
      const bSetsBalance = b.setsWon - b.setsLost;
      if (bSetsBalance !== aSetsBalance) return bSetsBalance - aSetsBalance;
      // 3. Saldo de pontos (descrescente)
      const aPointsBalance = a.pointsScored - a.pointsConceded;
      const bPointsBalance = b.pointsScored - b.pointsConceded;
      if (bPointsBalance !== aPointsBalance) return bPointsBalance - aPointsBalance;
      // 4. Pontos totais (descrescente)
      return b.points - a.points;
    });

    return standings;
  }, [selectedPhase, selectedCategory, selectedGroup, matches, athletes, tournament.categories]);

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

          {/* Terceira linha: Seletor de Rodadas (apenas para round-robin/league) */}
          {selectedPhase && shouldShowRoundSelector() && availableRounds.length > 0 && (
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Rodada
              </label>
              <div className="flex items-center gap-2">
                {/* Botão: Primeira Rodada */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstRound}
                  disabled={selectedRound === null || selectedRound === availableRounds[0]}
                  className="px-2"
                  data-testid="button-first-round"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                {/* Botão: Rodada Anterior */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousRound}
                  disabled={selectedRound === null || selectedRound === availableRounds[0]}
                  className="px-2"
                  data-testid="button-previous-round"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Dropdown de Rodadas */}
                <Select 
                  value={selectedRound?.toString() || ""} 
                  onValueChange={(value) => setSelectedRound(value ? parseInt(value) : null)}
                >
                  <SelectTrigger 
                    data-testid="select-round" 
                    className="flex-1 h-12 text-base border-2 border-gray-300 hover:border-orange-400 focus:border-orange-500 rounded-lg shadow-sm"
                  >
                    <SelectValue placeholder="Selecione a rodada" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRounds.map(round => (
                      <SelectItem key={round} value={round.toString()}>
                        Rodada {round}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Botão: Próxima Rodada */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextRound}
                  disabled={selectedRound === null || selectedRound === availableRounds[availableRounds.length - 1]}
                  className="px-2"
                  data-testid="button-next-round"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Botão: Última Rodada */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastRound}
                  disabled={selectedRound === null || selectedRound === availableRounds[availableRounds.length - 1]}
                  className="px-2"
                  data-testid="button-last-round"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
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

        {/* Classificação para Pontos Corridos (League/Round Robin) */}
        {(selectedPhase === 'league' || selectedPhase === 'round_robin') && computeLeagueStandings.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Classificação - {getPhaseDisplayName(selectedPhase)}
                  {selectedGroup && ` - Grupo ${selectedGroup}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-league-standings">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-800">
                        <th className="text-left p-2 font-bold">#</th>
                        <th className="text-left p-2 font-bold">Atleta</th>
                        <th className="text-center p-2 font-bold">V</th>
                        <th className="text-center p-2 font-bold">D</th>
                        <th className="text-center p-2 font-bold">Sets +</th>
                        <th className="text-center p-2 font-bold">Sets -</th>
                        <th className="text-center p-2 font-bold">Saldo Sets</th>
                        <th className="text-center p-2 font-bold">Pts +</th>
                        <th className="text-center p-2 font-bold">Pts -</th>
                        <th className="text-center p-2 font-bold">Saldo Pts</th>
                        <th className="text-center p-2 font-bold">Pontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computeLeagueStandings.map((standing, index) => (
                        <tr 
                          key={standing.playerId} 
                          className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
                          data-testid={`row-standing-${index}`}
                        >
                          <td className="p-2 font-bold">
                            {index + 1}°
                            {index === 0 && <span className="ml-1 text-yellow-600">🥇</span>}
                            {index === 1 && <span className="ml-1 text-gray-400">🥈</span>}
                            {index === 2 && <span className="ml-1 text-orange-600">🥉</span>}
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
                          <td className="text-center p-2 text-green-600 font-bold" data-testid={`wins-${index}`}>
                            {standing.matchesWon}
                          </td>
                          <td className="text-center p-2 text-red-600 font-bold" data-testid={`losses-${index}`}>
                            {standing.matchesLost}
                          </td>
                          <td className="text-center p-2" data-testid={`sets-won-${index}`}>
                            {standing.setsWon}
                          </td>
                          <td className="text-center p-2" data-testid={`sets-lost-${index}`}>
                            {standing.setsLost}
                          </td>
                          <td className="text-center p-2 font-bold" data-testid={`sets-balance-${index}`}>
                            <span className={standing.setsWon - standing.setsLost >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {standing.setsWon - standing.setsLost > 0 ? '+' : ''}{standing.setsWon - standing.setsLost}
                            </span>
                          </td>
                          <td className="text-center p-2" data-testid={`points-scored-${index}`}>
                            {standing.pointsScored}
                          </td>
                          <td className="text-center p-2" data-testid={`points-conceded-${index}`}>
                            {standing.pointsConceded}
                          </td>
                          <td className="text-center p-2 font-bold" data-testid={`points-balance-${index}`}>
                            <span className={standing.pointsScored - standing.pointsConceded >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {standing.pointsScored - standing.pointsConceded > 0 ? '+' : ''}{standing.pointsScored - standing.pointsConceded}
                            </span>
                          </td>
                          <td className="text-center p-2" data-testid={`total-points-${index}`}>
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded font-bold">
                              {standing.points}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    📊 Critérios de Desempate (em ordem):
                  </p>
                  <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 ml-4 list-decimal">
                    <li>Maior número de vitórias</li>
                    <li>Melhor saldo de sets (sets pró - sets contra)</li>
                    <li>Melhor saldo de pontos (pontos pró - pontos contra)</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Lista de partidas existentes - ORGANIZADAS POR GRUPO */}
        {matches && matches.length > 0 && shouldShowMatches && (() => {
          // Função para renderizar card individual de partida
          const renderMatchCard = (match: Match) => {
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
                          {/* Foto do Jogador 1 */}
                          <Avatar className="w-8 h-8">
                            {(() => {
                              const player = athletes?.find(a => a.id === match.player1Id);
                              return player?.photoUrl ? (
                                <AvatarImage 
                                  src={player.photoUrl} 
                                  alt={player.name}
                                  className="object-cover"
                                />
                              ) : null;
                            })()}
                            <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                              {getPlayerName(match.player1Id)?.charAt(0).toUpperCase() || '🏓'}
                            </AvatarFallback>
                          </Avatar>
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
                          {/* Foto do Jogador 2 */}
                          {match.player2Id && (
                            <Avatar className="w-8 h-8">
                              {(() => {
                                const player = athletes?.find(a => a.id === match.player2Id);
                                return player?.photoUrl ? (
                                  <AvatarImage 
                                    src={player.photoUrl} 
                                    alt={player.name}
                                    className="object-cover"
                                  />
                                ) : null;
                              })()}
                              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-green-500 to-green-600 text-white">
                                {getPlayerName(match.player2Id)?.charAt(0).toUpperCase() || '⚽'}
                              </AvatarFallback>
                            </Avatar>
                          )}
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
          };

          return (
            <div className="space-y-4">
              {selectedPhase === 'group' ? (
                // VISUALIZAÇÃO POR GRUPOS - FASE DE GRUPOS
                (() => {
                  // Agrupar partidas por grupo
                  const matchesByGroup = new Map<string, typeof filteredMatches>();
                  filteredMatches.forEach(match => {
                    const group = match.groupName || 'Sem Grupo';
                    if (!matchesByGroup.has(group)) {
                      matchesByGroup.set(group, []);
                    }
                    matchesByGroup.get(group)!.push(match);
                  });

                  // Ordenar grupos alfabeticamente
                  const sortedGroups = Array.from(matchesByGroup.keys()).sort();

                  return (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold">Partidas por Grupo</h3>
                      {sortedGroups.map(group => (
                        <div key={group} className="space-y-3">
                          <h4 className="text-md font-medium bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow-sm">
                            📊 Grupo {group}
                          </h4>
                          <div className="grid gap-3">
                            {matchesByGroup.get(group)!.map(match => renderMatchCard(match))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                // VISUALIZAÇÃO ÚNICA - OUTRAS FASES
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Partidas do Torneio</h3>
                  <div className="grid gap-4">
                    {filteredMatches.map(match => renderMatchCard(match))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Status messages for different tournament states */}
        {tournament.status === 'registration_open' ? (
          <div className="text-center p-8 text-muted-foreground">
            <span className="material-icons text-4xl mb-4 block">schedule</span>
            <h3 className="text-lg font-semibold mb-2">Torneio ainda não iniciado</h3>
            <p className="mb-4">As partidas aparecerão aqui após o torneio ser iniciado.</p>
            <p className="text-sm">Use o botão "Iniciar Torneio" para começar a competição.</p>
          </div>
        ) : (!filteredMatches || filteredMatches.length === 0) && selectedCategory ? (
          <div className="text-center p-8 text-muted-foreground">
            <span className="material-icons text-4xl mb-4 block">sports_tennis</span>
            <h3 className="text-lg font-semibold mb-2">Nenhuma partida criada</h3>
            <p className="mb-4">O chaveamento ainda não foi gerado para esta categoria.</p>
            <p className="text-sm">Use a aba "Chaveamento" para gerar as partidas.</p>
          </div>
        ) : (!matches || matches.length === 0) && !selectedCategory ? (
          <div className="text-center p-8 text-muted-foreground">
            <span className="material-icons text-4xl mb-4 block">info</span>
            <p>Nenhuma partida encontrada para este torneio.</p>
            <p className="text-sm">Selecione uma categoria para visualizar as partidas.</p>
          </div>
        ) : null}

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

        {/* 🏆 Pódium da Categoria - Versão Fixa e Discreta */}
        {podiumPositions.length > 0 && (
          <Card className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg font-bold text-yellow-700 dark:text-yellow-300 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5" />
                Pódium da Categoria: {selectedCategory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 sm:gap-8">
                {/* 2º Lugar */}
                {podiumPositions.find(p => p.position === 2) && (
                  <div className="flex flex-col items-center">
                    <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-gray-400 mb-2">
                      {podiumPositions.find(p => p.position === 2)?.photoUrl ? (
                        <AvatarImage src={podiumPositions.find(p => p.position === 2)?.photoUrl || undefined} />
                      ) : null}
                      <AvatarFallback className="bg-gray-400 text-white font-bold">
                        {podiumPositions.find(p => p.position === 2)?.playerName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400">2º</div>
                      <div className="text-sm sm:text-base font-semibold">{podiumPositions.find(p => p.position === 2)?.playerName}</div>
                    </div>
                  </div>
                )}

                {/* 1º Lugar */}
                {podiumPositions.find(p => p.position === 1) && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-3 border-yellow-400 mb-2">
                        {podiumPositions.find(p => p.position === 1)?.photoUrl ? (
                          <AvatarImage src={podiumPositions.find(p => p.position === 1)?.photoUrl || undefined} />
                        ) : null}
                        <AvatarFallback className="bg-yellow-500 text-white font-bold text-lg sm:text-xl">
                          {podiumPositions.find(p => p.position === 1)?.playerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-2 -right-1 text-2xl">👑</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-400">1º</div>
                      <div className="text-base sm:text-lg font-bold">{podiumPositions.find(p => p.position === 1)?.playerName}</div>
                    </div>
                  </div>
                )}

                {/* 3º Lugares */}
                <div className="flex flex-col gap-2">
                  {podiumPositions.filter(p => p.position === 3).map((third, index) => (
                    <div key={third.playerId} className="flex items-center gap-2">
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-amber-400">
                        {third.photoUrl ? (
                          <AvatarImage src={third.photoUrl} />
                        ) : null}
                        <AvatarFallback className="bg-amber-500 text-white font-bold text-sm">
                          {third.playerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400">3º</div>
                        <div className="text-sm font-semibold">{third.playerName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
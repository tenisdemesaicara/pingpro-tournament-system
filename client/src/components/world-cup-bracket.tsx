import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QualifiedAthlete {
  playerId: string;
  playerName: string;
  position: number;
  group: string;
  isRealPlayer?: boolean; // Flag para indicar se é nome real ou placeholder
  photoUrl?: string; // URL da foto do atleta
}

interface BracketMatch {
  id: string;
  phase: string;
  player1?: QualifiedAthlete | null;
  player2?: QualifiedAthlete | null;
  winner?: QualifiedAthlete;
  round: number;
  matchNumber: number;
  score?: string;
  status?: string;
  tableNumber?: number;
  sets?: any[];
}

interface GroupStanding {
  playerId: string;
  position: number;
  points: number;
  matchesWon: number;
}

interface GroupStandingData {
  group: string;
  standings: GroupStanding[];
}

interface BracketData {
  groupStandings?: GroupStandingData[];
  quarterfinal?: BracketMatch[];
  semifinal?: BracketMatch[];
  final?: BracketMatch[];
}

interface WorldCupBracketProps {
  tournamentId: string;
  categoryId: string;
}

// Componente de edição de placar
function ScoreEditor({ match, onSave, onCancel }: {
  match: BracketMatch;
  onSave: (score: string, tableNumber: number) => void;
  onCancel: () => void;
}) {
  const [score, setScore] = useState(match.score || "");
  const [tableNumber, setTableNumber] = useState(match.tableNumber || 1);

  const handleSave = () => {
    onSave(score, tableNumber);
  };

  return (
    <div className="space-y-2 p-2 bg-white border rounded-md shadow-sm">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Placar (ex: 3-1)"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="text-xs h-6"
        />
        <Input
          type="number"
          min="1"
          placeholder="Mesa"
          value={tableNumber}
          onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
          className="text-xs h-6 w-16"
        />
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={handleSave} className="h-6 px-2 text-xs">
          <Save className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-6 px-2 text-xs">
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function WorldCupBracket({ tournamentId, categoryId }: WorldCupBracketProps) {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editingScoreMatch, setEditingScoreMatch] = useState<BracketMatch | null>(null);
  const [tempSets, setTempSets] = useState<Array<{player1Score: number, player2Score: number}>>([]);
  const [tempTableNumber, setTempTableNumber] = useState<number>(1);
  const { toast } = useToast();
  
  const { data: bracketData, isLoading } = useQuery<BracketData>({
    queryKey: [`/api/tournaments/${tournamentId}/categories/${categoryId}/bracket`],
  });

  // Buscar dados dos atletas para obter nomes reais (endpoint público)
  const { data: athletes } = useQuery({
    queryKey: ['/api/public/athletes'],
  });

  // Mutação para atualizar partida
  const updateMatchMutation = useMutation({
    mutationFn: async ({ matchId, score, tableNumber, winnerId, sets }: { 
      matchId: string; 
      score: string; 
      tableNumber: number;
      winnerId?: string | null;
      sets?: Array<{player1Score: number, player2Score: number}>;
    }) => {
      const payload: any = {
        score,
        tableNumber,
        status: score ? 'completed' : 'pending'
      };
      
      if (winnerId) {
        payload.winnerId = winnerId;
      }
      
      if (sets && sets.length > 0) {
        payload.sets = sets;
      }
      
      const response = await apiRequest('PATCH', `/api/matches/${matchId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      // Revalidar dados do bracket
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tournaments/${tournamentId}/categories/${categoryId}/bracket`] 
      });
      setEditingMatch(null);
      setEditingScoreMatch(null);
      toast({
        title: "Placar atualizado!",
        description: "O placar foi salvo com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o placar.",
        variant: "destructive",
      });
    }
  });

  // Funções para gerenciar o modal de placar
  const initializeScoreEditing = (match: BracketMatch) => {
    setEditingScoreMatch(match);
    // Inicializar com sets existentes ou 3 sets vazios por padrão
    const existingSets = match.sets as Array<{player1Score: number, player2Score: number}> || [];
    const defaultSets = existingSets.length > 0 ? existingSets : 
      Array(3).fill(null).map(() => ({player1Score: 0, player2Score: 0}));
    setTempSets(defaultSets);
    setTempTableNumber(match.tableNumber || 1);
  };

  const cancelScoreEditing = () => {
    setEditingScoreMatch(null);
    setTempSets([]);
    setTempTableNumber(1);
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
      if (set.player1Score > set.player2Score) {
        player1Sets++;
      } else if (set.player2Score > set.player1Score) {
        player2Sets++;
      }
    });
    
    return { player1Sets, player2Sets };
  };

  const getPlayerName = (playerId?: string | null) => {
    if (!playerId) return "Jogador";
    const athlete = (athletes as any[])?.find((a: any) => a.id === playerId);
    return athlete?.name || "Jogador";
  };

  const saveScoreWithModal = () => {
    if (!editingScoreMatch) return;
    
    const { player1Sets, player2Sets } = calculateMatchScore(tempSets);
    const score = `${player1Sets}-${player2Sets}`;
    const winnerId = player1Sets > player2Sets ? editingScoreMatch.player1?.playerId : 
                    player2Sets > player1Sets ? editingScoreMatch.player2?.playerId : null;
    
    // Salvar com sets detalhados + avanço automático
    updateMatchMutation.mutate({
      matchId: editingScoreMatch.id,
      score,
      tableNumber: tempTableNumber,
      winnerId,
      sets: tempSets.filter(set => set.player1Score > 0 || set.player2Score > 0) // Apenas sets jogados
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando bracket...</p>
        </div>
      </div>
    );
  }

  if (!bracketData?.groupStandings) {
    return (
      <div className="text-center p-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
        <div className="text-gray-500">
          <h3 className="text-xl font-semibold mb-2">Bracket não disponível</h3>
          <p>Complete a fase de grupos para gerar o bracket das eliminatórias</p>
        </div>
      </div>
    );
  }

  // Criar mapa de playerId para nome real do atleta
  const athleteMap = new Map();
  if (athletes && Array.isArray(athletes)) {
    athletes.forEach((athlete: any) => {
      athleteMap.set(athlete.id, athlete.name);
    });
  }

  // Funções auxiliares
  const nextPowerOfTwo = (n: number) => {
    if (n <= 2) return 2;
    if (n <= 4) return 4;
    if (n <= 8) return 8;
    if (n <= 16) return 16;
    return 32;
  };

  // Calcular total de atletas que VÃO se classificar (independente de quantos já se classificaram)
  const groupsData = bracketData.groupStandings || [];
  const qualifiersPerGroup = 2; // Padrão: 2 atletas por grupo avançam
  const totalExpected = groupsData.length * qualifiersPerGroup;
  // FORÇAR um bracket maior para mostrar estrutura completa
  const totalForBracket = Math.max(nextPowerOfTwo(totalExpected), 8); // Mínimo 8 para mostrar quartas

  // CORRIGIDO: Calcular fases baseado na próxima potência de 2
  const getNextPowerOfTwo = (n: number) => {
    let power = 1;
    while (power < n) power *= 2;
    return power;
  };
  
  const getRequiredPhases = (actualCount: number) => {
    const paddedCount = getNextPowerOfTwo(actualCount);
    
    if (paddedCount <= 2) return ["final"];
    if (paddedCount <= 4) return ["semifinal", "final"];
    if (paddedCount <= 8) return ["quarterfinal", "semifinal", "final"];
    if (paddedCount <= 16) return ["round_of_16", "quarterfinal", "semifinal", "final"];
    return ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"];
  };

  if (totalExpected < 2) {
    return (
      <div className="text-center p-12 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
        <div className="text-yellow-700">
          <h3 className="text-xl font-semibold mb-2">Configuração insuficiente</h3>
          <p>São necessários pelo menos 2 atletas para gerar o bracket</p>
          <p className="text-sm mt-2">Grupos encontrados: {groupsData.length}</p>
        </div>
      </div>
    );
  }

  // NOVO: Gerar slots por SEEDS para incluir TODOS os grupos
  const allSlots: QualifiedAthlete[] = [];
  
  // Ordenar por SEEDS: A1, B1, C1, A2, B2, C2 (não por grupos)
  for (let position = 1; position <= qualifiersPerGroup; position++) {
    groupsData.forEach((groupData: GroupStandingData) => {
      const existingStanding = groupData.standings?.find(s => s.position === position);
      const realName = existingStanding ? athleteMap.get(existingStanding.playerId) : null;
      
      // Buscar dados completos do atleta
      const athleteData = existingStanding && Array.isArray(athletes) ? athletes.find((a: any) => a.id === existingStanding.playerId) : null;
      
      const slot: QualifiedAthlete = {
        playerId: existingStanding?.playerId || `${groupData.group}-${position}`,
        playerName: realName || `${position}º Grupo ${groupData.group}`,
        position,
        group: groupData.group,
        isRealPlayer: !!realName,
        photoUrl: athleteData?.photoUrl,
      };
      
      allSlots.push(slot);
    });
  }

  // CORRIGIDO: Calcular fases DEPOIS de criar allSlots
  const actualQualified = allSlots.length;
  const paddedCount = getNextPowerOfTwo(actualQualified);
  const allPhases = getRequiredPhases(actualQualified);
  
  // CRITICAL FIX: Este componente é SÓ para eliminatórias - usar apenas fases eliminatórias
  const phases = allPhases; // getRequiredPhases já não inclui 'group'
  console.log('🚨 PHASES PARA RENDERIZAR:', phases);
  console.log('🚨 BACKEND DATA KEYS:', Object.keys(bracketData || {}));

  // Debug removido - slots funcionando!
  
  // REMOVIDO: Código antigo que não é mais usado (buildSeedPairings, firstPhaseMatches)
  // Agora usamos APENAS dados do backend
  // Debug removido - matches funcionando!

  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case "round_of_32": return "32avos";
      case "round_of_16": return "OITAVAS";
      case "quarterfinal": return "QUARTAS";
      case "semifinal": return "SEMIFINAL";
      case "final": return "FINAL";
      default: return phase;
    }
  };

  // Renderizar um atleta/equipe - CARDS MENORES E RESPONSIVOS
  const renderTeam = (athlete?: QualifiedAthlete | null, isWinner?: boolean) => (
    <div 
      className={`flex items-center gap-2 p-2 rounded-md transition-all text-sm ${
        isWinner 
          ? 'bg-yellow-100 border border-yellow-400 shadow-sm' 
          : 'bg-white border border-gray-300 hover:border-blue-300'
      }`}
      data-testid={`team-${athlete?.playerId || 'empty'}`}
    >
      {/* Foto real do atleta */}
      <Avatar className="w-6 h-6">
        {athlete?.isRealPlayer && athlete.photoUrl ? (
          <AvatarImage 
            src={athlete.photoUrl} 
            alt={athlete.playerName}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback className={`text-xs font-bold ${
          athlete === null ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' :
          athlete && athlete.isRealPlayer ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 
          athlete ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' : 'bg-gray-300 text-gray-600'
        }`}>
          {athlete === null ? 'BYE' : athlete ? athlete.playerName.charAt(0).toUpperCase() : '?'}
        </AvatarFallback>
      </Avatar>
      
      {/* Nome do atleta - COMPACTO */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm truncate ${isWinner ? 'text-yellow-800' : 'text-gray-800'}`}>
          {athlete === null ? 'BYE' : athlete?.playerName || 'Aguardando vencedor'}
        </div>
        {athlete && athlete.isRealPlayer && (
          <div className="text-xs text-gray-500 truncate">
            Grupo {athlete.group}
          </div>
        )}
        {athlete === null && (
          <div className="text-xs text-gray-500 truncate">
            Avança automaticamente
          </div>
        )}
      </div>

      {/* Indicador de vitória - MENOR */}
      {isWinner && (
        <div className="text-yellow-600 text-sm">
          👑
        </div>
      )}
    </div>
  );

  // Verificar se o ID é um UUID real do backend
  const isRealBackendMatch = (matchId: string) => {
    // UUID v4 tem formato: 8-4-4-4-12 caracteres hexadecimais
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(matchId);
  };

  // Renderizar confronto - COMPACTO E RESPONSIVO COM EDIÇÃO
  const renderMatch = (match: BracketMatch) => {
    // Verificar se é um BYE (um dos jogadores está ausente)
    const isBye = !match.player1 || !match.player2 || 
                  match.player1.playerName.includes('BYE') || 
                  match.player2?.playerName.includes('BYE');
    
    // CRÍTICO: Apenas permitir edição para partidas reais do backend
    const canEdit = isRealBackendMatch(match.id) && !isBye;

    return (
      <div 
        key={match.id}
        className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-2 shadow-md border border-gray-200 min-w-[180px] max-w-[200px] md:min-w-[220px] md:max-w-[260px] relative"
        data-testid={`match-${match.phase}-${match.matchNumber}`}
      >
        {/* Botão de edição - APENAS para partidas reais do backend */}
        {canEdit ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => initializeScoreEditing(match)}
            className="absolute -top-1 -right-1 h-6 w-6 p-0 bg-white shadow-sm border hover:bg-gray-50"
            data-testid={`edit-score-${match.id}`}
          >
            <Edit className="w-3 h-3" />
          </Button>
        ) : !isRealBackendMatch(match.id) ? (
          <div 
            className="absolute -top-1 -right-1 h-6 w-6 p-0 bg-gray-200 border rounded flex items-center justify-center"
            title="Partida ainda não gerada pelo servidor"
          >
            <span className="text-xs text-gray-500">⏳</span>
          </div>
        ) : null}

      <div className="space-y-1">
        {renderTeam(match.player1, match.winner?.playerId === match.player1?.playerId)}
        
        {/* Área do VS com placar */}
        <div className="flex items-center justify-center py-1">
          <div className="w-full h-px bg-gray-300"></div>
          <div className="px-2 text-center bg-white">
            {match.score ? (
              <div>
                <div className="text-sm font-bold text-green-600">{match.score}</div>
                {match.sets && match.sets.length > 0 && (
                  <div className="text-xs mt-1 w-full">
                    <div className="overflow-x-auto">
                      <div className="flex items-center gap-1 flex-nowrap">
                        {match.sets.map((set: any, setIndex: number) => (
                          <div key={setIndex} className="flex gap-0.5">
                            <span 
                              className="bg-orange-500 text-white px-1 py-0.5 rounded text-[10px] leading-none font-bold min-w-[14px] text-center"
                              data-testid={`set-${setIndex}-player1`}
                            >
                              {set.player1Score}
                            </span>
                            <span 
                              className="bg-amber-200 text-orange-800 px-1 py-0.5 rounded text-[10px] leading-none font-bold min-w-[14px] text-center border"
                              data-testid={`set-${setIndex}-player2`}
                            >
                              {set.player2Score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">Mesa {match.tableNumber || 1}</div>
              </div>
            ) : isBye ? (
              <div>
                <span className="text-xs font-medium text-orange-500">BYE</span>
                <div className="text-xs text-gray-500 mt-1">Mesa {match.tableNumber || 1}</div>
              </div>
            ) : (
              <div>
                <span className="text-xs font-medium text-gray-500">VS</span>
                <div className="text-xs text-gray-500 mt-1">Mesa {match.tableNumber || 1}</div>
              </div>
            )}
            
            {/* Ícone de edição - sempre visível para partidas reais */}
            {isRealBackendMatch(match.id) && (
              <div className="mt-1">
                <button 
                  onClick={() => {
                    if (editingScoreMatch?.id === match.id) {
                      cancelScoreEditing();
                    } else {
                      initializeScoreEditing(match);
                    }
                  }}
                  className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                  data-testid={`edit-match-${match.id}`}
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="w-full h-px bg-gray-300"></div>
        </div>
        
        {renderTeam(match.player2, match.winner?.playerId === match.player2?.playerId)}
      </div>
    </div>
  );
  };

  // Criar mapa de partidas por ID para resolver adversários
  const matchesById = new Map();
  if (bracketData) {
    Object.values(bracketData).forEach((phaseMatches: any) => {
      if (Array.isArray(phaseMatches)) {
        phaseMatches.forEach((match: any) => {
          matchesById.set(match.id, match);
        });
      }
    });
  }

  // Resolver adversário real a partir do source
  const resolveContestant = (playerId?: string | null, source?: string) => {
    if (playerId) {
      // Jogador real já definido
      const athlete = (athletes as any[])?.find((a: any) => a.id === playerId);
      return {
        playerId,
        playerName: athlete?.name || 'Jogador',
        position: 1,
        group: '',
        isRealPlayer: true,
        photoUrl: athlete?.photoUrl
      };
    }
    
    if (source === 'BYE') {
      return null; // BYE real
    }
    
    if (source && source.includes('Vencedor #')) {
      // Tentar resolver o vencedor da partida anterior
      const matchNumber = parseInt(source.replace('Vencedor #', ''));
      // Buscar partida da fase anterior com esse número
      for (const [matchId, sourceMatch] of Array.from(matchesById.entries())) {
        if ((sourceMatch as any).matchNumber === matchNumber && (sourceMatch as any).winnerId) {
          const winnerId = (sourceMatch as any).winnerId;
          const athlete = (athletes as any[])?.find((a: any) => a.id === winnerId);
          return {
            playerId: winnerId,
            playerName: athlete?.name || 'Jogador',
            position: 1,
            group: '',
            isRealPlayer: true,
            photoUrl: athlete?.photoUrl
          };
        }
      }
    }
    
    return undefined; // TBD
  };

  // NOVO: Renderizar partida real do backend com IDs corretos
  const renderBackendMatch = (match: any) => {
    // Resolver adversários usando a nova lógica
    const player1 = resolveContestant(match.player1Id, match.player1Source);
    const player2 = resolveContestant(match.player2Id, match.player2Source);
    
    // Verificar se é um BYE REAL (apenas na partida imediata)
    const isBye = (match.player1Source === 'BYE' && !match.player1Id && !!match.player2Id) || 
                  (match.player2Source === 'BYE' && !match.player2Id && !!match.player1Id);

    // Converter para estrutura BracketMatch
    const uiMatch: BracketMatch = {
      id: match.id, // ID real do banco de dados
      phase: match.phase,
      player1: player1,
      player2: player2,
      round: match.round || 1,
      matchNumber: match.matchNumber || 1,
      score: match.score || undefined,
      winner: match.winnerId ? {
        playerId: match.winnerId,
        playerName: getPlayerName(match.winnerId),
        position: 1,
        group: '',
        isRealPlayer: true
      } : isBye && player1 ? player1 : isBye && player2 ? player2 : undefined, // Para BYE, definir vencedor automaticamente
      tableNumber: match.tableNumber,
      sets: match.sets
    };

    return renderMatch(uiMatch);
  };

  // Renderizar placeholder para fases futuras - COMPACTO
  const renderPlaceholder = (phase: string, matchNumber: number) => (
    <div 
      key={`${phase}-placeholder-${matchNumber}`}
      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-2 shadow-inner border border-dashed border-gray-300 min-w-[180px] max-w-[200px] md:min-w-[220px] md:max-w-[260px]"
      data-testid={`placeholder-${phase}-${matchNumber}`}
    >
      <div className="text-center py-4">
        <div className="text-gray-400 text-2xl mb-1">⚽</div>
        <div className="text-gray-600 font-medium text-sm">
          Vencedor da fase anterior
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Aguardando resultado
        </div>
      </div>
    </div>
  );

  // Renderizar linha de conexão
  const renderConnection = () => (
    <div className="flex items-center px-4">
      <div className="w-12 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600"></div>
      <div className="w-3 h-3 bg-purple-500 rounded-full shadow-md"></div>
      <div className="w-12 h-0.5 bg-gradient-to-r from-purple-600 to-purple-400"></div>
    </div>
  );

  return (
    <div className="w-full min-h-[600px] bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl overflow-x-auto">
      {/* Header - RESPONSIVO */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 tracking-wide">
          🏆 CHAVEAMENTO ELIMINATÓRIO
        </h1>
        <div className="mt-2 text-purple-300 text-xs sm:text-sm">
          {phases.map(getPhaseTitle).join(" → ")}
        </div>
      </div>

      {/* Bracket principal - VISÃO AMPLA MOBILE */}
      <div className="flex justify-start overflow-x-auto pb-6 -mx-4">
        <div className="flex items-center gap-1 md:gap-2 min-w-max scale-75 md:scale-90 px-4">
          {phases.map((phase, phaseIndex) => (
            <div key={phase} className="flex items-center">
              {/* Coluna da fase */}
              <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6">
                {/* Título da fase - COMPACTO */}
                <div className="bg-white/10 backdrop-blur-sm rounded-full px-2 md:px-4 py-1 border border-white/20">
                  <h3 className="text-xs md:text-sm font-bold text-white text-center tracking-wide">
                    {getPhaseTitle(phase)}
                  </h3>
                </div>
                
                {/* Confrontos da fase - DEBUG ATIVO */}
                <div className="flex flex-col gap-2">
                  {(() => {
                    // Usar dados reais do backend para cada fase
                    const phaseMatches = (bracketData as any)?.[phase] || [];
                    
                    // DEBUG: Verificar dados ANTES da deduplicação
                    console.log(`🔍 FASE: ${phase} - ANTES DEDUPE`);
                    console.log(`📊 Total RAW: ${phaseMatches.length}`);
                    
                    // CRITICAL FIX: Deduplicate backend data to prevent duplicate rendering
                    const deduplicatedMatches = phaseMatches.reduce((unique: any[], match: any) => {
                      const key = `${match.phase}-${match.round}-${match.matchNumber}-${match.player1Source || match.player1Id}-${match.player2Source || match.player2Id}`;
                      const existing = unique.find(m => {
                        const existingKey = `${m.phase}-${m.round}-${m.matchNumber}-${m.player1Source || m.player1Id}-${m.player2Source || m.player2Id}`;
                        return existingKey === key;
                      });
                      
                      if (!existing) {
                        unique.push(match);
                      } else {
                        // Preferir o match com nextMatchId ou sets/score preenchidos
                        if (match.nextMatchId && !existing.nextMatchId) {
                          const index = unique.findIndex(m => {
                            const mKey = `${m.phase}-${m.round}-${m.matchNumber}-${m.player1Source || m.player1Id}-${m.player2Source || m.player2Id}`;
                            return mKey === key;
                          });
                          unique[index] = match;
                        }
                      }
                      
                      return unique;
                    }, []);
                    
                    console.log(`📊 DEDUPE: ${phaseMatches.length} -> ${deduplicatedMatches.length}`);
                    
                    if (deduplicatedMatches.length > 0) {
                      // Mostrar partidas reais do backend - DEDUPLICATED
                      console.log(`✅ Renderizando ${deduplicatedMatches.length} partidas únicas da fase ${phase}`);
                      return deduplicatedMatches.map((match: any, index: number) => {
                        console.log(`🎮 Match ${index + 1}:`, match.id, match.player1Source, 'vs', match.player2Source);
                        return renderBackendMatch(match);
                      });
                    } else {
                      // Se não há dados do backend, mostrar placeholders
                      const numMatches = Math.pow(2, phases.length - phaseIndex - 1);
                      console.log(`⚪ Renderizando ${numMatches} placeholders para fase ${phase}`);
                      return Array.from({ length: numMatches }).map((_, i) => 
                        renderPlaceholder(phase, i + 1)
                      );
                    }
                  })()
                  }
                </div>
              </div>
              
              {/* Linha de conexão para próxima fase */}
              {phaseIndex < phases.length - 1 && renderConnection()}
            </div>
          ))}
        </div>
      </div>

      {/* Footer removido conforme solicitado pelo usuário */}

      {/* Modal de Edição de Placar - IGUAL AO DA FASE DE GRUPOS */}
      {editingScoreMatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🏓</span>
                Gerenciar Placar da Partida
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {editingScoreMatch.player1?.playerName || 'Jogador 1'} VS {editingScoreMatch.player2?.playerName || 'Jogador 2'}
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
                  {editingScoreMatch.player1?.playerName || 'Jogador 1'} vs {editingScoreMatch.player2?.playerName || 'Jogador 2'}
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
                          {editingScoreMatch.player1?.playerName || 'Jogador 1'}
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
                          {editingScoreMatch.player2?.playerName || 'Jogador 2'}
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
                          ✅ {editingScoreMatch.player1?.playerName || 'Jogador 1'} venceu
                        </span>
                      ) : set.player2Score > set.player1Score ? (
                        <span className="text-green-600 font-medium">
                          ✅ {editingScoreMatch.player2?.playerName || 'Jogador 2'} venceu
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Empate</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Configurações da Mesa */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3">Configurações da Mesa</h4>
                <div className="flex items-center gap-3">
                  <label htmlFor="table-number" className="text-sm font-medium">
                    Número da Mesa:
                  </label>
                  <Input 
                    id="table-number"
                    type="number" 
                    min="1" 
                    max="99"
                    value={tempTableNumber}
                    onChange={(e) => setTempTableNumber(parseInt(e.target.value) || 1)}
                    className="w-20 text-center"
                    data-testid="input-table-number"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={saveScoreWithModal}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="button-save-score"
                >
                  Salvar Placar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={cancelScoreEditing}
                  data-testid="button-cancel-score"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
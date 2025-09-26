import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, User, MapPin, Clock } from "lucide-react";
import { type Match } from "@shared/schema";
import { WorldCupBracket } from "./world-cup-bracket";

// Constantes para as fases
const PHASE_GROUP = 'grupos' as const;
const PHASE_ELIMS = 'eliminatorias' as const;

interface BracketViewProps {
  tournamentId: string;
  categoryId: string;
  className?: string;
}

interface BracketMatch extends Match {
  player1Name?: string;
  player2Name?: string;
  player1Photo?: string;
  player2Photo?: string;
  player1City?: string;
  player2City?: string;
  player1State?: string;
  player2State?: string;
  player1Club?: string;
  player2Club?: string;
}

interface BracketData {
  [phase: string]: BracketMatch[];
  groupStandings?: any;
}

// Mapear nomes das fases para display
type PhaseType = 'group' | 'round_of_32' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final' | 'third_place';

const phaseDisplayNames: Record<PhaseType, string> = {
  group: "Fase de Grupos",
  round_of_32: "32avos de Final", 
  round_of_16: "Oitavas de Final",
  quarterfinal: "Quartas de Final",
  semifinal: "Semifinais", 
  final: "Final",
  third_place: "3º Lugar"
};

// Cores para status das partidas
const getMatchStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'bye': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

// Formatear resultado do match
const formatScore = (match: BracketMatch) => {
  if (match.status === 'bye') return 'BYE';
  if (match.status === 'scheduled' || match.status === 'pending') return 'vs';
  
  // score é string no formato "3-1" ou "11-9,11-7"
  return match.score || 'vs';
};

// Parse player scores from the score string
const parsePlayerScores = (match: BracketMatch): { player1Score: number | null; player2Score: number | null } => {
  if (!match.score || match.status === 'bye' || match.status === 'scheduled' || match.status === 'pending') {
    return { player1Score: null, player2Score: null };
  }
  
  // Handle simple format like "3-1" (sets won)
  if (match.score.includes('-') && !match.score.includes(',')) {
    const [p1Score, p2Score] = match.score.split('-').map(s => parseInt(s.trim()));
    return { player1Score: p1Score || null, player2Score: p2Score || null };
  }
  
  // Handle detailed format like "11-9,11-7,9-11,11-5" (individual set scores)
  if (match.score.includes(',')) {
    const sets = match.score.split(',');
    let player1Sets = 0;
    let player2Sets = 0;
    
    sets.forEach(set => {
      if (set.includes('-')) {
        const [p1, p2] = set.split('-').map(s => parseInt(s.trim()));
        if (p1 > p2) player1Sets++;
        else if (p2 > p1) player2Sets++;
      }
    });
    
    return { player1Score: player1Sets, player2Score: player2Sets };
  }
  
  return { player1Score: null, player2Score: null };
};

// Obter placeholder do jogador baseado na fonte
const getPlayerPlaceholder = (playerSource: string | null, matches: BracketMatch[]) => {
  if (!playerSource) return "A definir";
  
  if (playerSource?.startsWith('group_')) {
    const position = playerSource.split('_')[1]; // group_1A -> 1A
    return `${position}º colocado`;
  }
  
  if (playerSource?.startsWith('match_')) {
    const sourceMatchId = playerSource.split('_')[1];
    const sourceMatch = matches.find(m => m.id === sourceMatchId);
    if (sourceMatch?.player1Name && sourceMatch?.player2Name) {
      return `Vencedor de ${sourceMatch.player1Name} vs ${sourceMatch.player2Name}`;
    }
    return `Vencedor da partida ${sourceMatch?.matchNumber || sourceMatchId}`;
  }
  
  return "A definir";
};

// Componente de Avatar do Atleta - estilo Copa do Mundo
function AthleteAvatar({ 
  athleteName, 
  athletePhoto, 
  className = "" 
}: { 
  athleteName: string | null; 
  athletePhoto?: string | null;
  className?: string; 
}) {
  if (!athleteName) {
    return (
      <div className={`w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 ${className}`}>
        <User className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  // Se há foto, usar ela
  if (athletePhoto) {
    return (
      <div className={`w-14 h-14 rounded-full border-2 border-white shadow-md overflow-hidden ${className}`}>
        <img 
          src={athletePhoto} 
          alt={athleteName}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  
  // Gerar cores baseadas no nome para consistência
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[Math.abs(hash) % colors.length];
  };
  
  const initials = athleteName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  return (
    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-md ${getColorFromName(athleteName)} ${className}`}>
      {initials}
    </div>
  );
}

// Card de partida estilo Copa do Mundo  
function WorldCupMatchCard({ match, matches, className = "" }: { 
  match: BracketMatch; 
  matches: BracketMatch[];
  className?: string;
}) {
  const player1Name = match.player1Name || getPlayerPlaceholder(match.player1Source, matches);
  const player2Name = match.player2Name || (match.status === 'bye' ? 'BYE' : getPlayerPlaceholder(match.player2Source, matches));
  
  return (
    <Card className={`${className} w-full sm:min-w-[18rem] md:min-w-[22rem] sm:max-w-96 hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 bg-gradient-to-br from-white via-blue-50 to-purple-50`} data-testid={`match-card-${match.id}`}>
      <CardHeader className="pb-3 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium opacity-90">
            Mesa {match.tableNumber || 1}
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 font-medium">
            {match.status === 'completed' && '🏆 FINAL'}
            {match.status === 'in_progress' && '🔴 AO VIVO'}
            {match.status === 'scheduled' && '📅 AGENDADA'}
            {match.status === 'bye' && '⤴️ BYE'}
            {match.status === 'pending' && '⏳ PENDENTE'}
          </Badge>
        </div>
        <div className="text-sm font-bold opacity-95 mt-1">
          PARTIDA #{match.matchNumber}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 pb-4">
        <div className="space-y-4">
          
          {/* Jogador 1 - estilo Copa */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 transition-all">
            <AthleteAvatar athleteName={player1Name} athletePhoto={match.player1Photo} />
            <div className="flex-1 min-w-0">
              <div className={`font-bold text-lg truncate ${match.winnerId === match.player1Id ? 'text-green-600' : 'text-gray-800'}`}>
                {player1Name}
              </div>
              {(match.player1City || match.player1State || match.player1Club) && (
                <div className="text-sm text-blue-600 flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {[match.player1City, match.player1State, match.player1Club].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-800 min-w-[4rem] text-center bg-white/80 rounded-full py-1 px-3 shadow">
              {match.status === 'bye' ? '—' : (parsePlayerScores(match).player1Score ?? '—')}
            </div>
          </div>

          {/* VS Central - estilo Copa elegante */}
          <div className="text-center relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-blue-300"></div>
            </div>
            <div className="relative inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold">
              {match.status === 'completed' ? '🏆 RESULTADO' : 
               match.status === 'in_progress' ? '🔴 AO VIVO' : 'VS'}
            </div>
          </div>

          {/* Jogador 2 - estilo Copa */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-150 transition-all">
            <AthleteAvatar athleteName={player2Name} athletePhoto={match.player2Photo} />
            <div className="flex-1 min-w-0">
              <div className={`font-bold text-lg truncate ${match.winnerId === match.player2Id ? 'text-green-600' : 'text-gray-800'}`}>
                {player2Name}
              </div>
              {(match.player2City || match.player2State || match.player2Club) && (
                <div className="text-sm text-red-600 flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">
                    {[match.player2City, match.player2State, match.player2Club].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-800 min-w-[4rem] text-center bg-white/80 rounded-full py-1 px-3 shadow">
              {match.status === 'bye' ? '—' : (parsePlayerScores(match).player2Score ?? '—')}
            </div>
          </div>
          
          {/* Informações da partida */}
          {match.scheduledAt && (
            <div className="text-center pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 flex items-center justify-center gap-1 bg-gray-50 rounded-full px-3 py-1">
                <Clock className="w-3 h-3" />
                {new Date(match.scheduledAt).toLocaleString('pt-BR')}
              </div>
            </div>
          )}

          {/* Troféu do vencedor */}
          {match.winnerId && (
            <div className="text-center pt-2">
              <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full px-4 py-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-bold text-yellow-700">VENCEDOR CONFIRMADO</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente da partida individual - agora usa visual estilo Copa do Mundo
function MatchCard({ match, matches, className = "" }: { 
  match: BracketMatch; 
  matches: BracketMatch[];
  className?: string;
}) {
  // Usar o novo visual estilo Copa do Mundo
  return <WorldCupMatchCard match={match} matches={matches} className={className} />;
}

// Componente principal do Bracket
export default function BracketView({ tournamentId, categoryId, className = "" }: BracketViewProps) {
  const [selectedPhase, setSelectedPhase] = useState<string>(PHASE_GROUP);

  // Flag derivada para mostrar eliminatórias
  const showElims = selectedPhase === PHASE_ELIMS;
  
  // Log limpo
  
  const { data: bracketData, isLoading, error } = useQuery<BracketData>({
    queryKey: [`/api/tournaments/${tournamentId}/categories/${categoryId}/bracket`],
  });

  // Buscar dados dos atletas para obter nomes reais
  const { data: athletes } = useQuery({
    queryKey: ['/api/public/athletes'],
  });

  // Função para obter nome do jogador
  const getPlayerName = (playerId?: string | null) => {
    if (!playerId) return null;
    const athlete = (athletes as any[])?.find((a: any) => a.id === playerId);
    return athlete?.name || null;
  };

  // Normalizar dados do bracket para evitar erros de console
  const normalizedBracketData = bracketData ? {
    ...bracketData,
    group: bracketData.group ?? [],
    round_of_32: bracketData.round_of_32 ?? [],
    round_of_16: bracketData.round_of_16 ?? [],
    quarterfinal: bracketData.quarterfinal ?? [],
    semifinal: bracketData.semifinal ?? [],
    final: bracketData.final ?? [],
    third_place: bracketData.third_place ?? []
  } : null;
  
  // SEMPRE calcular estas variáveis para manter hooks consistentes
  const eliminationPhases: PhaseType[] = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final', 'third_place'];
  const hasGroupData = normalizedBracketData?.group && normalizedBracketData.group.length > 0;
  const hasEliminationData = eliminationPhases.some(phase => 
    normalizedBracketData?.[phase] && normalizedBracketData[phase].length > 0
  );
  
  // Debug removido para limpar console
  
  // Calcular opções do dropdown - SEMPRE chamado
  const phaseOptions: Array<{value: string, label: string}> = [];
  if (hasGroupData) phaseOptions.push({ value: PHASE_GROUP, label: "Fase de Grupos" });
  if (hasEliminationData) phaseOptions.push({ value: PHASE_ELIMS, label: "Eliminatórias" });
  
  // Debug simplificado
  
  // CRÍTICO: Forçar seleção de eliminatórias quando disponível
  useEffect(() => {
    // Se há dados de eliminatórias e ainda estamos em grupos, mudar para eliminatórias
    if (hasEliminationData && selectedPhase === PHASE_GROUP) {
      setSelectedPhase(PHASE_ELIMS);
    }
    // Se só há uma opção disponível, selecionar automaticamente
    else if (phaseOptions.length === 1 && selectedPhase !== phaseOptions[0].value) {
      setSelectedPhase(phaseOptions[0].value);
    }
  }, [hasEliminationData, phaseOptions.length, selectedPhase]);

  // DEPOIS dos hooks, fazer early returns
  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center py-12`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando chaveamento...</p>
        </div>
      </div>
    );
  }

  if (error || !normalizedBracketData) {
    return (
      <div className={`${className} flex items-center justify-center py-12`}>
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Chaveamento não disponível</p>
          <p className="text-sm text-muted-foreground">Gere o chaveamento para visualizá-lo</p>
        </div>
      </div>
    );
  }

  // Processar dados APÓS confirmar que normalizedBracketData existe
  const allMatches: BracketMatch[] = [];
  
  for (const phase of eliminationPhases) {
    if (normalizedBracketData[phase] && Array.isArray(normalizedBracketData[phase])) {
      allMatches.push(...normalizedBracketData[phase]);
    }
  }

  // Verificar se há standings de grupos
  const hasGroupStandings = normalizedBracketData.groupStandings && Array.isArray(normalizedBracketData.groupStandings);

  // Agrupar partidas por fase usando os dados do servidor
  const matchesByPhase = eliminationPhases.reduce((acc, phase) => {
    if (normalizedBracketData[phase] && Array.isArray(normalizedBracketData[phase])) {
      acc[phase] = normalizedBracketData[phase].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    } else {
      acc[phase] = [];
    }
    return acc;
  }, {} as Record<PhaseType, BracketMatch[]>);

  // Filtrar apenas fases que têm partidas
  const availablePhases = eliminationPhases.filter(phase => matchesByPhase[phase].length > 0);

  // Se não há dados de grupos nem eliminatórias, mostrar estado vazio
  if (!hasGroupData && !hasEliminationData) {
    return (
      <div className={`${className} flex items-center justify-center py-12`}>
        <div className="text-center">
          <p className="text-muted-foreground">Nenhuma partida encontrada</p>
          <p className="text-sm text-muted-foreground">Gere o chaveamento para visualizar as partidas</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`} data-testid="bracket-view">
      {/* Dropdown de seleção de fase - CRÍTICO: SEMPRE MOSTRAR QUANDO HÁ ELIMINATÓRIAS */}
      {phaseOptions.some(option => option.value === PHASE_ELIMS) && (
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">Chaveamento</h3>
          <Select value={selectedPhase} onValueChange={(value) => {
            // Log removido
            setSelectedPhase(value);
          }}>
            <SelectTrigger className="w-48" data-testid="select-phase">
              <SelectValue placeholder="Selecione a fase" />
            </SelectTrigger>
            <SelectContent>
              {phaseOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} data-testid={`phase-option-${option.value}`}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Renderização condicional baseada na fase selecionada */}
      {showElims ? (
        <WorldCupBracket tournamentId={tournamentId} categoryId={categoryId} />
      ) : (
        hasGroupData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Fase de Grupos</h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                👥 {normalizedBracketData.group?.length || 0} partidas
              </Badge>
            </div>
            
            {/* Classificação dos grupos */}
            {hasGroupStandings && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Classificação</h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {normalizedBracketData.groupStandings?.map((groupData: any, index: number) => (
                    <Card key={index} className="p-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-center">
                          Grupo {groupData.group}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {groupData.standings.map((player: any, playerIndex: number) => (
                            <div key={player.playerId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <Badge variant={playerIndex < 2 ? "default" : "secondary"} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                                  {player.position}
                                </Badge>
                                <span className="font-medium truncate">{getPlayerName(player.playerId) || `Jogador ${player.playerId.slice(0, 8)}`}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{player.points}pts</div>
                                <div className="text-xs text-muted-foreground">{player.matchesWon}V/{player.matchesPlayed}J</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Partidas da fase de grupos */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Partidas da Fase de Grupos</h4>
              <div className="w-full overflow-x-auto px-2 sm:px-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {normalizedBracketData.group?.map((match: BracketMatch) => (
                    <MatchCard key={match.id} match={match} matches={normalizedBracketData.group || []} className="" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      )}
      
      {/* REMOVIDO: Seção mata-mata que aparecia embaixo do bracket */}

      {/* REMOVIDO: Estatísticas que apareciam embaixo */}
    </div>
  );
}
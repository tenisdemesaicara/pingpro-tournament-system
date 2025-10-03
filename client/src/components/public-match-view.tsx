import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Match, Athlete } from "@shared/schema";
import { useMatchFilters } from "@/hooks/use-match-filters";

interface PublicMatchViewProps {
  tournament: any;
  matches: Match[] | null;
  athletes?: Athlete[];
  getPlayerName: (id: string | number | null) => string | null;
  getPlayerFullInfo: (id: string | number | null) => { name: string; club?: string; city?: string; state?: string } | null;
}

export default function PublicMatchView({ 
  tournament, 
  matches, 
  athletes,
  getPlayerName, 
  getPlayerFullInfo
}: PublicMatchViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("__all");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  
  const { getAvailablePhases, getAvailableGroups, getAvailableRounds } = useMatchFilters(tournament, matches);

  // Debug: Log props
  useEffect(() => {
    console.log('🎮 PublicMatchView props:', {
      tournamentName: tournament?.name,
      categoriesCount: tournament?.categories?.length,
      matchesCount: matches?.length,
      categories: tournament?.categories?.map((c: any) => ({ id: c.id, name: c.name })),
      firstFewMatches: matches?.slice(0, 3).map(m => ({ categoryId: m.categoryId, phase: m.phase }))
    });
  }, [tournament, matches]);

  // Resetar fase quando categoria muda
  useEffect(() => {
    setSelectedPhase("");
    setSelectedGroup("__all");
  }, [selectedCategory]);

  // Filtrar partidas
  const filteredMatches = useMemo(() => {
    if (!matches || !selectedCategory) {
      console.log('❌ Sem matches ou categoria selecionada:', { hasMatches: !!matches, selectedCategory });
      return [];
    }

    const filtered = matches.filter(match => {
      // Normalizar IDs para string antes de comparar
      if (String(match.categoryId) !== String(selectedCategory)) return false;
      if (selectedPhase && match.phase !== selectedPhase) return false;
      if (selectedGroup && selectedGroup !== "__all" && match.groupName !== selectedGroup) return false;
      if (selectedRound != null && match.round !== selectedRound) return false;
      
      return true;
    });
    
    console.log('🎯 Filtros aplicados:', {
      totalMatches: matches.length,
      selectedCategory,
      selectedPhase,
      selectedGroup,
      selectedRound,
      filteredCount: filtered.length,
      sampleMatch: filtered[0] ? { categoryId: filtered[0].categoryId, phase: filtered[0].phase } : null
    });
    
    return filtered;
  }, [matches, selectedCategory, selectedPhase, selectedGroup, selectedRound]);

  // Agrupar partidas por grupo
  const matchesByGroup = useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) return new Map();
    
    const grouped = new Map<string, Match[]>();
    filteredMatches.forEach(match => {
      const group = match.groupName || 'Sem Grupo';
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(match);
    });
    
    return grouped;
  }, [filteredMatches]);

  // Verificar se há jogos completos na categoria selecionada
  const categoryMatches = useMemo(() => {
    if (!matches || !selectedCategory) return [];
    return matches.filter(m => String(m.categoryId) === String(selectedCategory));
  }, [matches, selectedCategory]);

  const hasCompletedMatches = useMemo(() => {
    return categoryMatches.some(m => m.status === 'completed');
  }, [categoryMatches]);

  const allMatchesCompleted = useMemo(() => {
    return categoryMatches.length > 0 && categoryMatches.every(m => m.status === 'completed');
  }, [categoryMatches]);

  // Grupos disponíveis
  const availableGroups = useMemo(() => {
    if (!selectedCategory || !selectedPhase) return [];
    return getAvailableGroups(selectedCategory, selectedPhase);
  }, [selectedCategory, selectedPhase, getAvailableGroups]);

  // Rodadas disponíveis
  const availableRounds = useMemo(() => {
    if (!selectedCategory || !selectedPhase) return [];
    return getAvailableRounds(selectedCategory, selectedPhase, selectedGroup || undefined);
  }, [selectedCategory, selectedPhase, selectedGroup, getAvailableRounds]);

  // Helper function to calculate match results
  const getMatchResults = (match: Match) => {
    const sets = (match.sets ?? []) as Array<{ player1Score: number; player2Score: number }>;
    
    let player1Sets = 0;
    let player2Sets = 0;
    
    sets.forEach(set => {
      if (set.player1Score > set.player2Score) player1Sets++;
      else if (set.player2Score > set.player1Score) player2Sets++;
    });
    
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

  // Renderizar card de partida (baseado na aba Partidas interna)
  const renderMatchCard = (match: Match) => {
    const sets = (match.sets ?? []) as Array<{ player1Score: number; player2Score: number }>;
    
    return (
      <Card key={match.id} className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
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
                      const player = athletes?.find(a => String(a.id) === String(match.player1Id));
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
                        const player = athletes?.find(a => String(a.id) === String(match.player2Id));
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
              </div>

              {/* PARTIDA (DIREITA) */}
              <span>Partida #{match.matchNumber}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Classificação - Aparece quando há jogos completos na categoria */}
      {selectedCategory && hasCompletedMatches && (
        <Card className="bg-white border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 flex items-center gap-3">
              <span className="text-amber-500">🏅</span>
              {allMatchesCompleted ? 'Classificação Final' : 'Classificação Parcial'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="text-amber-500 text-6xl mb-4">🏅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {allMatchesCompleted ? 'Pódio e Classificação Final' : 'Classificação em Andamento'}
            </h3>
            <p className="text-gray-600">
              {allMatchesCompleted
                ? 'A classificação final será exibida aqui após todas as partidas serem concluídas.'
                : 'A classificação parcial será atualizada conforme as partidas forem sendo concluídas.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Categoria */}
        <div>
          <label className="text-sm text-gray-900 mb-2 block font-semibold">Categoria</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-white border-gray-300 text-gray-900 hover:border-blue-500 focus:border-blue-600" data-testid="select-category">
              <SelectValue placeholder="Selecione categoria" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {tournament.categories?.map((category: any) => (
                <SelectItem key={category.id} value={category.id} className="text-gray-900 hover:bg-gray-100">
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fase */}
        {selectedCategory && (
          <div>
            <label className="text-sm text-gray-900 mb-2 block font-semibold">Fase</label>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 hover:border-blue-500 focus:border-blue-600" data-testid="select-phase">
                <SelectValue placeholder="Selecione fase" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {getAvailablePhases(selectedCategory).map((phase) => {
                  const phaseLabels: Record<string, string> = {
                    'group': 'Fase de Grupos',
                    'knockout': 'Eliminatórias',
                    'league': 'Pontos Corridos',
                    'swiss': 'Sistema Suíço',
                    'round_of_32': 'Oitavas de Final',
                    'round_of_16': 'Oitavas de Final',
                    'quarterfinal': 'Quartas de Final',
                    'semifinal': 'Semifinal',
                    'final': 'Final'
                  };
                  
                  return (
                    <SelectItem key={phase} value={phase} className="text-gray-900 hover:bg-gray-100">
                      {phaseLabels[phase] || phase}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Grupo */}
        {availableGroups.length > 0 && (
          <div>
            <label className="text-sm text-gray-900 mb-2 block font-semibold">Grupo</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 hover:border-blue-500 focus:border-blue-600" data-testid="select-group">
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="__all" className="text-gray-900 hover:bg-gray-100">Todos os Grupos</SelectItem>
                {availableGroups.map((group) => (
                  <SelectItem key={group} value={group} className="text-gray-900 hover:bg-gray-100">
                    Grupo {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Lista de Partidas */}
      {filteredMatches && filteredMatches.length > 0 ? (
        <div className="space-y-4">
          {selectedPhase === 'group' && matchesByGroup.size > 0 ? (
            // VISUALIZAÇÃO POR GRUPOS - FASE DE GRUPOS
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Partidas por Grupo</h3>
              {Array.from(matchesByGroup.keys()).sort().map(group => (
                <div key={group} className="space-y-3">
                  <h4 className="text-md font-medium bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow-sm">
                    📊 Grupo {group}
                  </h4>
                  <div className="grid gap-3">
                    {matchesByGroup.get(group)!.map((match: Match) => renderMatchCard(match))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // VISUALIZAÇÃO ÚNICA - OUTRAS FASES
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Partidas do Torneio</h3>
              <div className="grid gap-4">
                {filteredMatches.map(match => renderMatchCard(match))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Mensagem quando NÃO há categoria selecionada */}
      {!selectedCategory && (
        <div className="text-center py-12 px-4">
          <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
            <p className="text-gray-900 text-lg font-semibold mb-2">📋 Selecione uma Categoria</p>
            <p className="text-gray-600">
              Escolha a categoria acima para começar a visualizar as partidas.
            </p>
          </div>
        </div>
      )}

      {/* Mensagem quando precisa selecionar fase */}
      {selectedCategory && !selectedPhase && (
        <div className="text-center py-12 px-4">
          <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
            <p className="text-gray-900 text-lg font-semibold mb-2">🎯 Selecione uma Fase</p>
            <p className="text-gray-600">
              Escolha a fase acima para visualizar as partidas e resultados.
            </p>
          </div>
        </div>
      )}

      {/* Sem partidas após filtros */}
      {(!filteredMatches || filteredMatches.length === 0) && selectedCategory && selectedPhase && (
        <div className="text-center py-12">
          <p className="text-gray-600">Nenhuma partida encontrada para os filtros selecionados.</p>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type Match, type Athlete } from "@shared/schema";

interface PublicMatchDisplayProps {
  tournament: any;
  matches: Match[];
  athletes: Athlete[];
}

export default function PublicMatchDisplay({ tournament, matches, athletes }: PublicMatchDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const getPlayerName = (playerId: string | number | null): string => {
    if (!playerId) return "BYE";
    
    const participant = tournament.participants?.find((p: any) => 
      String(p.id) === String(playerId) || String(p.athleteId) === String(playerId)
    );
    
    return participant?.name || participant?.athleteName || "Desconhecido";
  };

  // Filtrar partidas
  const filteredMatches = useMemo(() => {
    let filtered = matches;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(m => String(m.categoryId) === selectedCategory);
    }

    if (selectedPhase !== "all") {
      filtered = filtered.filter(m => m.phase === selectedPhase);
    }

    if (selectedGroup !== "all") {
      filtered = filtered.filter(m => m.groupName === selectedGroup);
    }

    return filtered.sort((a, b) => {
      if (a.round && b.round) return a.round - b.round;
      return 0;
    });
  }, [matches, selectedCategory, selectedPhase, selectedGroup]);

  // Obter fases disponíveis
  const availablePhases = useMemo(() => {
    const phases = Array.from(new Set(matches.map(m => m.phase).filter(Boolean)));
    return phases;
  }, [matches]);

  // Obter grupos disponíveis
  const availableGroups = useMemo(() => {
    let groupMatches = matches;
    if (selectedCategory !== "all") {
      groupMatches = groupMatches.filter(m => String(m.categoryId) === selectedCategory);
    }
    if (selectedPhase !== "all") {
      groupMatches = groupMatches.filter(m => m.phase === selectedPhase);
    }
    
    const groups = Array.from(new Set(groupMatches.map(m => m.groupName).filter(Boolean))) as string[];
    return groups.sort();
  }, [matches, selectedCategory, selectedPhase]);

  // Calcular scores a partir dos sets
  const getScores = (match: Match) => {
    const sets = (match.sets as any) || [];
    if (!Array.isArray(sets) || sets.length === 0) {
      return { player1Score: 0, player2Score: 0 };
    }

    let player1Score = 0;
    let player2Score = 0;

    sets.forEach((set: any) => {
      if (set.player1Score > set.player2Score) {
        player1Score++;
      } else if (set.player2Score > set.player1Score) {
        player2Score++;
      }
    });

    return { player1Score, player2Score };
  };

  // Calcular pódio por categoria
  const getPodiumByCategory = (categoryId: string) => {
    const categoryMatches = matches.filter(m => String(m.categoryId) === categoryId);
    const completedMatches = categoryMatches.filter(m => m.status === 'completed');
    
    if (completedMatches.length === 0) return [];

    const playerStats: Record<string, { wins: number; losses: number; points: number }> = {};
    
    completedMatches.forEach(match => {
      const p1Id = String(match.player1Id);
      const p2Id = String(match.player2Id);
      
      if (!playerStats[p1Id]) playerStats[p1Id] = { wins: 0, losses: 0, points: 0 };
      if (!playerStats[p2Id]) playerStats[p2Id] = { wins: 0, losses: 0, points: 0 };
      
      if (match.winnerId) {
        const winnerId = String(match.winnerId);
        const loserId = winnerId === p1Id ? p2Id : p1Id;
        
        playerStats[winnerId].wins++;
        playerStats[winnerId].points += 3;
        playerStats[loserId].losses++;
      }
    });

    const rankings = Object.entries(playerStats)
      .map(([playerId, stats]) => ({
        playerId,
        name: getPlayerName(playerId),
        ...stats
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });

    return rankings.slice(0, 3);
  };

  return (
    <div className="space-y-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl text-white flex items-center gap-3">
          <Trophy className="w-6 h-6 text-purple-400" />
          Partidas e Resultados
        </CardTitle>
      </CardHeader>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6">
        <div>
          <label className="text-sm text-white/70 mb-2 block">Categoria</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all" className="text-white">Todas</SelectItem>
              {tournament.categories?.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id} className="text-white">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availablePhases.length > 1 && (
          <div>
            <label className="text-sm text-white/70 mb-2 block">Fase</label>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-phase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-white">Todas</SelectItem>
                <SelectItem value="group" className="text-white">Grupos</SelectItem>
                <SelectItem value="knockout" className="text-white">Eliminatória</SelectItem>
                <SelectItem value="league" className="text-white">Liga</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {availableGroups.length > 0 && (
          <div>
            <label className="text-sm text-white/70 mb-2 block">Grupo</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-white">Todos</SelectItem>
                {availableGroups.map(group => (
                  <SelectItem key={group} value={group} className="text-white">
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Lista de Partidas */}
      <CardContent className="px-6">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            Nenhuma partida encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatches.map((match) => {
              const player1Name = getPlayerName(match.player1Id);
              const player2Name = getPlayerName(match.player2Id);
              const isCompleted = match.status === 'completed';
              const isInProgress = match.status === 'in_progress';
              const scores = getScores(match);
              const sets = (match.sets as any) || [];

              return (
                <Card key={match.id} className={`
                  ${isCompleted ? 'bg-green-500/10 border-green-400/30' : 
                    isInProgress ? 'bg-blue-500/10 border-blue-400/30' : 
                    'bg-white/5 border-white/10'}
                  backdrop-blur-lg
                `} data-testid={`match-${match.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/60">
                        {match.phase === 'group' && match.groupName ? match.groupName : ''}
                        {match.phase === 'knockout' ? 'Eliminatória' : ''}
                        {match.round ? ` - Rodada ${match.round}` : ''}
                      </span>
                      <Badge variant={isCompleted ? "default" : "outline"} 
                             className={`text-xs ${
                               isCompleted ? 'bg-green-500/20 text-green-300 border-green-400/30' : 
                               isInProgress ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' : 
                               'bg-white/10 text-white/70 border-white/20'
                             }`}>
                        {isCompleted ? 'Finalizada' : isInProgress ? 'Em Andamento' : 'Agendada'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className={`flex items-center justify-between p-3 rounded ${
                        match.winnerId && String(match.winnerId) === String(match.player1Id) 
                          ? 'bg-green-500/20 border border-green-400/30' 
                          : 'bg-white/5'
                      }`}>
                        <span className="text-white font-medium">{player1Name}</span>
                        <span className="text-2xl font-bold text-white">
                          {isCompleted || isInProgress ? scores.player1Score : '-'}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded ${
                        match.winnerId && String(match.winnerId) === String(match.player2Id) 
                          ? 'bg-green-500/20 border border-green-400/30' 
                          : 'bg-white/5'
                      }`}>
                        <span className="text-white font-medium">{player2Name}</span>
                        <span className="text-2xl font-bold text-white">
                          {isCompleted || isInProgress ? scores.player2Score : '-'}
                        </span>
                      </div>
                    </div>

                    {Array.isArray(sets) && sets.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex gap-2 justify-center flex-wrap">
                          {sets.map((set: any, index: number) => (
                            <div key={index} className="text-center px-3 py-1 bg-white/5 rounded">
                              <div className="text-xs text-white/60 mb-1">Set {index + 1}</div>
                              <div className="text-sm text-white font-medium">
                                {set.player1Score} - {set.player2Score}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Pódio por Categoria */}
      {tournament.categories?.map((category: any) => {
        const podium = getPodiumByCategory(category.id);
        if (podium.length === 0) return null;

        return (
          <Card key={category.id} className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-400/30 mx-6">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Pódio - {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {podium.map((player, index) => (
                  <div key={player.playerId} className={`
                    p-4 rounded-lg text-center
                    ${index === 0 ? 'bg-yellow-500/20 border-2 border-yellow-400' : 
                      index === 1 ? 'bg-gray-400/20 border-2 border-gray-300' : 
                      'bg-orange-600/20 border-2 border-orange-400'}
                  `} data-testid={`podium-${category.id}-${index + 1}`}>
                    <div className="text-4xl mb-2">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="text-lg font-bold text-white mb-1">
                      {player.name}
                    </div>
                    <div className="text-sm text-white/70">
                      {player.wins}V - {player.losses}D ({player.points} pts)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

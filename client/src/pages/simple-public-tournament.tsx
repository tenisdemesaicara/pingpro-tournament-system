import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Calendar, MapPin, Users } from "lucide-react";
import type { Match, Athlete } from "@shared/schema";

export default function SimplePublicTournament() {
  const { id } = useParams() as { id: string };

  // Buscar torneio
  const { data: tournament, isLoading: loadingTournament } = useQuery({
    queryKey: ['/api/public/tournaments', id],
    enabled: !!id
  });

  // Buscar partidas
  const { data: matches, isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['/api/public/tournaments', id, 'matches'],
    enabled: !!id
  });

  // Buscar atletas
  const { data: athletes } = useQuery<Athlete[]>({
    queryKey: ['/api/public/athletes']
  });

  const tournamentData = tournament as any;
  const matchesData = matches || [];

  if (loadingTournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Carregando torneio...</p>
        </div>
      </div>
    );
  }

  if (!tournamentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-red-900 flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Torneio não encontrado</h2>
            <p className="text-white/70">O torneio que você procura não existe.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPlayerName = (playerId: string | number | null): string => {
    if (!playerId) return "A definir";
    const athlete = athletes?.find(a => String(a.id) === String(playerId));
    return athlete?.name || `Atleta ${playerId}`;
  };

  const getPlayerPhoto = (playerId: string | number | null): string | null => {
    if (!playerId) return null;
    const athlete = athletes?.find(a => String(a.id) === String(playerId));
    return athlete?.photoUrl || null;
  };

  const getMatchWinner = (match: Match): number | null => {
    if (match.status !== 'completed' || !match.sets || !Array.isArray(match.sets)) return null;
    
    let player1Sets = 0;
    let player2Sets = 0;
    
    (match.sets as Array<{ player1Score: number; player2Score: number }>).forEach(set => {
      if (set.player1Score > set.player2Score) player1Sets++;
      else if (set.player2Score > set.player1Score) player2Sets++;
    });
    
    if (player1Sets > player2Sets) return 1;
    if (player2Sets > player1Sets) return 2;
    return null;
  };

  // Agrupar partidas por fase
  const matchesByPhase = matchesData.reduce((acc, match) => {
    const phase = match.phase || 'other';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const phaseNames: Record<string, string> = {
    'group': 'Fase de Grupos',
    'knockout': 'Eliminatórias',
    'semifinal': 'Semifinais',
    'final': 'Final',
    'other': 'Outras Partidas'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header do Torneio */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
          <CardContent className="p-8 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-4">{tournamentData.name}</h1>
            
            <div className="flex flex-wrap justify-center gap-4 text-white/80">
              {tournamentData.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(tournamentData.startDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {tournamentData.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{tournamentData.location}</span>
                </div>
              )}
              {tournamentData.participants && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{tournamentData.participants.length} participantes</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                {tournamentData.status === 'in_progress' && 'Em Andamento'}
                {tournamentData.status === 'completed' && 'Finalizado'}
                {tournamentData.status === 'paused' && 'Pausado'}
                {tournamentData.status === 'draft' && 'Rascunho'}
                {tournamentData.status === 'registration_open' && 'Inscrições Abertas'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Partidas */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-white text-center mb-6">
            🏓 Partidas e Resultados
          </h2>

          {loadingMatches ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">Carregando partidas...</p>
              </CardContent>
            </Card>
          ) : matchesData.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhuma partida ainda</h3>
                <p className="text-white/70">As partidas serão exibidas quando o torneio começar.</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(matchesByPhase).map(([phase, phaseMatches]) => (
              <div key={phase} className="space-y-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  {phaseNames[phase] || phase}
                </h3>

                <div className="grid gap-4">
                  {phaseMatches.map((match) => {
                    const winner = getMatchWinner(match);
                    const sets = (match.sets || []) as Array<{ player1Score: number; player2Score: number }>;

                    return (
                      <Card key={match.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-gray-500">Mesa {match.tableNumber || 1}</span>
                            <Badge className={
                              match.status === 'completed' ? 'bg-green-100 text-green-800' :
                              match.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {match.status === 'completed' ? 'Finalizada' :
                               match.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                            </Badge>
                          </div>

                          {/* Jogadores */}
                          <div className="space-y-3">
                            {/* Jogador 1 */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  {getPlayerPhoto(match.player1Id) ? (
                                    <AvatarImage src={getPlayerPhoto(match.player1Id)!} alt="Jogador 1" />
                                  ) : null}
                                  <AvatarFallback className="bg-blue-500 text-white">
                                    {getPlayerName(match.player1Id).charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-gray-900">
                                  {getPlayerName(match.player1Id)}
                                </span>
                              </div>
                              {match.status === 'completed' && sets.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-gray-900">
                                    {sets.filter(s => s.player1Score > s.player2Score).length}
                                  </span>
                                  {winner === 1 && <span className="text-2xl">🏆</span>}
                                </div>
                              )}
                            </div>

                            {/* VS */}
                            <div className="text-center text-sm font-semibold text-gray-500">VS</div>

                            {/* Jogador 2 */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  {match.player2Id && getPlayerPhoto(match.player2Id) ? (
                                    <AvatarImage src={getPlayerPhoto(match.player2Id)!} alt="Jogador 2" />
                                  ) : null}
                                  <AvatarFallback className="bg-green-500 text-white">
                                    {match.player2Id ? getPlayerName(match.player2Id).charAt(0) : '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-gray-900">
                                  {match.player2Id ? getPlayerName(match.player2Id) : '🚫 BYE'}
                                </span>
                              </div>
                              {match.status === 'completed' && sets.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-gray-900">
                                    {sets.filter(s => s.player2Score > s.player1Score).length}
                                  </span>
                                  {winner === 2 && <span className="text-2xl">🏆</span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Placar por sets */}
                          {match.status === 'completed' && sets.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex flex-wrap gap-2 justify-center">
                                {sets.map((set, idx) => (
                                  <div key={idx} className="flex gap-1">
                                    <Badge className="bg-orange-500 text-white">
                                      {set.player1Score}
                                    </Badge>
                                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                                      {set.player2Score}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {match.groupName && (
                            <div className="mt-3 text-center">
                              <Badge variant="outline">Grupo {match.groupName}</Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mt-8">
          <CardContent className="p-6 text-center text-white/70">
            <p>PingPong Pro - Sistema de Gerenciamento de Torneios</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

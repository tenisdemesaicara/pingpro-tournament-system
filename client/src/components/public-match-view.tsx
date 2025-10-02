import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import type { Match } from "@shared/schema";
import { useMatchFilters } from "@/hooks/use-match-filters";

interface PublicMatchViewProps {
  tournament: any;
  matches: Match[] | null;
  getPlayerName: (id: string | number | null) => string | null;
  getPlayerFullInfo: (id: string | number | null) => { name: string; club?: string; city?: string; state?: string } | null;
}

export default function PublicMatchView({ 
  tournament, 
  matches, 
  getPlayerName, 
  getPlayerFullInfo
}: PublicMatchViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  
  const { isMixedCategory, getAvailablePhases, getAvailableGroups, getAvailableRounds } = useMatchFilters(tournament, matches);

  // Auto-selecionar primeira categoria
  useEffect(() => {
    if (!selectedCategory && tournament.categories && tournament.categories.length > 0) {
      const firstCategory = tournament.categories[0];
      setSelectedCategory(firstCategory.id);
    }
  }, [tournament.categories, selectedCategory]);

  // Auto-selecionar fase se houver apenas uma
  useEffect(() => {
    if (!selectedCategory) return;
    
    const phases = getAvailablePhases(selectedCategory);
    if (phases.length === 1 && !selectedPhase) {
      setSelectedPhase(phases[0]);
    } else if (phases.length > 0 && !selectedPhase) {
      setSelectedPhase(phases[0]);
    }
  }, [selectedCategory]);

  // Filtrar partidas
  const filteredMatches = useMemo(() => {
    if (!matches || !selectedCategory) return [];

    return matches.filter(match => {
      if (match.categoryId !== selectedCategory) return false;
      if (selectedPhase && match.phase !== selectedPhase) return false;
      if (selectedGroup && match.groupName !== selectedGroup) return false;
      if (selectedRound != null && match.round !== selectedRound) return false;
      
      // Filtro de gênero
      if (selectedGender && selectedGender !== 'all') {
        const category = tournament.categories?.find((c: any) => c.id === match.categoryId);
        const categoryName = category?.name?.toLowerCase() || '';
        
        if (selectedGender === 'masculino') {
          if (!categoryName.includes('masculino') && !categoryName.includes('masc')) return false;
        } else if (selectedGender === 'feminino') {
          if (!categoryName.includes('feminino') && !categoryName.includes('fem')) return false;
        }
      }
      
      return true;
    });
  }, [matches, selectedCategory, selectedPhase, selectedGroup, selectedRound, selectedGender, tournament.categories]);

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

  // Verificar se categoria é mista
  const isMixed = selectedCategory ? isMixedCategory(selectedCategory) : false;

  // Renderizar placar de partida
  const renderMatchScore = (match: Match) => {
    const player1Name = getPlayerName(match.player1Id);
    const player2Name = getPlayerName(match.player2Id);
    const player1Info = getPlayerFullInfo(match.player1Id);
    const player2Info = getPlayerFullInfo(match.player2Id);

    const isCompleted = match.status === 'completed';
    const hasWinner = match.winnerId != null;
    
    // Parse do score
    let player1Score = 0;
    let player2Score = 0;
    if (match.score) {
      const parts = match.score.split('-');
      if (parts.length === 2) {
        player1Score = parseInt(parts[0]) || 0;
        player2Score = parseInt(parts[1]) || 0;
      }
    }
    
    // Parse dos sets
    const matchSets = (match.sets as any) || [];

    return (
      <Card key={match.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Player 1 */}
            <div className="flex-1 flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-white/20">
                <AvatarImage src={player1Info?.name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${player1Info.name}` : undefined} />
                <AvatarFallback className="bg-purple-500 text-white">
                  {player1Name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${hasWinner && match.winnerId === match.player1Id ? 'text-yellow-400' : 'text-white'}`}>
                    {player1Name || 'Aguardando'}
                  </span>
                  {hasWinner && match.winnerId === match.player1Id && (
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                {player1Info?.club && (
                  <div className="text-xs text-white/50">{player1Info.club}</div>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="px-6">
              {isCompleted ? (
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${hasWinner && match.winnerId === match.player1Id ? 'text-yellow-400' : 'text-white'}`}>
                    {player1Score}
                  </span>
                  <span className="text-white/50">×</span>
                  <span className={`text-2xl font-bold ${hasWinner && match.winnerId === match.player2Id ? 'text-yellow-400' : 'text-white'}`}>
                    {player2Score}
                  </span>
                </div>
              ) : (
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                  Aguardando
                </Badge>
              )}
            </div>

            {/* Player 2 */}
            <div className="flex-1 flex items-center gap-3 flex-row-reverse">
              <Avatar className="w-10 h-10 border-2 border-white/20">
                <AvatarImage src={player2Info?.name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${player2Info.name}` : undefined} />
                <AvatarFallback className="bg-blue-500 text-white">
                  {player2Name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-2 justify-end">
                  {hasWinner && match.winnerId === match.player2Id && (
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={`font-semibold ${hasWinner && match.winnerId === match.player2Id ? 'text-yellow-400' : 'text-white'}`}>
                    {player2Name || 'Aguardando'}
                  </span>
                </div>
                {player2Info?.club && (
                  <div className="text-xs text-white/50">{player2Info.club}</div>
                )}
              </div>
            </div>
          </div>

          {/* Sets detalhados */}
          {matchSets && matchSets.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex gap-2 justify-center">
                {matchSets.map((set: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1 text-sm">
                    <span className={set.player1Score > set.player2Score ? 'text-yellow-400 font-bold' : 'text-white/70'}>
                      {set.player1Score}
                    </span>
                    <span className="text-white/50">-</span>
                    <span className={set.player2Score > set.player1Score ? 'text-yellow-400 font-bold' : 'text-white/70'}>
                      {set.player2Score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Categoria */}
        <div>
          <label className="text-sm text-white/70 mb-2 block">Categoria</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-category">
              <SelectValue placeholder="Selecione categoria" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {tournament.categories?.map((category: any) => (
                <SelectItem key={category.id} value={category.id} className="text-white hover:bg-gray-800">
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fase */}
        {selectedCategory && (
          <div>
            <label className="text-sm text-white/70 mb-2 block">Fase</label>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-phase">
                <SelectValue placeholder="Selecione fase" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {getAvailablePhases(selectedCategory).map((phase) => (
                  <SelectItem key={phase} value={phase} className="text-white hover:bg-gray-800">
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Grupo */}
        {availableGroups.length > 0 && (
          <div>
            <label className="text-sm text-white/70 mb-2 block">Grupo</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-group">
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="" className="text-white hover:bg-gray-800">Todos os Grupos</SelectItem>
                {availableGroups.map((group) => (
                  <SelectItem key={group} value={group} className="text-white hover:bg-gray-800">
                    Grupo {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Gênero (apenas se não for mista) */}
        {!isMixed && (
          <div>
            <label className="text-sm text-white/70 mb-2 block">Gênero</label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-gender">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all" className="text-white hover:bg-gray-800">Todos</SelectItem>
                <SelectItem value="masculino" className="text-white hover:bg-gray-800">Masculino</SelectItem>
                <SelectItem value="feminino" className="text-white hover:bg-gray-800">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Lista de Partidas */}
      <div className="space-y-3">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(match => renderMatchScore(match))
        ) : selectedCategory ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <div className="text-white/60">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-semibold mb-2">Nenhuma partida encontrada</p>
                <p className="text-sm">Selecione outros filtros ou aguarde o início do torneio.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <div className="text-white/60">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-semibold">Selecione uma categoria para ver as partidas</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

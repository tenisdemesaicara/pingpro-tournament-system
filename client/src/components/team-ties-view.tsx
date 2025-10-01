import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Users, Trophy, Clock } from "lucide-react";

interface TeamTiesViewProps {
  tournamentId: string;
  categoryId: string;
}

interface TeamTie {
  id: string;
  tournamentId: string;
  categoryId: string;
  phase: string;
  round: number;
  tieNumber: number;
  team1Id: string;
  team2Id: string;
  status: string;
  team1Points: number;
  team2Points: number;
  maxBoards: number;
  pointsPerWin: number;
  winnerTeamId?: string;
  scheduledAt?: string;
  completedAt?: string;
  notes?: string;
}

interface Team {
  id: string;
  name: string;
  club?: string;
  notes?: string;
}

interface Match {
  id: string;
  tournamentId: string;
  categoryId: string;
  round: number;
  matchNumber: number;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  score?: string;
  status: string;
  phase: string;
  tieId?: string;
  bestOfSets: number;
}

interface TieWithDetails extends TeamTie {
  team1: Team;
  team2: Team;
  matches: Match[];
}

export default function TeamTiesView({ tournamentId, categoryId }: TeamTiesViewProps) {
  const [expandedTies, setExpandedTies] = useState<Set<string>>(new Set());

  // Buscar confrontos entre equipes
  const { data: ties = [], isLoading } = useQuery<TieWithDetails[]>({
    queryKey: ["/api/tournaments", tournamentId, "categories", categoryId, "ties"],
    queryFn: async () => {
      const response = await fetch(`/api/tournaments/${tournamentId}/ties?categoryId=${categoryId}`);
      if (!response.ok) throw new Error("Failed to fetch ties");
      return response.json();
    },
  });

  const toggleTieExpansion = (tieId: string) => {
    const newExpanded = new Set(expandedTies);
    if (newExpanded.has(tieId)) {
      newExpanded.delete(tieId);
    } else {
      newExpanded.add(tieId);
    }
    setExpandedTies(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Em Andamento</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Finalizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-xs">Pendente</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Em Andamento</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Finalizada</Badge>;
      case "walkover":
        return <Badge variant="outline" className="text-xs bg-red-50 text-red-700">W.O.</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const calculateProgress = (tie: TieWithDetails) => {
    const completedMatches = tie.matches.filter(m => m.status === "completed").length;
    const totalMatches = tie.matches.length;
    return totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando confrontos entre equipes...</p>
        </CardContent>
      </Card>
    );
  }

  if (ties.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum confronto entre equipes foi gerado ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Confrontos Entre Equipes</h3>
        <Badge variant="outline">{ties.length} confrontos</Badge>
      </div>

      {ties.map((tie) => {
        const isExpanded = expandedTies.has(tie.id);
        const progress = calculateProgress(tie);
        
        return (
          <Card key={tie.id} className="overflow-hidden">
            <Collapsible 
              open={isExpanded} 
              onOpenChange={() => toggleTieExpansion(tie.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {tie.phase === "group" ? `Grupo ${tie.round}` : `${tie.phase} - Round ${tie.round}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-auto p-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(tie.status)}
                      {tie.scheduledAt && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(tie.scheduledAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-lg">
                      <div className="text-center">
                        <div className="font-semibold">{tie.team1.name}</div>
                        <div className="text-sm text-muted-foreground">{tie.team1.club}</div>
                      </div>
                      
                      <div className="flex items-center gap-2 px-4">
                        <div className="text-2xl font-bold">{tie.team1Points}</div>
                        <div className="text-muted-foreground">vs</div>
                        <div className="text-2xl font-bold">{tie.team2Points}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-semibold">{tie.team2.name}</div>
                        <div className="text-sm text-muted-foreground">{tie.team2.club}</div>
                      </div>
                    </div>
                    
                    {tie.winnerTeamId && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Trophy className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {tie.winnerTeamId === tie.team1Id ? tie.team1.name : tie.team2.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Barra de progresso */}
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    {Math.round(progress)}% concluído ({tie.matches.filter(m => m.status === "completed").length}/{tie.matches.length} partidas)
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Partidas Individuais</h4>
                    
                    <div className="space-y-2">
                      {tie.matches.map((match, index) => (
                        <div 
                          key={match.id} 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">Tabuleiro {index + 1}</div>
                            <div className="text-sm text-muted-foreground">
                              Melhor de {match.bestOfSets}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              {match.player1Id ? "Jogador 1" : "A definir"} 
                              {match.score && (
                                <span className="font-medium ml-2">{match.score}</span>
                              )}
                              {match.player2Id ? " vs Jogador 2" : " vs A definir"}
                            </div>
                            {getMatchStatusBadge(match.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {tie.notes && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium mb-1">Observações</div>
                        <div className="text-sm text-muted-foreground">{tie.notes}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
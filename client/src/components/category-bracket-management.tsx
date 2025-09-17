import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type TournamentWithParticipants, type Category, type Match } from "@shared/schema";
import BracketView from "./bracket-view";

interface CategoryBracketManagementProps {
  tournament: TournamentWithParticipants;
}

interface CategoryWithStats extends Category {
  participantCount: number;
  matchCount: number;
  hasCompleteDraws: boolean;
  format?: string;
}

export default function CategoryBracketManagement({ tournament }: CategoryBracketManagementProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [groupConfig, setGroupConfig] = useState({
    numGroups: 2,
    advancesPerGroup: 2,
    bestOfSets: 3
  });

  // Buscar categorias do torneio com estatísticas
  const { data: categoriesWithStats, isLoading } = useQuery<CategoryWithStats[]>({
    queryKey: ['/api/tournaments', tournament.id, 'categories-stats'],
  });

  // Buscar partidas por categoria (com nomes dos jogadores)
  const { data: categoryMatches } = useQuery<any[]>({
    queryKey: ['/api/tournaments', tournament.id, 'category-matches', selectedCategory],
    queryFn: () => selectedCategory ? 
      fetch(`/api/tournaments/${tournament.id}/category-matches/${selectedCategory}`)
        .then(res => res.json()) : [],
    enabled: !!selectedCategory,
  });

  // Mutation para gerar chaveamento automático por categoria
  const generateCategoryBracketMutation = useMutation({
    mutationFn: (data: { categoryId: string; method: 'auto' | 'manual'; groupConfig?: any }) => 
      apiRequest('POST', `/api/tournaments/${tournament.id}/categories/${data.categoryId}/generate-bracket`, {
        method: data.method,
        groupConfig: data.groupConfig
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournament.id, 'categories-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournament.id, 'category-matches', variables.categoryId] });
      toast({
        title: "Chaveamento Gerado!",
        description: "O chaveamento da categoria foi criado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao gerar chaveamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o chaveamento. Verifique se há participantes suficientes.",
        variant: "destructive",
      });
    }
  });

  const getCategoryStatusBadge = (category: CategoryWithStats) => {
    if (category.matchCount > 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">✓ Chaveamento OK</Badge>;
    } else if (category.participantCount < 2) {
      return <Badge variant="outline" className="text-gray-500">Poucos participantes</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">⚠ Falta chaveamento</Badge>;
    }
  };

  const allCategoriesReady = categoriesWithStats?.every(cat => cat.hasCompleteDraws) || false;

  if (isLoading) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <span className="material-icons text-4xl mb-4 block animate-spin">hourglass_empty</span>
        <p>Carregando categorias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-icons text-blue-500">category</span>
            Status das Categorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
              <div>
                <h3 className="font-semibold">
                  {allCategoriesReady ? '🎉 Todas as categorias estão prontas!' : '⚠️ Algumas categorias precisam de chaveamento'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {categoriesWithStats?.filter(c => c.hasCompleteDraws).length || 0} de {categoriesWithStats?.length || 0} categorias têm chaveamento completo
                </p>
              </div>
              <Badge variant={allCategoriesReady ? "default" : "secondary"} className={allCategoriesReady ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                {allCategoriesReady ? 'Pronto para Iniciar' : 'Requer Ação'}
              </Badge>
            </div>

            {/* Lista de categorias */}
            <div className="grid gap-3">
              {categoriesWithStats?.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium">{category.name}</h4>
                      {getCategoryStatusBadge(category)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>👥 {category.participantCount} participantes</span>
                      <span>⚡ {category.matchCount} partidas</span>
                      {category.description && <span>📝 {category.description}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {category.participantCount >= 2 && category.matchCount === 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateCategoryBracketMutation.mutate({ categoryId: category.id, method: 'auto' })}
                          disabled={generateCategoryBracketMutation.isPending}
                          data-testid={`button-auto-bracket-${category.id}`}
                        >
                          <span className="material-icons text-sm mr-1">shuffle</span>
                          Sorteio Automático
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCategory(category.id)}
                          data-testid={`button-manual-bracket-${category.id}`}
                        >
                          <span className="material-icons text-sm mr-1">edit</span>
                          Sorteio Manual
                        </Button>
                      </>
                    )}
                    {category.matchCount > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCategory(category.id)}
                          data-testid={`button-view-bracket-${category.id}`}
                        >
                          <span className="material-icons text-sm mr-1">visibility</span>
                          Ver Chaveamento
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Permitir alterar - backend irá validar se possível
                            setSelectedCategory(category.id);
                          }}
                          data-testid={`button-modify-bracket-${category.id}`}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <span className="material-icons text-sm mr-1">edit</span>
                          Alterar Chaveamento
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal/Detalhes da categoria selecionada */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Chaveamento - {categoriesWithStats?.find(c => c.id === selectedCategory)?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                ✕ Fechar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryMatches && categoryMatches.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold">Partidas da Categoria</h4>
                  {categoryMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Partida {match.matchNumber}</span>
                        <span className="text-muted-foreground">Round {match.round}</span>
                        {match.phase === 'group' && match.groupName && (
                          <Badge variant="outline">Grupo {match.groupName}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {match.player1Name || 'Jogador 1'}
                        </span>
                        <span className="font-bold">VS</span>
                        <span className="text-sm">
                          {match.player2Id ? (match.player2Name || 'Jogador 2') : '🚫 BYE'}
                        </span>
                      </div>
                      <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                        {match.status === 'completed' ? 'Finalizada' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const category = categoriesWithStats?.find(c => c.id === selectedCategory);
                    if (!category) return null;
                    
                    const isGroupStageKnockout = category.format === 'group_stage_knockout' || 
                      (tournament.format === 'group_stage_knockout' && !category.format);
                    
                    if (isGroupStageKnockout) {
                      const maxGroups = Math.min(6, Math.floor(category.participantCount / 2));
                      const maxAdvances = Math.min(4, Math.floor(category.participantCount / 2));
                      
                      return (
                        <div className="space-y-6">
                          <div className="text-center">
                            <span className="material-icons text-4xl mb-4 block text-blue-500">group</span>
                            <h4 className="text-lg font-semibold mb-2">Configurar Grupos + Mata-mata</h4>
                            <p className="text-sm text-muted-foreground">
                              Participantes: {category.participantCount} atletas
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-2">
                              <Label htmlFor="num-groups">Número de Grupos</Label>
                              <Select 
                                value={groupConfig.numGroups.toString()} 
                                onValueChange={(value) => setGroupConfig(prev => ({...prev, numGroups: parseInt(value)}))}
                              >
                                <SelectTrigger data-testid="select-num-groups">
                                  <SelectValue placeholder="Grupos" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({length: maxGroups - 1}, (_, i) => i + 2).map(num => (
                                    <SelectItem key={num} value={num.toString()}>
                                      {num} grupos ({Math.ceil(category.participantCount / num)}-{Math.floor(category.participantCount / num + 1)} por grupo)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="advances-per-group">Classificados por Grupo</Label>
                              <Select 
                                value={groupConfig.advancesPerGroup.toString()} 
                                onValueChange={(value) => setGroupConfig(prev => ({...prev, advancesPerGroup: parseInt(value)}))}
                              >
                                <SelectTrigger data-testid="select-advances-per-group">
                                  <SelectValue placeholder="Avançam" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({length: maxAdvances}, (_, i) => i + 1).map(num => (
                                    <SelectItem key={num} value={num.toString()}>
                                      Top {num} {num === 1 ? 'avança' : 'avançam'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="best-of-sets">Melhor de X Sets</Label>
                              <Select 
                                value={groupConfig.bestOfSets.toString()} 
                                onValueChange={(value) => setGroupConfig(prev => ({...prev, bestOfSets: parseInt(value)}))}
                              >
                                <SelectTrigger data-testid="select-best-of-sets">
                                  <SelectValue placeholder="Sets" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">Melhor de 3 sets</SelectItem>
                                  <SelectItem value="5">Melhor de 5 sets</SelectItem>
                                  <SelectItem value="7">Melhor de 7 sets</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-blue-800 mb-2">Resumo da Configuração:</h5>
                            <ul className="text-sm text-blue-700 space-y-1">
                              <li>• {groupConfig.numGroups} grupos com ~{Math.ceil(category.participantCount / groupConfig.numGroups)} atletas cada</li>
                              <li>• Top {groupConfig.advancesPerGroup} de cada grupo avança para mata-mata</li>
                              <li>• Total de {groupConfig.numGroups * groupConfig.advancesPerGroup} classificados para mata-mata</li>
                              <li>• Partidas no melhor de {groupConfig.bestOfSets} sets</li>
                            </ul>
                          </div>
                          
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => generateCategoryBracketMutation.mutate({ 
                                categoryId: selectedCategory, 
                                method: 'auto', 
                                groupConfig 
                              })}
                              disabled={generateCategoryBracketMutation.isPending}
                              data-testid="button-generate-group-bracket"
                            >
                              <span className="material-icons text-sm mr-1">play_arrow</span>
                              {generateCategoryBracketMutation.isPending ? 'Gerando...' : 'Gerar Chaveamento'}
                            </Button>
                          </div>
                        </div>
                      );
                    } else {
                      // Para outros formatos (single_elimination, round_robin, etc.)
                      return (
                        <div className="text-center p-8 space-y-4">
                          <span className="material-icons text-4xl mb-4 block text-green-500">sports_tennis</span>
                          <h4 className="text-lg font-semibold mb-2">
                            Gerar Chaveamento - {category.format || tournament.format}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Participantes: {category.participantCount} atletas
                          </p>
                          <Button
                            onClick={() => generateCategoryBracketMutation.mutate({ 
                              categoryId: selectedCategory, 
                              method: 'auto' 
                            })}
                            disabled={generateCategoryBracketMutation.isPending}
                            data-testid="button-generate-simple-bracket"
                          >
                            <span className="material-icons text-sm mr-1">shuffle</span>
                            {generateCategoryBracketMutation.isPending ? 'Gerando...' : 'Gerar Chaveamento'}
                          </Button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualização do Bracket */}
      {selectedCategory && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons text-blue-500">account_tree</span>
              Visualização do Chaveamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BracketView 
              tournamentId={tournament.id} 
              categoryId={selectedCategory}
              className="mt-4"
              data-testid="bracket-view-component"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
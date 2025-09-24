import { useState, useRef } from "react";
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

// Estado de drag context para touch drag-and-drop
interface DragState {
  sourceMatchId: string;
  sourcePosition: 'player1' | 'player2';
  isDragging: boolean;
  pointer: { x: number; y: number };
  ghostRect?: DOMRect;
}

// Estado de tap-to-swap
interface TapState {
  selectedMatchId: string | null;
  selectedPosition: 'player1' | 'player2' | null;
}

export default function CategoryBracketManagement({ tournament }: CategoryBracketManagementProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [groupConfig, setGroupConfig] = useState({
    numGroups: 2,
    advancesPerGroup: 2,
    bestOfSets: 3
  });
  
  // Estados para touch drag-and-drop
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [tapState, setTapState] = useState<TapState>({ selectedMatchId: null, selectedPosition: null });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Buscar categorias do torneio com estatísticas
  const { data: categoriesWithStats, isLoading } = useQuery<CategoryWithStats[]>({
    queryKey: ['/api/tournaments', tournament.id, 'categories-stats'],
  });

  // Buscar rodadas disponíveis da categoria (NEW PERFORMANCE OPTIMIZATION)
  const { data: categoryRounds } = useQuery<{ round: number; phase: string; matchCount: number }[]>({
    queryKey: ['/api/tournaments', tournament.id, 'categories', selectedCategory, 'rounds'],
    queryFn: () => selectedCategory ? 
      fetch(`/api/tournaments/${tournament.id}/categories/${selectedCategory}/rounds`)
        .then(res => res.json()) : [],
    enabled: !!selectedCategory,
  });

  // Buscar partidas da rodada selecionada apenas (LAZY LOADING)
  const { data: roundMatches, isLoading: roundMatchesLoading } = useQuery<any[]>({
    queryKey: ['/api/tournaments', tournament.id, 'categories', selectedCategory, 'rounds', selectedRound, 'matches'],
    queryFn: async () => {
      if (!selectedCategory || selectedRound === null) return [];
      try {
        const response = await fetch(`/api/tournaments/${tournament.id}/categories/${selectedCategory}/rounds/${selectedRound}/matches`);
        if (!response.ok) {
          console.error('Error fetching round matches:', response.status, response.statusText);
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching round matches:', error);
        return [];
      }
    },
    enabled: !!selectedCategory && selectedRound !== null,
  });

  // FALLBACK: Buscar todas as partidas da categoria apenas se há poucas (< 50)
  const { data: categoryMatches } = useQuery<any[]>({
    queryKey: ['/api/tournaments', tournament.id, 'category-matches', selectedCategory],
    queryFn: () => selectedCategory ? 
      fetch(`/api/tournaments/${tournament.id}/category-matches/${selectedCategory}`)
        .then(res => res.json()) : [],
    enabled: !!selectedCategory && (!categoryRounds || (categoryRounds && categoryRounds.reduce((sum, r) => sum + r.matchCount, 0) < 50)),
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

  // **IMPROVED Swap Athletes Function with Optimistic Updates**
  const swapAthletes = async (
    sourceMatchId: string,
    sourcePosition: 'player1' | 'player2',
    targetMatchId: string,
    targetPosition: 'player1' | 'player2'
  ) => {
    if (sourceMatchId === targetMatchId && sourcePosition === targetPosition) {
      console.log('👌 Mesmo slot selecionado - nada para trocar');
      return;
    }

    console.log('🔄 INICIANDO TROCA:', {
      source: `${sourceMatchId}-${sourcePosition}`,
      target: `${targetMatchId}-${targetPosition}`
    });

    try {
      // ⚡ FEEDBACK VISUAL IMEDIATO
      const sourceElement = document.querySelector(`[data-testid="slot-${sourcePosition}-${sourceMatchId}"]`);
      const targetElement = document.querySelector(`[data-testid="slot-${targetPosition}-${targetMatchId}"]`);
      
      if (sourceElement && targetElement) {
        sourceElement.classList.add('animate-pulse', 'bg-blue-100', 'border-blue-300');
        targetElement.classList.add('animate-pulse', 'bg-blue-100', 'border-blue-300');
      }

      // Make API call
      const response = await apiRequest('POST', `/api/tournaments/${tournament.id}/swap-athletes`, {
        sourceMatchId,
        sourcePosition,
        targetMatchId,
        targetPosition
      });

      toast({
        title: "✅ Troca Realizada",
        description: "Atletas trocados com sucesso!",
      });

      // ⚡ INVALIDAÇÃO IMEDIATA - sem setTimeout para resposta rápida
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tournaments', tournament.id, 'category-matches', selectedCategory] 
      });
      
      // Invalidar também dados por rodada se estiver sendo usado (CHAVE CORRETA)
      if (selectedRound !== null) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/tournaments', tournament.id, 'categories', selectedCategory, 'rounds', selectedRound, 'matches'] 
        });
      }

      console.log('✅ TROCA CONCLUÍDA COM SUCESSO');

    } catch (error) {
      console.error('❌ Erro ao trocar atletas:', error);
      
      // Revert optimistic update on error
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tournaments', tournament.id, 'category-matches', selectedCategory] 
      });
      
      toast({
        title: "❌ Erro na Troca",
        description: "Não foi possível trocar os atletas. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // **FUNÇÕES DE EFEITO FANTASMA**
  const createDragGhost = (
    matchId: string, 
    position: 'player1' | 'player2', 
    pointer: { x: number; y: number },
    rect: DOMRect
  ) => {
    // Buscar informações do atleta para o elemento fantasma
    const match = categoryMatches?.find(m => m.id === matchId);
    const playerName = position === 'player1' ? match?.player1Name : match?.player2Name;
    const playerPhoto = position === 'player1' ? match?.player1Photo : match?.player2Photo;
    
    // Criar elemento fantasma
    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost';
    ghost.className = 'drag-ghost';
    
    // Conteúdo do fantasma (similar ao PlayerSlot)
    ghost.innerHTML = `
      <div class="flex items-center gap-2 p-2 text-sm bg-white rounded-md border-2 border-dashed border-blue-500">
        <div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
          ${playerName ? playerName.charAt(0).toUpperCase() : '?'}
        </div>
        <div class="font-medium text-gray-800 truncate">
          ${playerName || 'Atleta'}
        </div>
        <div class="text-blue-500 text-sm">📍</div>
      </div>
    `;
    
    // Posicionar o fantasma
    ghost.style.left = `${pointer.x - rect.width / 2}px`;
    ghost.style.top = `${pointer.y - rect.height / 2}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    
    document.body.appendChild(ghost);
    console.log('👻 FANTASMA CRIADO para:', playerName);
  };
  
  const updateDragGhost = (pointer: { x: number; y: number }) => {
    const ghost = document.getElementById('drag-ghost');
    if (ghost && dragState?.ghostRect) {
      ghost.style.left = `${pointer.x - dragState.ghostRect.width / 2}px`;
      ghost.style.top = `${pointer.y - dragState.ghostRect.height / 2}px`;
    }
  };
  
  const removeDragGhost = () => {
    const ghost = document.getElementById('drag-ghost');
    if (ghost) {
      ghost.remove();
      console.log('👻 FANTASMA REMOVIDO');
    }
  };

  // **Touch Drag-and-Drop Functions** 
  const handlePointerDown = (
    e: React.PointerEvent, 
    matchId: string, 
    position: 'player1' | 'player2',
    playerId: string | null
  ) => {
    if (!editMode || !playerId) return;
    
    e.stopPropagation();
    
    const isTouch = e.pointerType === 'touch';
    const startPointer = { x: e.clientX, y: e.clientY };
    dragStartPos.current = startPointer;
    
    // Capturar pointer para receber todos os eventos
    (e.target as Element).setPointerCapture(e.pointerId);
    
    if (isTouch) {
      // Touch: usar long-press (300ms) com threshold de movimento
      longPressTimer.current = setTimeout(() => {
        if (dragStartPos.current && e.currentTarget) {
          startDrag(matchId, position, startPointer, e.currentTarget.getBoundingClientRect());
        }
      }, 300);
    } else {
      // Mouse: drag imediato
      if (e.currentTarget) {
        startDrag(matchId, position, startPointer, e.currentTarget.getBoundingClientRect());
      }
    }
  };
  
  const startDrag = (
    matchId: string, 
    position: 'player1' | 'player2', 
    pointer: { x: number; y: number },
    rect: DOMRect
  ) => {
    setDragState({
      sourceMatchId: matchId,
      sourcePosition: position,
      isDragging: true,
      pointer,
      ghostRect: rect
    });
    
    // Criar elemento fantasma visual
    createDragGhost(matchId, position, pointer, rect);
    
    // Destacar elemento de origem
    const dragSourceElement = document.querySelector(`[data-testid="slot-${position}-${matchId}"]`);
    if (dragSourceElement) {
      dragSourceElement.classList.add('drag-source-highlight');
    }
    
    // Desabilitar scroll da página durante drag
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';
    
    console.log('🚀 TOUCH DRAG INICIADO:', { matchId, position });
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    // Verificar threshold de movimento para cancelar long-press
    if (dragStartPos.current && longPressTimer.current) {
      const currentPos = { x: e.clientX, y: e.clientY };
      const distance = Math.sqrt(
        Math.pow(currentPos.x - dragStartPos.current.x, 2) + 
        Math.pow(currentPos.y - dragStartPos.current.y, 2)
      );
      
      if (distance > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        dragStartPos.current = null;
      }
    }
    
    if (!dragState?.isDragging) return;
    
    e.preventDefault();
    
    const newPointer = { x: e.clientX, y: e.clientY };
    setDragState(prev => prev ? { ...prev, pointer: newPointer } : null);
    
    // **ATUALIZAR POSIÇÃO DO FANTASMA**
    updateDragGhost(newPointer);
    
    // Hit test para encontrar targets válidos
    const elementBelow = document.elementFromPoint(newPointer.x, newPointer.y);
    const playerSlot = elementBelow?.closest('[data-player-slot]');
    
    // Remove highlight de todos os slots
    document.querySelectorAll('[data-player-slot]').forEach(el => {
      el.classList.remove('drag-target-highlight');
    });
    
    // Adiciona highlight ao target atual (se válido)
    if (playerSlot && playerSlot.getAttribute('data-match-id') !== dragState.sourceMatchId) {
      playerSlot.classList.add('drag-target-highlight');
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (!dragState?.isDragging) {
      // Tap-to-swap fallback
      const matchId = e.currentTarget.getAttribute('data-match-id');
      const position = e.currentTarget.getAttribute('data-slot') as 'player1' | 'player2';
      const playerId = e.currentTarget.getAttribute('data-player-id');
      
      if (matchId && position && playerId && editMode) {
        if (tapState.selectedMatchId && tapState.selectedPosition) {
          // Segunda seleção - executar troca
          if (tapState.selectedMatchId !== matchId || tapState.selectedPosition !== position) {
            swapAthletes(tapState.selectedMatchId, tapState.selectedPosition, matchId, position);
          }
          setTapState({ selectedMatchId: null, selectedPosition: null });
        } else {
          // Primeira seleção
          setTapState({ selectedMatchId: matchId, selectedPosition: position });
          console.log('👆 TAP-TO-SWAP SELECIONADO:', { matchId, position });
        }
      }
      return;
    }
    
    // Drop logic para drag and drop
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-player-slot]');
    
    if (dropTarget && dragState) {
      const targetMatchId = dropTarget.getAttribute('data-match-id');
      const targetPosition = dropTarget.getAttribute('data-slot') as 'player1' | 'player2';
      const targetPlayerId = dropTarget.getAttribute('data-player-id');
      
      if (targetMatchId && targetPosition && targetPlayerId && targetMatchId !== dragState.sourceMatchId) {
        swapAthletes(dragState.sourceMatchId, dragState.sourcePosition, targetMatchId, targetPosition);
      }
    }
    
    cleanupDrag();
  };
  
  const cleanupDrag = () => {
    setDragState(null);
    dragStartPos.current = null;
    
    // **REMOVER FANTASMA**
    removeDragGhost();
    
    // Limpar timers
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Restaurar scroll da página
    document.body.style.touchAction = '';
    document.body.style.userSelect = '';
    
    // Remover highlights
    document.querySelectorAll('[data-player-slot]').forEach(el => {
      el.classList.remove('drag-target-highlight');
    });
    
    // **REMOVER HIGHLIGHT DO ELEMENTO ORIGEM**
    document.querySelectorAll('.drag-source-highlight').forEach(el => {
      el.classList.remove('drag-source-highlight');
    });
    
    console.log('🧹 DRAG CLEANUP COMPLETO');
  };
  
  // Handler para cancelamento de pointer
  const handlePointerCancel = () => {
    cleanupDrag();
  };
  
  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      dragStartPos.current = null;
    }
  };

  // **PlayerSlot Component** - Componente reutilizável para jogadores com touch drag-and-drop
  const PlayerSlot = ({ 
    match, 
    position, 
    borderColor = 'blue' 
  }: { 
    match: any; 
    position: 'player1' | 'player2';
    borderColor?: 'blue' | 'red';
  }) => {
    const playerId = position === 'player1' ? match.player1Id : match.player2Id;
    const playerName = position === 'player1' ? match.player1Name : match.player2Name;
    const playerPhoto = position === 'player1' ? match.player1Photo : match.player2Photo;
    const playerCity = position === 'player1' ? match.player1City : match.player2City;
    const playerState = position === 'player1' ? match.player1State : match.player2State;
    
    const isSelected = tapState.selectedMatchId === match.id && tapState.selectedPosition === position;
    const borderColors = {
      blue: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
      red: 'border-red-200 hover:border-red-400 hover:bg-red-50'
    };
    
    return (
      <div 
        className={`
          flex items-center gap-1 lg:gap-2 flex-1 min-w-0 touch-manipulation overflow-hidden
          ${editMode && playerId ? `cursor-grab active:cursor-grabbing p-2 lg:p-3 rounded border-2 border-dashed ${borderColors[borderColor]} transition-all` : 'p-1 lg:p-2'}
          ${isSelected ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}
          ${dragState?.sourceMatchId === match.id && dragState?.sourcePosition === position ? 'opacity-50' : ''}
        `}
        data-player-slot
        data-match-id={match.id}
        data-slot={position}
        data-player-id={playerId}
        data-testid={`slot-${position}-${match.id}`}
        onPointerDown={(e) => handlePointerDown(e, match.id, position, playerId)}
        onPointerMove={dragState?.isDragging ? handlePointerMove : undefined}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        style={{ touchAction: dragState?.isDragging ? 'none' : 'auto' }}
      >
        {playerPhoto ? (
          <img 
            src={playerPhoto} 
            alt={playerName}
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover border pointer-events-none flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold pointer-events-none flex-shrink-0">
            {playerName ? playerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : (position === 'player1' ? 'J1' : 'J2')}
          </div>
        )}
        <div className="min-w-0 flex-1 pointer-events-none overflow-hidden">
          <div className="text-xs lg:text-sm font-medium truncate">
            {playerName || (position === 'player1' ? 'J1' : 'J2')}
          </div>
          {(playerCity || playerState) && (
            <div className="text-xs text-muted-foreground truncate hidden lg:block">
              {[playerCity, playerState].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        
        {/* Indicador visual para seleção tap-to-swap */}
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-yellow-900 text-xs font-bold pointer-events-none">
            ✓
          </div>
        )}
      </div>
    );
  };

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
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Status geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-icons text-blue-500">sports_tennis</span>
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
                    {/* Show generate buttons if category has NO matches yet */}
                    {category.matchCount === 0 && (
                      <>
                        {category.participantCount >= 2 ? (
                          // Categoria com participantes suficientes - mostrar botões de sorteio
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateCategoryBracketMutation.mutate({ categoryId: category.id, method: 'auto' })}
                              disabled={generateCategoryBracketMutation.isPending}
                              data-testid={`button-auto-bracket-${category.id}`}
                            >
                              <span className="material-icons text-sm mr-1">casino</span>
                              Sorteio Automático
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCategory(category.id)}
                              data-testid={`button-manual-bracket-${category.id}`}
                            >
                              <span className="material-icons text-sm mr-1">sports</span>
                              Sorteio Manual
                            </Button>
                          </>
                        ) : (
                          // Categoria sem participantes suficientes - mostrar informação
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <span className="material-icons text-xs mr-1">group_add</span>
                              Precisa de {2 - category.participantCount} participante{2 - category.participantCount > 1 ? 's' : ''}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCategory(category.id)}
                              data-testid={`button-manage-category-${category.id}`}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <span className="material-icons text-sm mr-1">settings</span>
                              Gerenciar
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                    {/* ONLY show view/edit buttons if category HAS matches */}
                    {category.matchCount > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCategory(category.id)}
                          data-testid={`button-view-bracket-${category.id}`}
                        >
                          <span className="material-icons text-sm mr-1">table_chart</span>
                          Ver Chaveamento
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCategory(category.id);
                          }}
                          data-testid={`button-modify-bracket-${category.id}`}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <span className="material-icons text-sm mr-1">swap_horiz</span>
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

      {/* Detalhes da Categoria Selecionada */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-icons text-blue-500">category</span>
                Chaveamento - {categoriesWithStats?.find(c => c.id === selectedCategory)?.name}
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <span className="material-icons text-sm mr-1">edit</span>
                    Alterar Chaveamento
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditMode(false);
                        setSelectedMatches([]);
                      }}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <span className="material-icons text-sm mr-1">check</span>
                      Finalizar Edição
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditMode(false);
                        setSelectedMatches([]);
                      }}
                    >
                      <span className="material-icons text-sm mr-1">close</span>
                      Cancelar
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  ✕ Fechar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const category = categoriesWithStats?.find(c => c.id === selectedCategory);
                const hasExistingBracket = (categoryMatches && categoryMatches.length > 0) || (category && category.matchCount > 0);
                
                if (hasExistingBracket) {
                  const totalMatches = categoryRounds?.reduce((sum, r) => sum + r.matchCount, 0) || category?.matchCount || 0;
                  const hasManyMatches = totalMatches > 50;
                  
                  // **PERFORMANCE: Force round selection for tournaments with many matches**
                  if (hasManyMatches && categoryRounds && categoryRounds.length > 0) {
                    if (selectedRound === null) {
                      // Show central round selector overlay
                      return (
                        <div className="text-center py-12 space-y-6">
                          <div className="max-w-md mx-auto">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-xl border shadow-sm">
                              <span className="material-icons text-5xl mb-4 block text-blue-500">sports_tennis</span>
                              <h3 className="text-xl font-bold text-gray-800 mb-3">
                                Selecione uma Rodada para Visualizar
                              </h3>
                              <p className="text-gray-600 mb-6 text-sm">
                                Esta categoria tem <strong>{totalMatches} partidas</strong> em <strong>{categoryRounds.length} rodadas</strong>. 
                                Para melhor performance, selecione a rodada que deseja visualizar.
                              </p>
                              
                              <div className="space-y-4">
                                <div className="text-left">
                                  <Label htmlFor="round-select-main" className="text-sm font-medium mb-2 block">
                                    Escolha a Rodada:
                                  </Label>
                                  <Select 
                                    value="" 
                                    onValueChange={(value) => {
                                      setSelectedRound(parseInt(value));
                                    }}
                                  >
                                    <SelectTrigger 
                                      className="w-full h-12 text-base font-medium" 
                                      data-testid="select-round-main"
                                    >
                                      <SelectValue placeholder="🏓 Selecionar Rodada" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categoryRounds.map(roundInfo => (
                                        <SelectItem key={roundInfo.round} value={roundInfo.round.toString()}>
                                          Rodada {roundInfo.round} 
                                          {roundInfo.phase === 'group' && ' (Grupos)'} 
                                          {roundInfo.phase === 'knockout' && ' (Eliminatórias)'} 
                                          - {roundInfo.matchCount} partidas
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
                                  <div className="flex justify-between">
                                    <span>🏆 Total de Partidas:</span>
                                    <span className="font-medium">{totalMatches}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>📅 Total de Rodadas:</span>
                                    <span className="font-medium">{categoryRounds.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>⚡ Carregamento Otimizado:</span>
                                    <span className="font-medium text-green-600">Ativo</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Show selected round with switcher
                    const currentRoundInfo = categoryRounds.find(r => r.round === selectedRound);
                    return (
                      <div className="space-y-4">
                        {/* Round Switcher Bar */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">
                                Rodada {selectedRound}
                                {currentRoundInfo?.phase === 'group' && ' (Grupos)'}
                                {currentRoundInfo?.phase === 'knockout' && ' (Eliminatórias)'}
                              </h4>
                              <Badge variant="secondary">
                                {currentRoundInfo?.matchCount || 0} partidas
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Label htmlFor="round-switch" className="text-sm text-gray-600">
                                Trocar:
                              </Label>
                              <Select 
                                value={selectedRound?.toString() || ""} 
                                onValueChange={(value) => {
                                  setSelectedRound(parseInt(value));
                                }}
                              >
                                <SelectTrigger className="w-48" data-testid="select-round-switch">
                                  <SelectValue placeholder="Rodada" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categoryRounds.map(roundInfo => (
                                    <SelectItem key={roundInfo.round} value={roundInfo.round.toString()}>
                                      Rodada {roundInfo.round} 
                                      {roundInfo.phase === 'group' && ' (Grupos)'} 
                                      {roundInfo.phase === 'knockout' && ' (Eliminatórias)'} 
                                      - {roundInfo.matchCount} partidas
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRound(null)}
                                title="Voltar à seleção de rodadas"
                              >
                                <span className="material-icons text-sm">arrow_back</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Loading or Matches */}
                        {roundMatchesLoading ? (
                          <div className="text-center py-8 space-y-3">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p className="text-gray-500">Carregando partidas da rodada {selectedRound}...</p>
                          </div>
                        ) : (
                          <div className="space-y-3 match-list-mobile">
                            {(roundMatches || []).map((match: any) => (
                        <div 
                          key={match.id} 
                          className="flex flex-col lg:flex-row lg:items-start justify-between p-3 lg:p-4 border rounded transition-colors hover:bg-gray-50 gap-3 lg:gap-4 min-h-fit overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center gap-2 lg:gap-4 min-w-0 flex-shrink-0">
                            <span className="font-medium text-sm lg:text-base whitespace-nowrap">Partida {match.matchNumber}</span>
                            <span className="text-muted-foreground text-xs lg:text-sm whitespace-nowrap">Rodada {match.round}</span>
                            {match.phase === 'group' && match.groupName && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">Grupo {match.groupName}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 lg:gap-2 min-w-0 flex-1 overflow-hidden">
                            {/* Jogador 1 - Touch Drag and Drop */}
                            <div className="flex-1 min-w-0">
                              <PlayerSlot 
                                match={match} 
                                position="player1" 
                                borderColor="blue" 
                              />
                            </div>
                            
                            <span className="font-bold text-orange-500 text-xs lg:text-sm px-1 flex-shrink-0">VS</span>
                            
                            {/* Jogador 2 - Touch Drag and Drop */}
                            <div className="flex-1 min-w-0">
                              <PlayerSlot 
                                match={match} 
                                position="player2" 
                                borderColor="red" 
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                              {match.status === 'completed' ? 'Finalizada' : 'Pendente'}
                            </Badge>
                            
                            {/* Botões de Edição - só aparecem em modo de edição */}
                            {editMode && (
                              <div className="flex items-center gap-1">
                                {/* Checkbox para seleção */}
                                <input
                                  type="checkbox"
                                  checked={selectedMatches.includes(match.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMatches(prev => [...prev, match.id]);
                                    } else {
                                      setSelectedMatches(prev => prev.filter(id => id !== match.id));
                                    }
                                  }}
                                  className="mr-2"
                                />
                              </div>
                            )}
                          </div>

                          {/* Dica de Drag and Drop */}
                          <div className="text-xs text-gray-400 italic hidden sm:block">
                            💡 Arraste atletas para trocar
                          </div>
                          <div className="text-xs text-gray-400 italic sm:hidden">
                            💡 Toque para trocar
                          </div>
                        </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // **FALLBACK: Show all matches for categories with < 50 matches**
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Partidas da Categoria</h4>
                        <Badge variant="secondary">{(categoryMatches || []).length} partidas</Badge>
                      </div>
                      
                      <div className="space-y-3 match-list-mobile">
                        {(categoryMatches || []).map((match: any) => (
                          <div 
                            key={match.id} 
                            className="flex flex-col lg:flex-row lg:items-start justify-between p-3 lg:p-4 border rounded transition-colors hover:bg-gray-50 gap-3 lg:gap-4 min-h-fit overflow-hidden"
                          >
                            <div className="flex flex-wrap items-center gap-2 lg:gap-4 min-w-0 flex-shrink-0">
                              <span className="font-medium text-sm lg:text-base whitespace-nowrap">Partida {match.matchNumber}</span>
                              <span className="text-muted-foreground text-xs lg:text-sm whitespace-nowrap">Rodada {match.round}</span>
                              {match.phase === 'group' && match.groupName && (
                                <Badge variant="outline" className="text-xs whitespace-nowrap">Grupo {match.groupName}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 lg:gap-2 min-w-0 flex-1 overflow-hidden">
                              <div className="flex-1 min-w-0">
                                <PlayerSlot 
                                  match={match} 
                                  position="player1" 
                                  borderColor="blue" 
                                />
                              </div>
                              
                              <span className="font-bold text-orange-500 text-xs lg:text-sm px-1 flex-shrink-0">VS</span>
                              
                              <div className="flex-1 min-w-0">
                                <PlayerSlot 
                                  match={match} 
                                  position="player2" 
                                  borderColor="red" 
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                                {match.status === 'completed' ? 'Finalizada' : 'Pendente'}
                              </Badge>
                              
                              {editMode && (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedMatches.includes(match.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMatches(prev => [...prev, match.id]);
                                      } else {
                                        setSelectedMatches(prev => prev.filter(id => id !== match.id));
                                      }
                                    }}
                                    className="mr-2"
                                  />
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-400 italic hidden sm:block">
                              💡 Arraste atletas para trocar
                            </div>
                            <div className="text-xs text-gray-400 italic sm:hidden">
                              💡 Toque para trocar
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  // Show bracket generation interface ONLY if no matches exist
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
                            <Label htmlFor="best-of-sets">Sets por Partida</Label>
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
                          Gerar Chaveamento - {(() => {
                            const format = category.format || tournament.format;
                            if (format === 'league_round_trip') return 'Liga (Ida e Volta)';
                            if (format === 'league_single') return 'Liga (Ida)';
                            if (format === 'single_elimination') return 'Eliminação Simples';
                            if (format === 'double_elimination') return 'Eliminação Dupla';
                            if (format === 'round_robin') return 'Todos contra Todos';
                            if (format === 'group_stage_knockout') return 'Grupos + Eliminatórias';
                            if (format === 'swiss') return 'Sistema Suíço';
                            return 'Chaveamento';
                          })()}
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
                          <span className="material-icons text-sm mr-1">casino</span>
                          {generateCategoryBracketMutation.isPending ? 'Gerando...' : 'Gerar Chaveamento'}
                        </Button>
                      </div>
                    );
                  }
                }
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualização do Bracket */}
      {selectedCategory && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons text-blue-500">table_chart</span>
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
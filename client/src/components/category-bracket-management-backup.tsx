// Backup temporário para restaurar se necessário
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import BracketView from "@/components/bracket-view";

interface TournamentWithParticipants {
  id: string;
  name: string;
  description?: string;
  format: string;
  status: string;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  gender: string;
  format?: string;
}

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

  // Buscar partidas por categoria (com nomes dos jogadores)
  const { data: categoryMatches } = useQuery<any[]>({
    queryKey: ['/api/tournaments', tournament.id, 'category-matches', selectedCategory],
    queryFn: () => selectedCategory ? 
      fetch(`/api/tournaments/${tournament.id}/category-matches/${selectedCategory}`)
        .then(res => res.json()) : [],
    enabled: !!selectedCategory,
  });

  // Placeholder return - implementação será restaurada separadamente
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
      <Card>
        <CardHeader>
          <CardTitle>Sistema sendo restaurado...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aguarde a restauração do sistema...</p>
        </CardContent>
      </Card>
    </div>
  );
}
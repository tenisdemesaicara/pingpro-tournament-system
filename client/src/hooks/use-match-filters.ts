import { useMemo } from 'react';

export interface Match {
  id: string;
  tournamentId: string;
  categoryId: string;
  categoryName?: string;
  phase: string | null;
  groupName?: string | null;
  round: number;
  player1Id?: string | null;
  player2Id?: string | null;
  winnerId?: string | null;
  score?: string | null;
  sets?: any;
  status?: string | null;
  isBye?: boolean;
}

export interface Tournament {
  id: string;
  format: string;
  categories?: Array<{ id: string; name: string; gender?: string }>;
}

export function useMatchFilters(tournament: Tournament, matches: Match[] | null) {
  
  // Detectar se categoria é mista
  const isMixedCategory = (categoryId: string) => {
    const category = tournament.categories?.find(c => c.id === categoryId);
    if (!category) return false;
    const name = category.name.toLowerCase();
    return name.includes('misto') || name.includes('mista') || name.includes('mixed');
  };
  
  // Obter fases disponíveis baseado no formato (retorna valores em inglês como no banco)
  const getAvailablePhases = (categoryId?: string) => {
    console.log('🔍 getAvailablePhases chamado:', { categoryId, format: tournament.format, hasMatches: !!matches });
    
    const format = tournament.format;
    
    // Se categoryId fornecido E temos matches, detectar fases reais das partidas
    if (categoryId && matches) {
      const categoryMatches = matches.filter(m => m.categoryId === categoryId);
      const uniquePhases = Array.from(new Set(categoryMatches.map(m => m.phase).filter(Boolean)));
      
      console.log('🎯 Fases reais encontradas nas partidas da categoria:', uniquePhases);
      
      if (uniquePhases.length > 0) {
        return uniquePhases as string[];
      }
    }
    
    // Fallback: usar formato do torneio
    if (format === 'groups_elimination' || format === 'group_stage_knockout' || format === 'cup') {
      return ['group', 'knockout'];
    } else if (format === 'single_elimination' || format === 'double_elimination') {
      return ['knockout'];
    } else if (format === 'round_robin' || format === 'league') {
      return ['league'];
    } else if (format === 'swiss') {
      return ['swiss'];
    }
    
    return ['league']; // Padrão
  };
  
  // Obter grupos disponíveis para uma categoria e fase
  const getAvailableGroups = (categoryId: string, phase: string) => {
    if (!matches) return [];
    
    const groups = matches
      .filter(m => m.categoryId === categoryId && m.phase === phase && m.groupName)
      .map(m => m.groupName as string)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    
    return groups;
  };
  
  // Obter rodadas disponíveis
  const getAvailableRounds = (categoryId: string, phase: string, group?: string) => {
    if (!matches) return [];
    
    const rounds = matches
      .filter(m => 
        m.categoryId === categoryId && 
        m.phase === phase && 
        (!group || m.groupName === group) &&
        m.round != null
      )
      .map(m => m.round as number)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);
    
    return rounds;
  };
  
  // Filtrar partidas
  const filterMatches = (
    categoryId: string | null,
    phase: string | null,
    group: string | null,
    round: number | null,
    gender: string | null
  ) => {
    if (!matches) return [];
    
    return matches.filter(match => {
      if (categoryId && match.categoryId !== categoryId) return false;
      if (phase && match.phase !== phase) return false;
      if (group && match.group !== group) return false;
      if (round != null && match.round !== round) return false;
      
      // Filtro de gênero
      if (gender && gender !== 'all') {
        const category = tournament.categories?.find(c => c.id === match.categoryId);
        const categoryName = category?.name?.toLowerCase() || '';
        
        if (gender === 'masculino') {
          if (!categoryName.includes('masculino') && !categoryName.includes('masc')) return false;
        } else if (gender === 'feminino') {
          if (!categoryName.includes('feminino') && !categoryName.includes('fem')) return false;
        }
      }
      
      return true;
    });
  };
  
  return {
    isMixedCategory,
    getAvailablePhases,
    getAvailableGroups,
    getAvailableRounds,
    filterMatches
  };
}

import { type Match, type InsertMatch } from "@shared/schema";
import { type IStorage } from "./storage";

export interface GroupStanding {
  playerId: string;
  position: number;
  points: number;
  setsWon: number;
  setsLost: number;
  matchesWon: number;
  matchesPlayed: number;
}

export interface BracketGeneration {
  phase: string;
  matches: InsertMatch[];
}

export interface FullBracketGeneration {
  allMatches: Match[];
  phases: string[];
}

export class BracketManager {
  constructor(private storage: IStorage) {}

  async createFullBracketFromGroups(
    tournamentId: string,
    categoryId: string,
    qualifiersPerGroup: number = 2
  ): Promise<FullBracketGeneration | null> {
    console.log(`[LOG] Criando bracket completo para torneio ${tournamentId}, categoria ${categoryId}`);
    
    try {
      const result = await this.generateFullBracket(tournamentId, categoryId, qualifiersPerGroup);
      
      if (result) {
        console.log(`[LOG] Bracket criado com sucesso - ${result.allMatches.length} partidas em ${result.phases.length} fases`);
      }
      
      return result;
    } catch (error) {
      console.error(`[ERROR] Erro ao criar bracket completo:`, error);
      throw error;
    }
  }

  async isGroupPhaseComplete(tournamentId: string, categoryId: string): Promise<boolean> {
    const groupMatches = await this.storage.getMatchesByCategoryPhase(
      tournamentId, 
      categoryId, 
      "group"
    );

    if (groupMatches.length === 0) {
      return false;
    }

    return groupMatches.every(match => match.status === "completed");
  }

  determineNextPhase(qualifiedCount: number): string {
    if (qualifiedCount >= 32) return "round_of_32";
    if (qualifiedCount >= 16) return "round_of_16";
    if (qualifiedCount >= 8) return "quarterfinal";
    if (qualifiedCount >= 4) return "semifinal";
    return "final";
  }

  async generateNextPhase(
    tournamentId: string, 
    categoryId: string, 
    qualifiersPerGroup: number = 2
  ): Promise<BracketGeneration | null> {
    const isComplete = await this.isGroupPhaseComplete(tournamentId, categoryId);
    if (!isComplete) {
      throw new Error("Fase de grupos ainda não está completa");
    }

    return null; // Stub implementation
  }

  async createPlaceholderBracket(
    tournamentId: string,
    categoryId: string,
    expectedGroups: number = 2,
    qualifiersPerGroup: number = 2
  ): Promise<FullBracketGeneration | null> {
    console.log(`[LOG] Criando bracket dinâmico para ${expectedGroups} grupos, ${qualifiersPerGroup} classificados por grupo`);
    
    // Calcular total de classificados
    const totalQualified = expectedGroups * qualifiersPerGroup;
    console.log(`[LOG] Total de classificados esperados: ${totalQualified}`);
    
    if (totalQualified < 4) {
      throw new Error('Não há classificados suficientes para criar eliminatórias (mínimo 4)');
    }

    // ✅ SISTEMA DINÂMICO - Determinar estrutura do bracket automaticamente
    const bracketStructure = this.calculateBracketStructure(totalQualified);
    console.log(`[LOG] Estrutura do bracket:`, bracketStructure);

    // ✅ MAPEAMENTO INTELIGENTE - Gerar mapeamento dos grupos para posições
    const seeding = this.generateIntelligentSeeding(expectedGroups, qualifiersPerGroup);
    console.log(`[LOG] Seeding inteligente:`, seeding);

    // ✅ GERAÇÃO DINÂMICA - Criar todas as partidas automaticamente
    const eliminationMatches = this.generateDynamicMatches(
      tournamentId,
      categoryId,
      bracketStructure,
      seeding
    );

    console.log(`[LOG] ✅ Bracket dinâmico criado: ${bracketStructure.phases.length} fases, ${eliminationMatches.length} partidas`);
    
    // Salvar todas as partidas eliminatórias
    for (const match of eliminationMatches) {
      await this.storage.createMatch(match);
      console.log(`[LOG] Partida criada: ${match.phase} ${match.matchNumber} - ${match.player1Source} vs ${match.player2Source}`);
    }
    
    // CRÍTICO: Conectar partidas com IDs reais após serem salvas
    await this.connectMatchesWithRealIds(tournamentId, categoryId);
    
    return {
      allMatches: eliminationMatches,
      phases: bracketStructure.phases
    };
  }

  /**
   * ✅ NOVO: Calcula estrutura do bracket baseado no número de classificados
   */
  private calculateBracketStructure(totalQualified: number): {
    phases: string[];
    roundsPerPhase: { [phase: string]: number };
    matchesPerPhase: { [phase: string]: number };
    totalRounds: number;
  } {
    const phases: string[] = [];
    const roundsPerPhase: { [phase: string]: number } = {};
    const matchesPerPhase: { [phase: string]: number } = {};
    
    // Determinar próxima potência de 2 maior ou igual ao número de classificados
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalQualified)));
    
    let currentPhaseSize = nextPowerOf2;
    let round = 1;
    
    // Gerar fases do maior para o menor
    while (currentPhaseSize >= 4) {
      let phaseName: string;
      
      if (currentPhaseSize >= 32) phaseName = 'round_of_32';
      else if (currentPhaseSize >= 16) phaseName = 'round_of_16';
      else if (currentPhaseSize >= 8) phaseName = 'quarterfinal';
      else if (currentPhaseSize >= 4) phaseName = 'semifinal';
      else break;
      
      phases.push(phaseName);
      roundsPerPhase[phaseName] = round;
      matchesPerPhase[phaseName] = currentPhaseSize / 2;
      
      currentPhaseSize = currentPhaseSize / 2;
      round++;
    }
    
    // Sempre adicionar final
    phases.push('final');
    roundsPerPhase['final'] = round;
    matchesPerPhase['final'] = 1;
    
    return {
      phases,
      roundsPerPhase,
      matchesPerPhase,
      totalRounds: round
    };
  }

  /**
   * ✅ NOVO: Gera seeding inteligente baseado nos grupos
   */
  private generateIntelligentSeeding(groups: number, qualifiersPerGroup: number): string[] {
    const seeding: string[] = [];
    
    // Gerar lista de classificados por posição nos grupos
    const groupNames = Array.from({ length: groups }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, D...
    
    // Distribuir por posição (1º de todos os grupos, depois 2º de todos, etc.)
    for (let position = 1; position <= qualifiersPerGroup; position++) {
      for (const groupName of groupNames) {
        seeding.push(`${position}º ${groupName}`);
      }
    }
    
    return seeding;
  }

  /**
   * ✅ NOVO: Gera partidas dinamicamente para qualquer estrutura
   */
  private generateDynamicMatches(
    tournamentId: string,
    categoryId: string,
    structure: any,
    seeding: string[]
  ): any[] {
    const matches: any[] = [];
    let matchNumber = 1;
    let tableNumber = 1;
    
    // Calcular número de BYEs necessários
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(seeding.length)));
    const byesNeeded = nextPowerOf2 - seeding.length;
    
    console.log(`[LOG] BYEs necessários: ${byesNeeded} (${seeding.length} -> ${nextPowerOf2})`);
    
    // Criar seeding completo com BYEs
    const fullSeeding = [...seeding];
    for (let i = 0; i < byesNeeded; i++) {
      fullSeeding.push('BYE');
    }
    
    // ✅ ALGORITMO PADRÃO DE BRACKET - Emparelhar oponentes corretamente
    const bracketPairs = this.generateBracketPairs(fullSeeding);
    
    // Gerar partidas para cada fase
    let currentMatches = bracketPairs;
    
    for (const phase of structure.phases) {
      console.log(`[LOG] Gerando fase: ${phase} (${currentMatches.length} partidas)`);
      
      const phaseMatches: any[] = [];
      
      for (let i = 0; i < currentMatches.length; i++) {
        const pair = currentMatches[i];
        
        const match = {
          id: this.generateId(),
          tournamentId,
          categoryId,
          round: structure.roundsPerPhase[phase],
          matchNumber: matchNumber++,
          player1Id: null,
          player2Id: null,
          player1Source: pair[0],
          player2Source: pair[1],
          status: 'pending',
          phase: phase,
          bestOfSets: phase === 'final' ? 5 : 3,
          nextMatchId: null,
          nextMatchSlot: Math.floor(i / 2) + 1,
          tableNumber: tableNumber++
        };
        
        phaseMatches.push(match);
        matches.push(match);
      }
      
      // Preparar próxima fase (vencedores das partidas atuais)
      if (phase !== 'final') {
        currentMatches = [];
        for (let i = 0; i < phaseMatches.length; i += 2) {
          const match1 = phaseMatches[i];
          const match2 = phaseMatches[i + 1];
          
          if (match2) {
            currentMatches.push([
              `Vencedor ${this.getPhaseDisplayName(phase)} ${match1.matchNumber}`,
              `Vencedor ${this.getPhaseDisplayName(phase)} ${match2.matchNumber}`
            ]);
          } else {
            // Número ímpar de partidas - último vencedor avança automaticamente
            currentMatches.push([
              `Vencedor ${this.getPhaseDisplayName(phase)} ${match1.matchNumber}`,
              'BYE'
            ]);
          }
        }
      }
    }
    
    return matches;
  }

  /**
   * ✅ NOVO: Gera emparelhamentos corretos para bracket
   */
  private generateBracketPairs(seeding: string[]): string[][] {
    const pairs: string[][] = [];
    const n = seeding.length;
    
    // Algoritmo padrão de emparelhamento: 1 vs n, 2 vs n-1, 3 vs n-2, etc.
    for (let i = 0; i < n / 2; i++) {
      pairs.push([seeding[i], seeding[n - 1 - i]]);
    }
    
    return pairs;
  }

  /**
   * ✅ NOVO: Converte nome técnico da fase para display
   */
  private getPhaseDisplayName(phase: string): string {
    const phaseNames: { [key: string]: string } = {
      'round_of_32': '32 Avos',
      'round_of_16': '16 Avos', 
      'quarterfinal': 'Quarta',
      'semifinal': 'Semifinal',
      'final': 'Final'
    };
    
    return phaseNames[phase] || phase;
  }

  async generateFullBracket(
    tournamentId: string,
    categoryId: string,
    qualifiersPerGroup: number = 2
  ): Promise<FullBracketGeneration | null> {
    const isComplete = await this.isGroupPhaseComplete(tournamentId, categoryId);
    if (!isComplete) {
      throw new Error("Fase de grupos ainda não está completa");
    }

    console.log(`[LOG] Gerando bracket completo para torneio ${tournamentId}, categoria ${categoryId}`);
    
    // Obter classificação dos grupos
    const groupStandings = await this.storage.computeGroupStandings(tournamentId, categoryId);
    
    if (groupStandings.length === 0) {
      throw new Error('Nenhuma classificação de grupo encontrada');
    }
    
    const totalGroups = groupStandings.length;
    const totalQualified = totalGroups * qualifiersPerGroup;
    
    console.log(`[LOG] ${totalGroups} grupos, ${totalQualified} classificados`);
    
    // Criar bracket com placeholders se não existir
    const result = await this.createPlaceholderBracket(tournamentId, categoryId, totalGroups, qualifiersPerGroup);
    
    if (result) {
      // Preencher automaticamente com classificados
      await this.reconcilePlaceholders(tournamentId, categoryId, qualifiersPerGroup);
      
      // Auto-completar partidas BYE
      await this.autoCompleteBYEMatches(tournamentId, categoryId);
    }
    
    return result;
  }

  async propagateWinner(match: Match): Promise<void> {
    if (!match.winnerId || !match.nextMatchId || !match.nextMatchSlot) {
      console.log(`[LOG] Nao ha dados para propagar - winnerId: ${match.winnerId}, nextMatchId: ${match.nextMatchId}, nextMatchSlot: ${match.nextMatchSlot}`);
      return;
    }

    const nextMatch = await this.storage.getMatch(match.nextMatchId);
    if (!nextMatch) {
      console.log(`[LOG] Proxima partida nao encontrada: ${match.nextMatchId}`);
      return;
    }

    console.log(`[LOG] Propagando vencedor ${match.winnerId} da partida ${match.matchNumber} para partida ${nextMatch.matchNumber} slot ${match.nextMatchSlot}`);

    const updateData: any = {};
    if (match.nextMatchSlot === 1) {
      updateData.player1Id = match.winnerId;
      updateData.player1Source = null; // LIMPAR para mostrar nome real na UI
    } else {
      updateData.player2Id = match.winnerId;
      updateData.player2Source = null; // LIMPAR para mostrar nome real na UI
    }

    await this.storage.updateMatch(match.nextMatchId, updateData);
    console.log(`[LOG] Propagacao concluida com sucesso`);
  }

  // Função para gerar IDs únicos
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async fillGroupQualifiers(
    tournamentId: string,
    categoryId: string,
    groupName: string,
    qualifiersPerGroup: number = 2
  ): Promise<number> {
    console.log(`[LOG] Verificando preenchimento para grupo ${groupName}...`);
    
    // Obter classificação do grupo específico
    const groupStandings = await this.storage.computeGroupStandings(tournamentId, categoryId);
    const targetGroup = groupStandings.find(gs => gs.group === groupName);
    
    if (!targetGroup) {
      console.log(`[LOG] Grupo ${groupName} não encontrado`);
      return 0;
    }
    
    const qualified = Math.min(qualifiersPerGroup, targetGroup.standings.length);
    console.log(`[LOG] Grupo ${groupName}: ${qualified} classificados`);
    
    return qualified;
  }

  // Função para normalizar strings de placeholder
  private normalizeSource(source: string): string {
    return source
      .replace(/\s+/g, ' ')                    // Múltiplos espaços -> 1 espaço
      .replace(/[°º]/g, 'º')                   // Normalizar ordinais 
      .replace(/\b(\d+)o\b/g, '$1º')           // "1o" -> "1º"
      .replace(/\bdo Grupo\b/gi, '')           // Remover "do Grupo"
      .replace(/\bgrupo\b/gi, '')              // Remover "grupo"
      .trim()
      .toUpperCase();
  }

  async reconcilePlaceholders(
    tournamentId: string, 
    categoryId: string, 
    qualifiersPerGroup: number = 2
  ): Promise<void> {
    console.log(`[LOG] ===== RECONCILIACAO DE PLACEHOLDERS INICIADA =====`);
    console.log(`[LOG] Tournament: ${tournamentId}, Category: ${categoryId}, Qualifiers: ${qualifiersPerGroup}`);
    
    // Obter classificacao dos grupos
    const groupStandings = await this.storage.computeGroupStandings(tournamentId, categoryId);
    
    if (groupStandings.length === 0) {
      console.log("[ERROR] Nenhum grupo encontrado para reconciliacao");
      return;
    }

    // Mapear posicoes dos grupos para player IDs reais (COM NORMALIZACAO)
    const qualifiedMap = new Map<string, string>();
    
    groupStandings.forEach(({ group, standings }) => {
      for (let position = 1; position <= qualifiersPerGroup; position++) {
        if (standings[position - 1]) {
          const key = `${position}º ${group}`;
          const normalizedKey = this.normalizeSource(key);
          qualifiedMap.set(normalizedKey, standings[position - 1].playerId);
          console.log(`[LOG] Mapeado: ${normalizedKey} -> ${standings[position - 1].playerId}`);
        }
      }
    });

    // Buscar TODAS as partidas eliminatorias
    const allMatches = await this.storage.getTournamentMatches(tournamentId);
    const eliminationMatches = allMatches.filter(m => 
      m.categoryId === categoryId && m.phase !== 'group'
    );
    
    // Ordenar por fase para processar na ordem correta
    const phaseOrder: Record<string, number> = { 'quarterfinals': 1, 'semifinals': 2, 'final': 3, 'round_of_16': 0 };
    eliminationMatches.sort((a, b) => (phaseOrder[a.phase || ''] || 99) - (phaseOrder[b.phase || ''] || 99));
    
    for (const match of eliminationMatches) {
      // REMOVER GUARDA: processar todas exceto completed
      if (match.status === 'completed') {
        continue;
      }
      
      const updates: any = {};
      let hasUpdates = false;
      
      // Verificar player1Source - CORRIGIR MESMO SE JÁ TIVER playerId
      if (match.player1Source) {
        const normalizedSource = this.normalizeSource(match.player1Source);
        const correctPlayerId = qualifiedMap.get(normalizedSource);
        
        if (correctPlayerId && match.player1Id !== correctPlayerId) {
          console.log(`[LOG] Corrigindo Player 1: ${match.player1Id} -> ${correctPlayerId}`);
          updates.player1Id = correctPlayerId;
          updates.player1Source = null;
          hasUpdates = true;
        }
      }
      
      // Verificar player2Source - CORRIGIR MESMO SE JÁ TIVER playerId  
      if (match.player2Source) {
        const normalizedSource = this.normalizeSource(match.player2Source);
        const correctPlayerId = qualifiedMap.get(normalizedSource);
        
        if (correctPlayerId && match.player2Id !== correctPlayerId) {
          console.log(`[LOG] Corrigindo Player 2: ${match.player2Id} -> ${correctPlayerId}`);
          updates.player2Id = correctPlayerId;
          updates.player2Source = null;
          hasUpdates = true;
        }
      }
      
      // Aplicar updates se houver
      if (hasUpdates) {
        await this.storage.updateMatch(match.id, updates);
        console.log(`[LOG] Match ${match.id} atualizada com qualificados reais`);
      }
    }
    
    console.log("[LOG] Reconciliacao de placeholders finalizada");
  }

  async autoCompleteBYEMatches(tournamentId: string, categoryId: string): Promise<void> {
    console.log("[LOG] Auto-completando partidas BYE...");
    
    const eliminationPhases = ['quarterfinal', 'semifinal', 'final', 'round_of_16', 'round_of_32'];
    
    for (const phase of eliminationPhases) {
      const matches = await this.storage.getMatchesByCategoryPhase(tournamentId, categoryId, phase);
      console.log(`[LOG] Verificando ${matches.length} partidas da fase ${phase}`);
      
      for (const match of matches) {
        console.log(`[LOG] Match ${match.id}: p1=${match.player1Id} p1Src=${match.player1Source} p2=${match.player2Id} p2Src=${match.player2Source} status=${match.status}`);
        
        // Verificar se é uma partida BYE - CORRIGIDA: só é BYE se explicitamente marcado como 'BYE'
        // OU se o número total de qualificados for ímpar e temos um jogador sem oponente real
        const isBYE = (match.player1Id && !match.player2Id && match.player2Source === 'BYE') || 
                      (!match.player1Id && match.player2Id && match.player1Source === 'BYE') ||
                      (match.player1Source === 'BYE' || match.player2Source === 'BYE');
        
        if (isBYE && match.status !== 'completed') {
          const winnerId = match.player1Id || match.player2Id;
          
          console.log(`[LOG] ✅ ENCONTROU BYE! Match ${match.id}, Winner: ${winnerId}`);
          
          // Completar a partida BYE
          await this.storage.updateMatch(match.id, {
            status: 'completed',
            winnerId: winnerId
          });
          
          // CRÍTICO: Propagar imediatamente para proxima fase
          const updatedMatch = await this.storage.getMatch(match.id);
          if (updatedMatch && updatedMatch.nextMatchId) {
            console.log(`[LOG] 🚀 Propagando BYE winner ${winnerId} para match ${updatedMatch.nextMatchId}`);
            await this.propagateWinner(updatedMatch);
          } else if (updatedMatch && !updatedMatch.nextMatchId) {
            console.log(`[LOG] 🏆 BYE winner ${winnerId} chegou na final`);
          } else {
            console.log(`[LOG] ❌ BYE sem nextMatchId: ${JSON.stringify(updatedMatch)}`);
          }
        } else if (isBYE) {
          console.log(`[LOG] BYE já completado: Match ${match.id}`);
        }
      }
    }
    
    console.log("[LOG] Auto-completar BYE finalizado");
  }

  async forceConnectMatches(tournamentId: string, categoryId: string): Promise<void> {
    await this.connectMatchesWithRealIds(tournamentId, categoryId);
  }

  async forceCompleteMatches(tournamentId: string, categoryId: string): Promise<void> {
    console.log("[LOG] 🔥 Forçando propagação de partidas completadas...");
    
    const eliminationPhases = ['quarterfinal', 'semifinal', 'final'];
    
    for (const phase of eliminationPhases) {
      const matches = await this.storage.getMatchesByCategoryPhase(tournamentId, categoryId, phase);
      
      for (const match of matches) {
        // Se tem winnerId mas não propagou ainda
        if (match.status === 'completed' && match.winnerId && match.nextMatchId) {
          console.log(`[LOG] 🚀 Forçando propagação: Match ${match.id} winner ${match.winnerId} -> ${match.nextMatchId}`);
          await this.propagateWinner(match);
        }
      }
    }
    
    console.log("[LOG] 🔥 Propagação forçada concluída!");
  }

  private async connectMatchesWithRealIds(tournamentId: string, categoryId: string): Promise<void> {
    console.log("[LOG] Conectando partidas com IDs reais...");
    
    // Buscar todas as partidas eliminatórias por fase
    const quarterMatches = await this.storage.getMatchesByCategoryPhase(tournamentId, categoryId, 'quarterfinal');
    const semifinalMatches = await this.storage.getMatchesByCategoryPhase(tournamentId, categoryId, 'semifinal');  
    const finalMatches = await this.storage.getMatchesByCategoryPhase(tournamentId, categoryId, 'final');
    
    // CRÍTICO: Ordenar por matchNumber para garantir ordem determinística
    quarterMatches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    semifinalMatches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    finalMatches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    
    console.log(`[LOG] Conectando (ordenado): ${quarterMatches.length} quartas, ${semifinalMatches.length} semifinais, ${finalMatches.length} finais`);
    
    // Conectar quartas de final para semifinais (DETERMINÍSTICO)
    if (quarterMatches.length === 4 && semifinalMatches.length === 2) {
      // Q1,Q2 -> S1 | Q3,Q4 -> S2
      await this.storage.updateMatch(quarterMatches[0].id, { 
        nextMatchId: semifinalMatches[0].id, 
        nextMatchSlot: 1 
      });
      await this.storage.updateMatch(quarterMatches[1].id, { 
        nextMatchId: semifinalMatches[0].id, 
        nextMatchSlot: 2 
      });
      await this.storage.updateMatch(quarterMatches[2].id, { 
        nextMatchId: semifinalMatches[1].id, 
        nextMatchSlot: 1 
      });
      await this.storage.updateMatch(quarterMatches[3].id, { 
        nextMatchId: semifinalMatches[1].id, 
        nextMatchSlot: 2 
      });
      
      console.log(`[LOG] Conexões Q->S: Q${quarterMatches[0].matchNumber}->${semifinalMatches[0].matchNumber}, Q${quarterMatches[1].matchNumber}->${semifinalMatches[0].matchNumber}, Q${quarterMatches[2].matchNumber}->${semifinalMatches[1].matchNumber}, Q${quarterMatches[3].matchNumber}->${semifinalMatches[1].matchNumber}`);
    }
    
    // Conectar semifinais para final (DETERMINÍSTICO)
    if (semifinalMatches.length === 2 && finalMatches.length === 1) {
      await this.storage.updateMatch(semifinalMatches[0].id, { 
        nextMatchId: finalMatches[0].id, 
        nextMatchSlot: 1 
      });
      await this.storage.updateMatch(semifinalMatches[1].id, { 
        nextMatchId: finalMatches[0].id, 
        nextMatchSlot: 2 
      });
      
      console.log(`[LOG] Conexões S->F: S${semifinalMatches[0].matchNumber}->F${finalMatches[0].matchNumber}, S${semifinalMatches[1].matchNumber}->F${finalMatches[0].matchNumber}`);
    }
    
    console.log("[LOG] Conexões entre partidas concluídas com sucesso!");
  }
}
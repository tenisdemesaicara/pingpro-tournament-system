import { type Tournament, type Match } from "@shared/schema";

export interface ScoringContext {
  winnerRanking: number;
  loserRanking: number;
  basePoints: number;
  setScore: string;
  isUpset: boolean;
  rankingDifference: number;
}

export interface ScoringResult {
  winnerPoints: number;
  loserPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  explanation: string[];
}

export interface PlacementResult {
  athleteId: string;
  placement: number;
  placementPoints: number;
  explanation: string[];
}

export class ScoringEngine {
  private scoringSystem: any;

  constructor(scoringSystem: any) {
    this.scoringSystem = scoringSystem;
  }

  calculatePoints(match: Match, winnerRanking: number, loserRanking: number): ScoringResult {
    if (!this.scoringSystem || !this.scoringSystem.enabled) {
      return {
        winnerPoints: 0,
        loserPoints: 0,
        bonusPoints: 0,
        penaltyPoints: 0,
        totalPoints: 0,
        explanation: ["Sistema de pontuação não ativado"]
      };
    }

    const context: ScoringContext = {
      winnerRanking,
      loserRanking,
      basePoints: this.scoringSystem.basePoints || 10,
      setScore: match.score || "",
      isUpset: winnerRanking > loserRanking, // Ranking maior = posição pior
      rankingDifference: Math.abs(winnerRanking - loserRanking)
    };

    const explanation: string[] = [];
    let totalPoints = context.basePoints;
    let bonusPoints = 0;
    let penaltyPoints = 0;
    let loserPoints = 0;

    // ===================
    // CÁLCULO VENCEDOR
    // ===================
    explanation.push("=== VENCEDOR ===");
    explanation.push(`Pontos base: ${context.basePoints}`);

    // Aplicar multiplicador baseado em ranking para vencedor
    if (this.scoringSystem.useRankingMultiplier) {
      const multiplier = this.calculateRankingMultiplier(context);
      if (multiplier !== 1) {
        const oldPoints = totalPoints;
        totalPoints = Math.round(totalPoints * multiplier);
        explanation.push(`Multiplicador ranking (${multiplier.toFixed(2)}): ${oldPoints} → ${totalPoints}`);
      }
    }

    // Bônus por upset (vencer oponente melhor rankeado)
    if (context.isUpset && this.scoringSystem.bonusForUpset > 0) {
      bonusPoints = this.scoringSystem.bonusForUpset;
      totalPoints += bonusPoints;
      explanation.push(`Bônus upset: +${bonusPoints} (venceu oponente rankeado #${loserRanking})`);
    }

    // ===================
    // CÁLCULO PERDEDOR
    // ===================
    if (this.scoringSystem.losePenaltyEnabled) {
      explanation.push("");
      explanation.push("=== PERDEDOR ===");
      
      const losePenaltyBase = this.scoringSystem.losePenaltyPoints || 3;
      loserPoints = -losePenaltyBase; // Começar com pontos negativos
      explanation.push(`Penalidade base: -${losePenaltyBase}`);

      // Aplicar multiplicador de ranking para perdedor (mesma lógica invertida)
      if (this.scoringSystem.useLosePenaltyMultiplier) {
        // Inverter contexto: o perdedor tem ranking pior, então a lógica é oposta
        const loserContext: ScoringContext = {
          ...context,
          winnerRanking: loserRanking, // Inverter para calcular penalidade
          loserRanking: winnerRanking,
          isUpset: loserRanking < winnerRanking // Perdedor melhor rankeado = penalidade maior
        };
        
        const multiplier = this.calculateRankingMultiplier(loserContext);
        if (multiplier !== 1) {
          const oldPenalty = loserPoints;
          loserPoints = Math.round(loserPoints * multiplier);
          explanation.push(`Multiplicador penalidade (${multiplier.toFixed(2)}): ${oldPenalty} → ${loserPoints}`);
        }
      }

      // Penalidade extra por perder sendo melhor rankeado (upset reverso)
      if (!context.isUpset && this.scoringSystem.penaltyForLoss > 0) {
        const extraPenalty = this.scoringSystem.penaltyForLoss;
        loserPoints -= extraPenalty;
        explanation.push(`Penalidade por perder sendo favorito: -${extraPenalty}`);
      }
    }

    // Aplicar fórmula customizada se existir
    if (this.scoringSystem.customFormula && this.scoringSystem.customFormula.trim()) {
      try {
        const customResult = this.evaluateCustomFormula(context, totalPoints);
        if (customResult !== totalPoints) {
          explanation.push(`Fórmula customizada: ${totalPoints} → ${customResult}`);
          totalPoints = customResult;
        }
      } catch (error) {
        explanation.push(`Erro na fórmula customizada: ${error.message}`);
      }
    }

    return {
      winnerPoints: Math.max(0, Math.round(totalPoints)),
      loserPoints: Math.round(loserPoints), // Permitir pontos negativos para perdedor
      bonusPoints,
      penaltyPoints: Math.abs(Math.min(0, loserPoints)), // Valor absoluto da penalidade
      totalPoints: Math.max(0, Math.round(totalPoints)),
      explanation
    };
  }

  private calculateRankingMultiplier(context: ScoringContext): number {
    const { rankingFormula } = this.scoringSystem;
    const { rankingDifference, isUpset } = context;

    if (rankingDifference === 0) return 1;

    switch (rankingFormula) {
      case "linear":
        // Multiplicador linear baseado na diferença
        if (isUpset) {
          // Vencer alguém melhor rankeado = mais pontos
          return 1 + (rankingDifference * 0.01); // 1% extra por posição de diferença
        } else {
          // Vencer alguém pior rankeado = menos pontos
          return Math.max(0.5, 1 - (rankingDifference * 0.005)); // 0.5% menos por posição
        }

      case "exponential":
        // Multiplicador exponencial - recompensa maior por upsets grandes
        if (isUpset) {
          return 1 + Math.pow(rankingDifference / 100, 1.5);
        } else {
          return Math.max(0.3, 1 - Math.pow(rankingDifference / 200, 1.2));
        }

      case "bracket":
        // Sistema de faixas
        if (isUpset) {
          if (rankingDifference > 50) return 2.0;      // Upset massivo
          if (rankingDifference > 25) return 1.5;      // Upset grande
          if (rankingDifference > 10) return 1.25;     // Upset médio
          return 1.1;                                  // Upset pequeno
        } else {
          if (rankingDifference > 50) return 0.5;      // Vitória muito esperada
          if (rankingDifference > 25) return 0.7;      // Vitória esperada
          if (rankingDifference > 10) return 0.85;     // Vitória provável
          return 0.95;                                 // Vitória equilibrada
        }

      default:
        return 1;
    }
  }

  private evaluateCustomFormula(context: ScoringContext, currentPoints: number): number {
    const { customFormula } = this.scoringSystem;
    
    // Criar um contexto seguro para avaliação
    const safeContext = {
      basePoints: context.basePoints,
      winnerRanking: context.winnerRanking,
      loserRanking: context.loserRanking,
      rankingDifference: context.rankingDifference,
      isUpset: context.isUpset,
      currentPoints,
      Math,
      // Funções úteis
      min: Math.min,
      max: Math.max,
      round: Math.round,
      pow: Math.pow,
      abs: Math.abs
    };

    // Eval seguro usando Function constructor
    try {
      const func = new Function(...Object.keys(safeContext), `return (${customFormula})`);
      const result = func(...Object.values(safeContext));
      
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error("Fórmula deve retornar um número válido");
      }
      
      return Math.max(0, result); // Não permitir pontos negativos
    } catch (error) {
      throw new Error(`Erro na fórmula: ${error.message}`);
    }
  }

  // Calcular pontos por colocação final do torneio
  calculatePlacementPoints(
    athleteId: string,
    placement: number,
    totalParticipants: number,
    tournamentFormat: string = "single_elimination"
  ): PlacementResult {
    if (!this.scoringSystem || !this.scoringSystem.enabled || !this.scoringSystem.placementPointsEnabled) {
      return {
        athleteId,
        placement,
        placementPoints: 0,
        explanation: ["Pontuação por colocação não ativada"]
      };
    }

    const explanation: string[] = [];
    let placementPoints = 0;

    explanation.push(`Colocação: ${placement}º lugar (${totalParticipants} participantes)`);

    if (this.scoringSystem.placementPointsFormula === "dynamic") {
      // Sistema dinâmico baseado no número de participantes e colocação
      placementPoints = this.calculateDynamicPlacementPoints(placement, totalParticipants, tournamentFormat);
      explanation.push(`Sistema dinâmico: ${placementPoints} pontos`);
    } else if (this.scoringSystem.placementPointsFormula === "fixed") {
      // Sistema fixo baseado em colocações específicas
      placementPoints = this.calculateFixedPlacementPoints(placement);
      explanation.push(`Sistema fixo: ${placementPoints} pontos`);
    } else if (this.scoringSystem.placementPointsFormula === "percentage") {
      // Sistema percentual baseado na colocação relativa
      const percentage = (totalParticipants - placement + 1) / totalParticipants;
      const maxPoints = this.scoringSystem.championPoints || 50;
      placementPoints = Math.round(maxPoints * percentage);
      explanation.push(`Sistema percentual (${(percentage * 100).toFixed(1)}%): ${placementPoints} pontos`);
    }

    return {
      athleteId,
      placement,
      placementPoints: Math.max(0, placementPoints),
      explanation
    };
  }

  private calculateDynamicPlacementPoints(placement: number, totalParticipants: number, format: string): number {
    // Pontos dinâmicos baseados em fases do torneio e número de participantes
    const baseMultiplier = Math.log2(totalParticipants); // Escala logarítmica
    
    // Identificar fase baseada na colocação
    if (placement === 1) {
      // Campeão
      return Math.round((this.scoringSystem.championPoints || 50) * (baseMultiplier / 4));
    } else if (placement === 2) {
      // Vice-campeão
      return Math.round((this.scoringSystem.runnerUpPoints || 30) * (baseMultiplier / 4));
    } else if (placement <= 4) {
      // Semifinalistas (3º e 4º lugar - no tênis de mesa não há disputa de 3º)
      return Math.round((this.scoringSystem.semifinalistPoints || 20) * (baseMultiplier / 4));
    } else if (placement <= 8) {
      // Quarterinalistas
      return Math.round((this.scoringSystem.quarterfinalistPoints || 10) * (baseMultiplier / 4));
    } else if (placement <= 16) {
      // Oitavas de final
      return Math.round(8 * (baseMultiplier / 4));
    } else if (placement <= 32) {
      // 16 avos de final
      return Math.round(5 * (baseMultiplier / 4));
    } else {
      // Fases anteriores - pontuação mínima
      const relativePosition = (totalParticipants - placement + 1) / totalParticipants;
      return Math.round(3 * relativePosition * (baseMultiplier / 4));
    }
  }

  private calculateFixedPlacementPoints(placement: number): number {
    // Sistema fixo tradicional
    switch (placement) {
      case 1: return this.scoringSystem.championPoints || 50;
      case 2: return this.scoringSystem.runnerUpPoints || 30;
      case 3:
      case 4: return this.scoringSystem.semifinalistPoints || 20; // Semifinalistas
      case 5:
      case 6:
      case 7:
      case 8: return this.scoringSystem.quarterfinalistPoints || 10; // Quarterinalistas
      default: return Math.max(0, 5 - Math.floor(placement / 4)); // Pontuação decrescente
    }
  }

  // Método para explicar o sistema de pontuação de um torneio
  static explainScoringSystem(scoringSystem: any): string[] {
    if (!scoringSystem || !scoringSystem.enabled) {
      return ["Sistema de pontuação avançado não está ativado neste torneio."];
    }

    const explanations = [
      "🏆 Sistema Avançado de Pontuação:",
      `• Pontos base por vitória: ${scoringSystem.basePoints}`,
    ];

    if (scoringSystem.useRankingMultiplier) {
      explanations.push(
        `• Multiplicador de ranking: ${scoringSystem.rankingFormula}`,
        "  - Vencer oponente melhor rankeado = mais pontos",
        "  - Vencer oponente pior rankeado = menos pontos"
      );
    }

    if (scoringSystem.bonusForUpset > 0) {
      explanations.push(`• Bônus por upset: +${scoringSystem.bonusForUpset} pontos`);
    }

    if (scoringSystem.losePenaltyEnabled) {
      explanations.push(
        `• Penalização por derrota: -${scoringSystem.losePenaltyPoints || 3} pontos`,
        "  - Mesmo sistema de multiplicador das vitórias aplicado às derrotas"
      );
    }

    if (scoringSystem.penaltyForLoss > 0) {
      explanations.push(`• Penalidade extra por perder sendo favorito: -${scoringSystem.penaltyForLoss} pontos`);
    }

    if (scoringSystem.placementPointsEnabled) {
      explanations.push(
        "• Pontuação por colocação final:",
        `  - Campeão: ${scoringSystem.championPoints || 50} pontos base`,
        `  - Vice: ${scoringSystem.runnerUpPoints || 30} pontos base`,
        `  - Semifinalistas: ${scoringSystem.semifinalistPoints || 20} pontos base`,
        `  - Quarterinalistas: ${scoringSystem.quarterfinalistPoints || 10} pontos base`,
        `  - Sistema ${scoringSystem.placementPointsFormula || 'dynamic'} (ajustado por número de participantes)`
      );
    }

    if (scoringSystem.customFormula && scoringSystem.customFormula.trim()) {
      explanations.push("• Fórmula customizada ativa");
    }

    explanations.push(
      "",
      "🎯 Características do Tênis de Mesa:",
      "• Não há disputa de 3º lugar - semifinalistas perdedores ficam em 3º automaticamente",
      "• Pontuação considera fases avançadas e número total de participantes",
      "",
      "💡 Dicas:",
      "• Rankings menores = melhores posições (ex: #1 > #100)",
      "• Upset = vencer alguém com ranking melhor que o seu",
      "• Pontuação final sempre será no mínimo 0"
    );

    return explanations;
  }
}

// Função utilitária para calcular pontos de uma partida
export async function calculateMatchPoints(
  match: Match, 
  tournament: Tournament,
  winnerRanking: number, 
  loserRanking: number
): Promise<ScoringResult> {
  if (!tournament.scoringSystem) {
    return {
      winnerPoints: 0,
      loserPoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      totalPoints: 0,
      explanation: ["Torneio sem sistema de pontuação configurado"]
    };
  }

  const engine = new ScoringEngine(tournament.scoringSystem);
  return engine.calculatePoints(match, winnerRanking, loserRanking);
}
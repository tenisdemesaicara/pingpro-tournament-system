import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

interface ScoringExampleResult {
  scenario: string;
  winnerRanking: number;
  loserRanking: number;
  basePoints: number;
  multiplier?: number;
  bonusPoints?: number;
  totalPoints: number;
  explanation: string[];
}

export default function ScoringInfo() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['/api/tournaments', id],
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Torneio não encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const scoringSystem = tournament.scoringSystem;
  const isEnabled = scoringSystem?.enabled;

  // Exemplos de cenários para demonstração
  const generateExamples = (): ScoringExampleResult[] => {
    if (!isEnabled) return [];

    const examples: ScoringExampleResult[] = [
      {
        scenario: "Vitória Equilibrada",
        winnerRanking: 50,
        loserRanking: 52,
        basePoints: scoringSystem.basePoints,
        totalPoints: scoringSystem.basePoints,
        explanation: ["Partida entre jogadores de ranking similar", "Pontuação padrão aplicada", scoringSystem.losePenaltyEnabled ? `Perdedor: -${scoringSystem.losePenaltyPoints || 3} pontos` : "Perdedor: sem penalização"]
      },
      {
        scenario: "Upset Pequeno",
        winnerRanking: 80,
        loserRanking: 65,
        basePoints: scoringSystem.basePoints,
        bonusPoints: scoringSystem.bonusForUpset || 0,
        totalPoints: scoringSystem.basePoints + (scoringSystem.bonusForUpset || 0),
        explanation: ["Vitória sobre oponente melhor rankeado", `Bônus upset: +${scoringSystem.bonusForUpset || 0} pontos`, scoringSystem.losePenaltyEnabled ? `Perdedor: -${scoringSystem.losePenaltyPoints || 3} pontos` : "Perdedor: sem penalização"]
      },
      {
        scenario: "Upset Massivo",
        winnerRanking: 200,
        loserRanking: 20,
        basePoints: scoringSystem.basePoints,
        multiplier: 2.0,
        bonusPoints: scoringSystem.bonusForUpset || 0,
        totalPoints: Math.round((scoringSystem.basePoints * 2.0) + (scoringSystem.bonusForUpset || 0)),
        explanation: ["Vitória surpreendente!", `Multiplicador ranking: x2.0`, `Bônus upset: +${scoringSystem.bonusForUpset || 0} pontos`, scoringSystem.losePenaltyEnabled ? `Perdedor (#20): penalização multiplicada` : "Perdedor: sem penalização"]
      },
      {
        scenario: "Vitória Esperada",
        winnerRanking: 10,
        loserRanking: 80,
        basePoints: scoringSystem.basePoints,
        multiplier: 0.7,
        totalPoints: Math.round(scoringSystem.basePoints * 0.7),
        explanation: ["Vitória esperada sobre oponente pior rankeado", "Multiplicador reduzido aplicado", scoringSystem.losePenaltyEnabled ? `Perdedor: -${scoringSystem.losePenaltyPoints || 3} pontos base` : "Perdedor: sem penalização"]
      }
    ];

    // Se há penalização extra para favoritos, adicionar exemplo específico
    if (scoringSystem.losePenaltyEnabled && scoringSystem.penaltyForLoss > 0) {
      examples.push({
        scenario: "Favorito Perde",
        winnerRanking: 80,
        loserRanking: 15,
        basePoints: scoringSystem.basePoints,
        totalPoints: scoringSystem.basePoints,
        explanation: [
          "Zebra! Pior rankeado vence favorito",
          `Vencedor: +${scoringSystem.basePoints} pontos`,
          `Perdedor: -${(scoringSystem.losePenaltyPoints || 3) + (scoringSystem.penaltyForLoss || 0)} pontos (penalidade extra por ser favorito)`
        ]
      });
    }

    return examples;
  };

  const examples = generateExamples();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            🏆 Sistema de Pontuação
          </h1>
          <p className="text-muted-foreground mt-2">
            {tournament.name}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setLocation(`/tournaments/${id}`)}
          data-testid="button-back-to-tournament"
        >
          ← Voltar ao Torneio
        </Button>
      </div>

      {/* Status do Sistema */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Sistema de Pontuação
            </CardTitle>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "ATIVO" : "DESATIVADO"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!isEnabled ? (
            <Alert>
              <AlertDescription>
                Este torneio não utiliza o sistema avançado de pontuação. 
                Os resultados das partidas não geram pontos adicionais para o ranking.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    +{scoringSystem.basePoints}
                  </div>
                  <div className="text-sm text-orange-800">Pontos por Vitória</div>
                </div>
                
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    +{scoringSystem.bonusForUpset || 0}
                  </div>
                  <div className="text-sm text-blue-800">Bônus Upset</div>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {scoringSystem.useRankingMultiplier ? "SIM" : "NÃO"}
                  </div>
                  <div className="text-sm text-green-800">Multiplicador</div>
                </div>
                
                <div className={`text-center p-3 rounded-lg ${scoringSystem.losePenaltyEnabled ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${scoringSystem.losePenaltyEnabled ? 'text-red-600' : 'text-gray-600'}`}>
                    {scoringSystem.losePenaltyEnabled ? `-${scoringSystem.losePenaltyPoints || 3}` : "0"}
                  </div>
                  <div className={`text-sm ${scoringSystem.losePenaltyEnabled ? 'text-red-800' : 'text-gray-800'}`}>Pontos por Derrota</div>
                </div>
              </div>
              
              {/* Resumo da Política de Pontuação */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Resumo da Política de Pontuação:</h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <div>• <strong>Vencedores:</strong> Sempre ganham pontos (mínimo {scoringSystem.basePoints})</div>
                  {scoringSystem.losePenaltyEnabled ? (
                    <div>• <strong>Perdedores:</strong> Perdem {scoringSystem.losePenaltyPoints || 3} pontos (pode ser multiplicado por ranking)</div>
                  ) : (
                    <div>• <strong>Perdedores:</strong> Não são penalizados (0 pontos)</div>
                  )}
                  <div>• <strong>Ranking:</strong> Recalculado automaticamente após cada resultado</div>
                  <div>• <strong>Pontuação mínima:</strong> Nenhum atleta fica com pontos negativos</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isEnabled && (
        <>
          {/* Como Funciona */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>💡 Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-orange-600 font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Pontos por Vitória</h4>
                    <p className="text-sm text-muted-foreground">
                      Todo vencedor recebe {scoringSystem.basePoints} pontos base pela vitória.
                    </p>
                  </div>
                </div>

                {scoringSystem.useRankingMultiplier && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Multiplicador de Ranking</h4>
                      <p className="text-sm text-muted-foreground">
                        Os pontos são multiplicados baseado na diferença de ranking entre os jogadores. 
                        Fórmula: <Badge variant="outline">{scoringSystem.rankingFormula}</Badge>
                      </p>
                    </div>
                  </div>
                )}

                {scoringSystem.bonusForUpset > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-green-600 font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Bônus por Upset</h4>
                      <p className="text-sm text-muted-foreground">
                        Vencer um oponente melhor rankeado rende +{scoringSystem.bonusForUpset} pontos extras!
                      </p>
                    </div>
                  </div>
                )}

                {scoringSystem.losePenaltyEnabled && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-red-600 font-bold text-sm">
                      {scoringSystem.bonusForUpset > 0 ? '4' : '3'}
                    </div>
                    <div>
                      <h4 className="font-semibold">Penalização por Derrota</h4>
                      <p className="text-sm text-muted-foreground">
                        Quem perde uma partida é penalizado com -{scoringSystem.losePenaltyPoints || 3} pontos.
                        {scoringSystem.useLosePenaltyMultiplier && " A penalização também usa multiplicador de ranking."}
                        {scoringSystem.penaltyForLoss > 0 && ` Penalidade extra de -${scoringSystem.penaltyForLoss} pontos para favoritos que perdem.`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg mt-6">
                  <h4 className="font-semibold mb-2">🎯 Importante Lembrar:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Ranking menor = posição melhor (ex: #1 é melhor que #100)</li>
                    <li>Upset = vencer alguém com ranking melhor que o seu</li>
                    {scoringSystem.losePenaltyEnabled ? (
                      <li>Vencedores ganham pontos, perdedores podem perder pontos (mínimo 0)</li>
                    ) : (
                      <li>Apenas vencedores ganham pontos, perdedores não são penalizados</li>
                    )}
                    <li>A pontuação total de um atleta nunca fica negativa</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exemplos de Cenários */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Exemplos de Cenários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examples.map((example, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{example.scenario}</h4>
                      <Badge variant="outline" className="font-bold text-lg">
                        {example.totalPoints} pts
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Vencedor: #{example.winnerRanking} vs Perdedor: #{example.loserRanking}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Pontos base:</span>
                        <span>{example.basePoints}</span>
                      </div>
                      {example.multiplier && (
                        <div className="flex justify-between text-blue-600">
                          <span>Multiplicador:</span>
                          <span>x{example.multiplier}</span>
                        </div>
                      )}
                      {example.bonusPoints && example.bonusPoints > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Bônus upset:</span>
                          <span>+{example.bonusPoints}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      {example.explanation.map((exp, i) => (
                        <div key={i}>• {exp}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
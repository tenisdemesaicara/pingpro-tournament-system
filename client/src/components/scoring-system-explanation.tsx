import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, Trophy, Target, Calculator, Medal, AlertTriangle } from "lucide-react";

interface ScoringSystemExplanationProps {
  showTitle?: boolean;
  variant?: "card" | "accordion" | "inline";
  scoringSystem?: any; // Dados do sistema de pontuação do torneio específico
}

export default function ScoringSystemExplanation({ 
  showTitle = true, 
  variant = "card",
  scoringSystem = null
}: ScoringSystemExplanationProps) {
  const content = (
    <>
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Sistema de Pontuação</h3>
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="current-system">
          <AccordionTrigger className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-500" />
            {scoringSystem?.enabled ? 'Sistema Avançado (Ativo neste Torneio)' : 'Sistema Simples (Ativo no Ranking Principal)'}
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            {scoringSystem?.enabled ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Sistema avançado configurado para este torneio:</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>🏆 Pontos base por vitória:</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">{scoringSystem.basePoints || 10} pontos</Badge>
                  </div>
                  {scoringSystem.bonusForUpset > 0 && (
                    <div className="flex items-center justify-between">
                      <span>💥 Bônus por upset:</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800">+{scoringSystem.bonusForUpset} pontos</Badge>
                    </div>
                  )}
                  {scoringSystem.losePenaltyEnabled && (
                    <div className="flex items-center justify-between">
                      <span>⚡ Penalidade por derrota:</span>
                      <Badge variant="outline" className="bg-red-100 text-red-800">-{scoringSystem.losePenaltyPoints || 3} pontos</Badge>
                    </div>
                  )}
                  {scoringSystem.useRankingMultiplier && (
                    <div className="flex items-center justify-between">
                      <span>📊 Multiplicador de ranking:</span>
                      <Badge variant="outline" className="bg-purple-100 text-purple-800">{scoringSystem.rankingFormula || 'linear'}</Badge>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Sistema atualmente usado no ranking:</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>🏆 Vitória:</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">3 pontos</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>⚔️ Derrota (participação):</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">1 ponto</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>❌ Não participação:</span>
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">0 pontos</Badge>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <h5 className="font-medium">Cálculo do ranking:</h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Ordenação principal: <strong>Total de pontos</strong> (decrescente)</li>
                <li>Ordenação secundária: <strong>Taxa de vitória</strong> (decrescente)</li>
                <li>A posição final é determinada pela somatória de pontos de todos os torneios da temporada</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h5 className="font-medium mb-2">Exemplo prático:</h5>
              <p className="text-sm">Atleta joga 5 partidas: 3 vitórias + 2 derrotas</p>
              <p className="text-sm">Pontos: (3×3) + (2×1) = <strong>11 pontos</strong></p>
              <p className="text-sm">Taxa de vitória: 3/5 = <strong>60%</strong></p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="advanced-system">
          <AccordionTrigger className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-purple-500" />
            Sistema Avançado (Configurável por Torneio)
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Sistema mais sofisticado com múltiplas opções</h4>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="font-medium flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4" />
                  1. Pontuação por Partidas
                </h5>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li><strong>Pontos base por vitória:</strong> Configurável (padrão: 10 pontos)</li>
                  <li><strong>Multiplicadores de ranking:</strong> Ajusta pontos baseado na diferença de ranking entre oponentes</li>
                </ul>

                <div className="mt-3 space-y-2">
                  <h6 className="font-medium text-sm">Fórmulas de multiplicador:</h6>
                  <div className="grid gap-2">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs">
                      <strong>Linear:</strong> ±1% por posição de diferença
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs">
                      <strong>Exponencial:</strong> Recompensa maior para upsets grandes
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs">
                      <strong>Bracket (Faixas):</strong>
                      <ul className="mt-1 space-y-1 ml-4">
                        <li>• Upset massivo (50+ posições): 2.0x pontos</li>
                        <li>• Upset grande (25-50): 1.5x pontos</li>
                        <li>• Upset médio (10-25): 1.25x pontos</li>
                        <li>• Vitória muito esperada (50+): 0.5x pontos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h5 className="font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  2. Bônus e Penalidades
                </h5>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                  <li><strong>Bônus por Upset:</strong> Pontos extras por vencer oponente melhor rankeado</li>
                  <li><strong>Penalidade por derrota:</strong> Pontos negativos configuráveis</li>
                  <li><strong>Fórmulas customizadas:</strong> Permite cálculos complexos personalizados</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h5 className="font-medium flex items-center gap-2 mb-2">
                  <Medal className="h-4 w-4" />
                  3. Pontuação por Colocação Final
                </h5>
                
                <div className="space-y-3">
                  <div>
                    <h6 className="font-medium text-sm">Sistema Dinâmico (ajustado por nº de participantes):</h6>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs">
                        <strong>Campeão:</strong> 50 pontos base × multiplicador
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                        <strong>Vice:</strong> 30 pontos base × multiplicador
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-xs">
                        <strong>Semifinalistas:</strong> 20 pontos base × multiplicador
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-xs">
                        <strong>Quarterinalistas:</strong> 10 pontos base × multiplicador
                      </div>
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <div><strong>Sistema Fixo:</strong> Pontos predefinidos por colocação</div>
                    <div><strong>Sistema Percentual:</strong> Pontos proporcionais à colocação relativa</div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="table-tennis-rules">
          <AccordionTrigger className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-orange-500" />
            Características Específicas do Tênis de Mesa
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">🏓</span>
                    <span><strong>Não há disputa de 3º lugar</strong> - semifinalistas derrotados ficam automaticamente em 3º</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">📊</span>
                    <span><strong>Rankings menores = melhores posições</strong> (#1 melhor que #100)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">⚡</span>
                    <span><strong>Upset = vencer alguém com ranking melhor</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">🛡️</span>
                    <span><strong>Pontuação mínima sempre 0</strong> (não fica negativa)</span>
                  </li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="current-vs-advanced">
          <AccordionTrigger className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-500" />
            Sistema Atual vs Avançado
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">✅ Atualmente ativo:</h5>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Sistema simples (3 pontos vitória, 1 ponto participação)
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">🔧 Disponível:</h5>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  Sistema avançado configurável por torneio, com opções como:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-blue-600 dark:text-blue-400 ml-4">
                  <li>Multiplicadores de ranking</li>
                  <li>Bônus por upset</li>
                  <li>Penalidades estratégicas</li>
                  <li>Pontuação por colocação final</li>
                  <li>Fórmulas customizadas</li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  💡 <strong>Nota:</strong> O sistema avançado permite torneios com pontuações mais sofisticadas, 
                  mas requer configuração específica para cada competição.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );

  if (variant === "card") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Guia de Pontuação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  if (variant === "accordion") {
    return <div className="w-full">{content}</div>;
  }

  return <div className="space-y-4">{content}</div>;
}
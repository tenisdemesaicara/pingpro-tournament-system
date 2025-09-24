import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, UserPlus, X } from "lucide-react";
import type { Athlete, Category, Tournament } from "@shared/schema";
import { isEligibleForCategory } from "@shared/utils";

interface DirectEnrollmentInterfaceProps {
  tournamentId: string;
  athletes?: Athlete[];
  categories?: Category[];
  existingParticipants?: any[];
  tournament?: Tournament;
}

export function DirectEnrollmentInterface({ 
  tournamentId, 
  athletes = [], 
  categories = [],
  existingParticipants = [],
  tournament
}: DirectEnrollmentInterfaceProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Verificar se categoria selecionada é mista
  const isSelectedCategoryMixed = () => {
    if (!selectedCategory) return false;
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return false;
    const categoryGender = category.gender?.toLowerCase();
    return categoryGender === 'misto' || categoryGender === 'mixed';
  };

  // Obter gêneros disponíveis para a categoria selecionada
  const getAvailableGenders = () => {
    if (!selectedCategory) return [];
    
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return [];

    const categoryGender = category.gender?.toLowerCase();

    // Se categoria é mista, NÃO mostrar seletor de gênero (return vazio)
    if (categoryGender === 'misto' || categoryGender === 'mixed') {
      return [];
    }

    // Para categorias específicas, usar apenas o gênero da categoria
    if (categoryGender === 'masculino' || categoryGender === 'feminino') {
      return [categoryGender];
    }

    // Fallback: obter gêneros dos atletas disponíveis
    const genders = athletes
      .map(a => a.gender?.toLowerCase())
      .filter(Boolean);
    
    return Array.from(new Set(genders));
  };

  // Filtrar atletas que já não estão inscritos E que estejam aprovados
  // CORRIGIDO: usar p.athlete.id em vez de p.id (que é o ID da participação)
  // CORRIGIDO: usar status 'approved' em vez de 'active'
  const enrolledAthleteIds = existingParticipants.map(p => p.athlete?.id || p.athleteId || p.id);
  const availableAthletes = athletes.filter(athlete => 
    !enrolledAthleteIds.includes(athlete.id) && athlete.status === 'approved'
  );

  // Filtrar atletas baseado nos filtros selecionados
  let filteredAthletes: Athlete[] = [];

  // Para categorias mistas: só precisa categoria selecionada
  // Para outras categorias: precisa categoria E gênero selecionados
  const shouldShowAthletes = selectedCategory && (isSelectedCategoryMixed() || selectedGender);

  if (shouldShowAthletes && tournament) {
    const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
    if (selectedCategoryData) {
      const parsed = parseInt(String(tournament.season ?? ""), 10);
      const tournamentYear = Number.isFinite(parsed) ? parsed : new Date().getFullYear();
      
      // Primeiro, filtrar por busca
      let filtered = availableAthletes.filter(athlete =>
        athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (athlete.club && athlete.club.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // Depois, filtrar por categoria (idade) e gênero (se necessário)
      filteredAthletes = filtered.filter(athlete => {
        // Filtro por idade (se a categoria tem limites de idade)
        const ageEligible = isEligibleForCategory(
          athlete.birthDate,
          tournamentYear,
          selectedCategoryData.minAge,
          selectedCategoryData.maxAge
        );
        
        // Para categorias mistas: aceitar qualquer gênero
        if (isSelectedCategoryMixed()) {
          return ageEligible;
        }
        
        // Para outras categorias: filtrar por gênero selecionado
        const genderEligible = athlete.gender?.toLowerCase() === selectedGender.toLowerCase();
        return ageEligible && genderEligible;
      });
    }
  }

  // Limpar seleções quando a categoria ou gênero mudam
  useEffect(() => {
    setSelectedAthletes([]);
  }, [selectedCategory, selectedGender]);

  // Limpar gênero quando categoria muda
  useEffect(() => {
    setSelectedGender("");
  }, [selectedCategory]);

  const enrollAthletesMutation = useMutation({
    mutationFn: async (data: { athleteIds: string[], categoryId?: string }) => {
      return apiRequest('POST', `/api/tournaments/${tournamentId}/enroll-athletes`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'participants'] });
      toast({
        title: "Sucesso!",
        description: `${selectedAthletes.length} atleta(s) inscrito(s) com sucesso!`,
      });
      setSelectedAthletes([]);
      setSelectedCategory("");
      setSelectedGender("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao inscrever atletas",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover participante do torneio
  const removeParticipantMutation = useMutation({
    mutationFn: async (athleteId: string) => {
      return apiRequest('DELETE', `/api/tournaments/${tournamentId}/participants/${athleteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId, 'participants'] });
      toast({
        title: "Participante Removido",
        description: "Atleta foi removido do torneio com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao remover atleta do torneio",
        variant: "destructive",
      });
    },
  });

  const handleAthleteToggle = (athleteId: string) => {
    setSelectedAthletes(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleEnrollment = () => {
    if (selectedAthletes.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um atleta para inscrever",
        variant: "destructive",
      });
      return;
    }

    enrollAthletesMutation.mutate({
      athleteIds: selectedAthletes,
      categoryId: selectedCategory || undefined
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Inscrição Direta de Atletas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Inscreva atletas diretamente no torneio usando o consentimento LGPD já coletado.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="select" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select" data-testid="tab-select-athletes">
              Selecionar Atletas
            </TabsTrigger>
            <TabsTrigger value="enrolled" data-testid="tab-enrolled-athletes">
              Atletas Inscritos ({existingParticipants.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="select" className="space-y-4">
            {/* Filtros Obrigatórios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="select-category">Categoria *</Label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => {
                    setSelectedCategory(value || "");
                    setSelectedGender(""); // Limpar gênero ao mudar categoria
                  }}
                >
                  <SelectTrigger data-testid="select-enrollment-category">
                    <SelectValue placeholder="Escolha uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Naipe/Gênero OU Indicação de Categoria Mista */}
              {selectedCategory && (
                <div>
                  {getAvailableGenders().length > 0 ? (
                    // Categoria com gênero específico - mostrar seletor
                    <>
                      <Label htmlFor="select-gender">Naipe *</Label>
                      <Select 
                        value={selectedGender} 
                        onValueChange={(value) => setSelectedGender(value || "")}
                      >
                        <SelectTrigger data-testid="select-enrollment-gender">
                          <SelectValue placeholder="Escolha o naipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableGenders().map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender === 'masculino' ? 'Masculino' : 'Feminino'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : isSelectedCategoryMixed() ? (
                    // Categoria mista - mostrar indicação clara
                    <>
                      <Label>Naipe</Label>
                      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" data-testid="text-mixed-category-indicator">
                        <span className="text-foreground">🔀 Categoria Mista (Ambos os gêneros)</span>
                        <Badge variant="secondary" className="ml-2">Misto</Badge>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              <div>
                <Label htmlFor="search-athletes">Buscar Atletas</Label>
                <Input
                  id="search-athletes"
                  data-testid="input-search-athletes"
                  placeholder="Nome do atleta ou clube..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedCategory || (!isSelectedCategoryMixed() && !selectedGender)}
                />
              </div>
            </div>

            {/* Lista de Atletas Disponíveis */}
            <div className="space-y-2">
              {!shouldShowAthletes ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-6xl opacity-20">👥</div>
                    <p className="text-muted-foreground text-lg font-medium">
                      {!selectedCategory 
                        ? 'Selecione uma categoria para continuar'
                        : isSelectedCategoryMixed()
                        ? 'Atletas carregando para categoria mista...'
                        : 'Selecione um naipe para ver os atletas'
                      }
                    </p>
                    <p className="text-muted-foreground text-sm max-w-md">
                      {!selectedCategory 
                        ? 'Escolha uma categoria no filtro acima.'
                        : isSelectedCategoryMixed()
                        ? 'Esta categoria aceita atletas de ambos os gêneros.'
                        : 'Escolha o naipe para visualizar os atletas elegíveis para inscrição.'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label>
                      Atletas Disponíveis ({filteredAthletes.length})
                      {selectedCategory && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          - {categories.find(c => c.id === selectedCategory)?.name}
                          {isSelectedCategoryMixed() 
                            ? ' (Ambos os gêneros)' 
                            : selectedGender ? ` (${selectedGender === 'masculino' ? 'Masculino' : 'Feminino'})` : ''
                          }
                        </span>
                      )}
                    </Label>
                    {selectedAthletes.length > 0 && (
                      <Badge variant="secondary">
                        {selectedAthletes.length} selecionado(s)
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                    {filteredAthletes.length === 0 ? (
                      <div className="col-span-full text-center text-muted-foreground py-8">
                        Nenhum atleta encontrado com este filtro
                      </div>
                    ) : (
                      filteredAthletes.map((athlete) => (
                    <Card 
                      key={athlete.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedAthletes.includes(athlete.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleAthleteToggle(athlete.id)}
                      data-testid={`athlete-card-${athlete.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{athlete.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {athlete.club && `${athlete.club} - `}
                              {athlete.city}, {athlete.state}
                            </p>
                            {athlete.category && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {athlete.category}
                              </Badge>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedAthletes.includes(athlete.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleAthleteToggle(athlete.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4"
                            data-testid={`checkbox-athlete-${athlete.id}`}
                          />
                        </div>
                      </CardContent>
                      </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Botão de Inscrição */}
            <div className="flex justify-end">
              <Button
                onClick={handleEnrollment}
                disabled={selectedAthletes.length === 0 || enrollAthletesMutation.isPending}
                data-testid="button-enroll-athletes"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {enrollAthletesMutation.isPending 
                  ? "Inscrevendo..." 
                  : `Inscrever ${selectedAthletes.length || ''} Atleta${selectedAthletes.length !== 1 ? 's' : ''}`
                }
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="enrolled" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {existingParticipants.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  Nenhum atleta inscrito ainda
                </div>
              ) : (
                existingParticipants.map((participant, index) => (
                  <Card key={participant.id || index} className="relative">
                    <CardContent className="p-3">
                      <div className="pr-8">
                        <p className="font-medium text-sm">{participant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {participant.club && `${participant.club} - `}
                          {participant.city}, {participant.state}
                        </p>
                        {participant.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {participant.category}
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja remover ${participant.name} do torneio?`)) {
                            removeParticipantMutation.mutate(participant.athleteId || participant.id);
                          }
                        }}
                        disabled={removeParticipantMutation.isPending}
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-remove-participant-${participant.id || index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default DirectEnrollmentInterface;
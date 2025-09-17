import { useState } from "react";
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
import { Plus, UserPlus } from "lucide-react";
import type { Athlete, Category } from "@shared/schema";

interface DirectEnrollmentInterfaceProps {
  tournamentId: string;
  athletes?: Athlete[];
  categories?: Category[];
  existingParticipants?: any[];
}

export function DirectEnrollmentInterface({ 
  tournamentId, 
  athletes = [], 
  categories = [],
  existingParticipants = []
}: DirectEnrollmentInterfaceProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar atletas que já não estão inscritos
  const enrolledAthleteIds = existingParticipants.map(p => p.athleteId || p.id);
  const availableAthletes = athletes.filter(athlete => 
    !enrolledAthleteIds.includes(athlete.id)
  );

  // Filtrar atletas por termo de busca
  const filteredAthletes = availableAthletes.filter(athlete =>
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (athlete.club && athlete.club.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao inscrever atletas",
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
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search-athletes">Buscar Atletas</Label>
                <Input
                  id="search-athletes"
                  data-testid="input-search-athletes"
                  placeholder="Nome do atleta ou clube..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {categories.length > 0 && (
                <div>
                  <Label htmlFor="select-category">Categoria (Opcional)</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-enrollment-category">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({category.gender === 'mixed' ? 'Misto' : category.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Lista de Atletas Disponíveis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Atletas Disponíveis ({filteredAthletes.length})</Label>
                {selectedAthletes.length > 0 && (
                  <Badge variant="secondary">
                    {selectedAthletes.length} selecionado(s)
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                {filteredAthletes.length === 0 ? (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    {availableAthletes.length === 0 
                      ? "Todos os atletas já estão inscritos no torneio"
                      : "Nenhum atleta encontrado com este filtro"
                    }
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
                  <Card key={participant.id || index}>
                    <CardContent className="p-3">
                      <div>
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
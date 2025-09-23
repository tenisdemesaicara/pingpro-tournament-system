import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { type TournamentWithParticipants, type Athlete } from "@shared/schema";

interface ParticipantsWithFiltersProps {
  tournament: TournamentWithParticipants;
  athletes: Athlete[];
}

export default function ParticipantsWithFilters({ tournament, athletes }: ParticipantsWithFiltersProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");

  // Obter categorias únicas do torneio
  const categories = tournament.categories || [];

  // Obter participantes inscritos no torneio
  const participants = tournament.participants || [];

  // Criar mapa de atletas para acesso rápido
  const athleteMap = useMemo(() => {
    const map = new Map();
    athletes.forEach(athlete => {
      map.set(athlete.id, athlete);
    });
    return map;
  }, [athletes]);

  // Verificar se a categoria selecionada é mista
  const isMixedCategory = () => {
    if (!selectedCategory) return false;
    const category = categories.find(c => c.id === selectedCategory);
    return category && (
      category.gender?.toLowerCase() === 'misto' || 
      category.gender?.toLowerCase() === 'mixed'
    );
  };

  // Obter gêneros disponíveis para a categoria selecionada
  const getAvailableGenders = () => {
    if (!selectedCategory) return [];
    
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return [];

    const categoryGender = category.gender?.toLowerCase();

    // Se categoria é mista, permitir escolher masculino E feminino
    if (categoryGender === 'misto' || categoryGender === 'mixed') {
      return ['masculino', 'feminino'];
    }

    // Para categorias específicas, usar apenas o gênero da categoria
    if (categoryGender === 'masculino' || categoryGender === 'feminino') {
      return [categoryGender];
    }

    // Fallback: obter gêneros dos atletas participantes desta categoria
    const genders = participants
      .filter(p => (p as any).categoryId === selectedCategory || (p as any).category === selectedCategory)
      .map(p => p.gender?.toLowerCase())
      .filter(Boolean);
    
    return Array.from(new Set(genders));
  };

  // Filtrar participantes baseado nos filtros selecionados
  const filteredParticipants = useMemo(() => {
    if (!selectedCategory) return [];

    // Filtrar por categoria
    let filtered = participants.filter(p => 
      (p as any).categoryId === selectedCategory || 
      (p as any).category === selectedCategory
    );

    // Se um gênero específico foi selecionado, filtrar por ele
    if (selectedGender) {
      filtered = filtered.filter(p => p.gender?.toLowerCase() === selectedGender.toLowerCase());
    }

    return filtered;
  }, [participants, selectedCategory, selectedGender]);

  // Obter informações completas do atleta participante
  const getParticipantInfo = (participant: any) => {
    const categoryId = participant.categoryId || participant.category;
    const category = categories.find(c => c.id === categoryId);
    
    return {
      ...participant,
      category,
      name: participant.name || 'Nome não disponível',
      club: participant.club || '',
      city: participant.city || '',
      state: participant.state || '',
      photo: participant.photoUrl || '',
      gender: participant.gender || ''
    };
  };

  // Função para obter nome da categoria
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Categoria';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participantes Inscritos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="grid gap-4 mb-6 sm:grid-cols-2">
          {/* Filtro por Categoria */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Filtrar por Categoria
            </label>
            <Select 
              value={selectedCategory} 
              onValueChange={(value) => {
                setSelectedCategory(value || "");
                setSelectedGender(""); // Limpar gênero ao mudar categoria
              }}
            >
              <SelectTrigger 
                data-testid="filter-category" 
                className="w-full"
              >
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

          {/* Filtro por Naipe/Gênero */}
          {selectedCategory && getAvailableGenders().length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Filtrar por Naipe
              </label>
              <Select 
                value={selectedGender} 
                onValueChange={(value) => setSelectedGender(value || "")}
              >
                <SelectTrigger 
                  data-testid="filter-gender" 
                  className="w-full"
                >
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
            </div>
          )}
        </div>

        {/* Lista de Participantes */}
        {!selectedCategory || !selectedGender ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="text-6xl opacity-20">👥</div>
              <p className="text-muted-foreground text-lg font-medium">
                {!selectedCategory 
                  ? 'Selecione uma categoria para continuar'
                  : 'Selecione um naipe para ver os participantes'
                }
              </p>
              <p className="text-muted-foreground text-sm max-w-md">
                {!selectedCategory 
                  ? 'Escolha uma categoria no filtro acima.'
                  : 'Escolha o naipe para visualizar os atletas inscritos nessa categoria.'
                }
              </p>
            </div>
          </div>
        ) : filteredParticipants.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Mostrando {filteredParticipants.length} participantes - {getCategoryName(selectedCategory)} ({selectedGender === 'masculino' ? 'Masculino' : 'Feminino'})
            </div>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredParticipants.map((participant) => {
                const info = getParticipantInfo(participant);
                
                return (
                  <div key={participant.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      {/* Foto do Atleta */}
                      <Avatar className="w-16 h-16 flex-shrink-0">
                        {info.photo ? (
                          <AvatarImage 
                            src={info.photo} 
                            alt={info.name}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="bg-orange-100 text-orange-600 font-semibold">
                          {info.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Informações do Atleta */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm md:text-base break-words">
                          {info.name}
                        </h4>
                        
                        <div className="text-xs md:text-sm text-muted-foreground mt-2 space-y-1">
                          {info.club && (
                            <p className="flex items-center">
                              <span className="font-medium">Clube:</span>
                              <span className="ml-1">{info.club}</span>
                            </p>
                          )}
                          
                          {(info.city || info.state) && (
                            <p className="flex items-center">
                              <span className="font-medium">Local:</span>
                              <span className="ml-1">
                                {[info.city, info.state].filter(Boolean).join(', ')}
                              </span>
                            </p>
                          )}

                          {info.category && (
                            <div className="mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {info.category.name}
                              </Badge>
                              {info.gender && (
                                <Badge variant="outline" className="text-xs ml-1">
                                  {info.gender === 'masculino' ? 'Masculino' : 
                                   info.gender === 'feminino' ? 'Feminino' : 'Misto'}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum participante encontrado nesta categoria e naipe.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
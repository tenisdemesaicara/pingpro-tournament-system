import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X } from "lucide-react";
import { type Category } from "@shared/schema";

interface ManageTournamentCategoriesProps {
  tournamentId: string;
  currentCategories: Category[];
}

export default function ManageTournamentCategories({ 
  tournamentId, 
  currentCategories 
}: ManageTournamentCategoriesProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Buscar todas as categorias ativas do banco
  const { data: allDatabaseCategories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => fetch('/api/categories').then(res => res.json()),
    enabled: open
  });

  const [selectedCategories, setSelectedCategories] = useState<{[key: string]: string[]}>({});
  const [categoryFormats, setCategoryFormats] = useState<{[key: string]: string}>({});
  const [categoryLeagueSettings, setCategoryLeagueSettings] = useState<{[key: string]: {isRoundTrip: boolean}}>({});
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryFormats, setEditCategoryFormats] = useState<{[key: string]: string}>({});

  // Função para obter o nome de exibição do formato
  const getFormatDisplayName = (format: string) => {
    if (format === 'league_round_trip') return 'Liga (Ida e Volta)';
    if (format === 'league_single') return 'Liga (Ida)';
    return formatOptions.find(f => f.value === format)?.label || 'Eliminação Simples';
  };

  // Opções de formato disponíveis
  const formatOptions = [
    { value: "single_elimination", label: "Eliminação Simples", description: "Mata-mata tradicional" },
    { value: "double_elimination", label: "Eliminação Dupla", description: "Segunda chance para todos os participantes" },
    { value: "round_robin", label: "Todos contra Todos", description: "Cada participante enfrenta todos os outros" },
    { value: "swiss", label: "Sistema Suíço", description: "Emparelhamentos baseados na performance" },
    { value: "league", label: "Liga", description: "Sistema de pontos corridos" },
    { value: "cup", label: "Copa", description: "Sistema de copa" },
    { value: "group_stage_knockout", label: "Grupos + Eliminatórias", description: "Fase de grupos seguida de mata-mata" },
  ];

  // Update tournament categories mutation
  const updateCategoriesMutation = useMutation({
    mutationFn: (categories: any[]) => 
      apiRequest('PATCH', `/api/tournaments/${tournamentId}`, { categories }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      toast({
        title: "Sucesso!",
        description: "Categorias do torneio atualizadas com sucesso!",
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar categorias do torneio.",
        variant: "destructive",
      });
    }
  });

  // Remove tournament category mutation
  const removeCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => 
      apiRequest('DELETE', `/api/tournaments/${tournamentId}/categories/${categoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      toast({
        title: "Categoria Removida",
        description: "A categoria foi removida do torneio com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Erro ao remover categoria:", error);
      const errorMessage = error?.message || "Não foi possível remover a categoria.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleCategoryGenderToggle = (categoryName: string, gender: string) => {
    setSelectedCategories(prev => {
      const current = prev[categoryName] || [];
      const isSelected = current.includes(gender);
      
      return {
        ...prev,
        [categoryName]: isSelected 
          ? current.filter(g => g !== gender)
          : [...current, gender]
      };
    });
  };

  const handleCategoryFormatChange = (categoryName: string, format: string) => {
    setCategoryFormats(prev => ({
      ...prev,
      [categoryName]: format
    }));
  };

  const handleLeagueSettingChange = (categoryName: string, isRoundTrip: boolean) => {
    setCategoryLeagueSettings(prev => ({
      ...prev,
      [categoryName]: { isRoundTrip }
    }));
  };

  // Update existing category format mutation
  const updateCategoryFormatMutation = useMutation({
    mutationFn: async ({ categoryId, format, leagueSettings }: { categoryId: string, format: string, leagueSettings?: { isRoundTrip: boolean } }) => {
      const payload: any = { format };
      if (leagueSettings) {
        payload.leagueSettings = leagueSettings;
      }
      return apiRequest('PATCH', `/api/tournaments/${tournamentId}/categories/${categoryId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      toast({
        title: "Sucesso!",
        description: "Formato da categoria atualizado com sucesso!",
      });
      setEditingCategory(null);
      setEditCategoryFormats({});
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar formato da categoria.",
        variant: "destructive",
      });
    }
  });

  const handleEditCategoryFormat = (categoryId: string, currentFormat: string) => {
    setEditingCategory(categoryId);
    setEditCategoryFormats(prev => ({
      ...prev,
      [categoryId]: currentFormat
    }));
  };

  const saveEditedCategoryFormat = (categoryId: string) => {
    const newFormat = editCategoryFormats[categoryId];
    if (newFormat && newFormat !== '') {
      // Buscar nome da categoria para as configurações de Liga
      const category = currentCategories.find(c => c.id === categoryId);
      const categoryName = category?.name || '';
      
      // Preparar payload com configurações de Liga se necessário
      const payload: any = { categoryId, format: newFormat };
      
      if (newFormat === 'league') {
        const leagueSettings = categoryLeagueSettings[categoryName];
        payload.leagueSettings = leagueSettings || { isRoundTrip: false };
      }
      
      updateCategoryFormatMutation.mutate(payload);
    }
  };

  const addCustomCategory = () => {
    const newCategory = {
      id: `custom-${Date.now()}`,
      name: "",
      description: "",
      minAge: null as number | null,
      maxAge: null as number | null,
      format: "single_elimination",
    };
    
    setCustomCategories(prev => [...prev, newCategory]);
  };

  const removeCustomCategory = (categoryId: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const updateCustomCategory = (categoryId: string, field: string, value: any) => {
    setCustomCategories(prev => 
      prev.map(c => c.id === categoryId ? { ...c, [field]: value } : c)
    );
  };

  const handleSave = () => {
    // Get existing categories
    const existingCategoriesData = currentCategories.map(cat => ({
      name: cat.name,
      description: cat.description,
      minAge: cat.minAge,
      maxAge: cat.maxAge,
      gender: cat.gender,
      isActive: cat.isActive,
      format: (cat as any).format || 'single_elimination',
    }));

    // Função para normalizar nome base da categoria (remover sufixos de gênero)
    const normalizeBaseName = (name: string) => {
      return name.replace(/ (Masculino|Feminino|Misto)$/, '');
    };

    // Função para criar nome completo da categoria
    const createFullCategoryName = (baseName: string, gender: string) => {
      const normalizedBase = normalizeBaseName(baseName);
      return `${normalizedBase} ${gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}`;
    };

    // Build new categories from selections (incluindo tanto banco quanto customizadas)
    const allCategoriesForSearch = [...availableDatabaseCategories, ...customCategories];
    
    const newCategoriesToAdd = Object.entries(selectedCategories).flatMap(([categoryName, genders]) => 
      genders.map(gender => {
        const baseCategory = allCategoriesForSearch.find(c => c.name === categoryName);
        const categoryFormat = categoryFormats[categoryName] || 'single_elimination';
        
        return {
          name: createFullCategoryName(categoryName, gender),
          description: baseCategory?.description || '',
          minAge: baseCategory?.minAge || null,
          maxAge: baseCategory?.maxAge || null,
          gender: gender,
          isActive: true,
          format: categoryFormat,
        };
      })
    );

    // Não duplicar - todas as categorias (banco + customizadas) já foram processadas acima
    const allNewCategories = newCategoriesToAdd;
    
    // Filter out duplicates based on category name
    const existingNames = new Set(existingCategoriesData.map(cat => cat.name));
    const uniqueNewCategories = allNewCategories.filter(cat => !existingNames.has(cat.name));

    if (uniqueNewCategories.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhuma categoria nova foi selecionada ou todas já existem no torneio.",
        variant: "destructive",
      });
      return;
    }

    // Combine existing + new categories
    const allCategoriesToSend = [...existingCategoriesData, ...uniqueNewCategories];
    
    updateCategoriesMutation.mutate(allCategoriesToSend);
  };

  // Obter categorias disponíveis do banco de dados
  const getAvailableDatabaseCategories = () => {
    // Função para normalizar nome da categoria (remover sufixos de gênero)
    const normalizeBaseName = (name: string) => {
      return name.replace(/\s+(Masculino|Feminino|Misto|Mixed)$/i, '').trim();
    };

    // DEBUG: Vamos ver o que está acontecendo
    console.log('🔍 DEBUG - Categorias atuais do torneio:', currentCategories.map(cat => ({
      name: cat.name,
      gender: cat.gender,
      baseName: normalizeBaseName(cat.name)
    })));

    // Criar mapa das categorias atuais por nome base (sem Masculino/Feminino/Misto)
    const currentCategoryMap = new Map();
    currentCategories.forEach(cat => {
      // Extrair nome base removendo sufixos de gênero
      const baseName = normalizeBaseName(cat.name);
      
      if (!currentCategoryMap.has(baseName)) {
        currentCategoryMap.set(baseName, []);
      }
      currentCategoryMap.get(baseName).push(cat.gender);
    });

    console.log('🔍 DEBUG - Mapa de categorias usadas:', Array.from(currentCategoryMap.entries()));

    // Filtrar categorias do banco que ainda têm naipes disponíveis
    const result = allDatabaseCategories
      .filter((cat: any) => cat.isActive) // Apenas categorias ativas
      .map((cat: any) => {
        // Normalizar nome da categoria do banco também
        const categoryBaseName = normalizeBaseName(cat.name);
        const usedGenders = currentCategoryMap.get(categoryBaseName) || [];
        const availableGenders = ['masculino', 'feminino', 'misto'].filter(
          (gender: string) => !usedGenders.includes(gender)
        );

        console.log(`🔍 DEBUG - Categoria "${cat.name}" (base: "${categoryBaseName}"):`, {
          usedGenders,
          availableGenders
        });
        
        return {
          ...cat,
          availableGenders
        };
      })
      .filter((cat: any) => cat.availableGenders.length > 0); // Apenas categorias com naipes disponíveis

    return result;
  };

  const availableDatabaseCategories = getAvailableDatabaseCategories();
  const allCategories = [...availableDatabaseCategories, ...customCategories];

  // Limpar seleções inválidas quando categorias mudarem
  useEffect(() => {
    const newSelectedCategories = { ...selectedCategories };
    let hasChanges = false;

    Object.keys(selectedCategories).forEach(categoryName => {
      const category = allCategories.find(cat => cat.name === categoryName);
      if (category && category.availableGenders) {
        const validGenders = selectedCategories[categoryName].filter((gender: string) => 
          category.availableGenders.includes(gender)
        );
        if (validGenders.length !== selectedCategories[categoryName].length) {
          newSelectedCategories[categoryName] = validGenders;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setSelectedCategories(newSelectedCategories);
    }
  }, [availableDatabaseCategories, customCategories]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="edit-categories-btn">
          Editar Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias do Torneio</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current categories display */}
          <div>
            <Label className="text-base font-semibold">Categorias Atuais do Torneio</Label>
            <div className="space-y-3 mt-2 min-h-[2.5rem] p-3 border rounded-lg">
              {currentCategories.length > 0 ? (
                currentCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-sm">
                        {category.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Formato: {getFormatDisplayName((category as any).format)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {editingCategory === category.id ? (
                        <div className="flex items-center gap-2">
                          <Select 
                            value={editCategoryFormats[category.id] || (category as any).format || 'single_elimination'}
                            onValueChange={(value) => setEditCategoryFormats(prev => ({ ...prev, [category.id]: value }))}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Formato" />
                            </SelectTrigger>
                            <SelectContent>
                              {formatOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-muted-foreground">{option.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex flex-col gap-2">
                            {/* Configurações específicas para Liga quando editando */}
                            {editCategoryFormats[category.id] === 'league' && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <Label className="text-sm font-medium">Configuração da Liga:</Label>
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-${category.id}-single-round`}
                                      checked={!(categoryLeagueSettings[category.name]?.isRoundTrip ?? false)}
                                      onCheckedChange={() => handleLeagueSettingChange(category.name, false)}
                                    />
                                    <Label htmlFor={`edit-${category.id}-single-round`} className="text-sm">
                                      Apenas ida (1 rodada)
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-${category.id}-round-trip`}
                                      checked={categoryLeagueSettings[category.name]?.isRoundTrip ?? false}
                                      onCheckedChange={() => handleLeagueSettingChange(category.name, true)}
                                    />
                                    <Label htmlFor={`edit-${category.id}-round-trip`} className="text-sm">
                                      Ida e volta (2 rodadas)
                                    </Label>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {(categoryLeagueSettings[category.name]?.isRoundTrip ?? false) 
                                    ? "Cada jogador enfrentará todos os outros duas vezes (casa e fora)"
                                    : "Cada jogador enfrentará todos os outros uma vez"}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEditedCategoryFormat(category.id)}
                                disabled={updateCategoryFormatMutation.isPending}
                                data-testid={`save-format-${category.id}`}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(null);
                                  setEditCategoryFormats({});
                                }}
                                data-testid={`cancel-edit-${category.id}`}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCategoryFormat(category.id, (category as any).format || 'single_elimination')}
                            data-testid={`edit-format-${category.id}`}
                          >
                            Editar Formato
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Tem certeza que deseja remover a categoria "${category.name}" deste torneio?`)) {
                                removeCategoryMutation.mutate(category.id);
                              }
                            }}
                            disabled={removeCategoryMutation.isPending}
                            data-testid={`remove-category-${category.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Nenhuma categoria definida</p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Como Adicionar Categorias:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• As categorias listadas abaixo são do sistema e estão ativas</li>
              <li>• Apenas naipes ainda não usados neste torneio aparecerão disponíveis</li>
              <li>• Selecione os naipes (Masculino, Feminino, Misto) para as categorias desejadas</li>
              <li>• Escolha o formato do jogo para cada categoria (Eliminação Simples, Round Robin, etc.)</li>
              <li>• Clique em "Adicionar Categorias Selecionadas" para incluir no torneio</li>
              <li>• Use o X vermelho para remover categorias existentes</li>
            </ul>
          </div>

          {/* Category selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allCategories.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Selecionar Naipe:</Label>
                      <div className="flex gap-3 mt-1">
                        {/* Para categorias do banco, usar apenas naipes disponíveis */}
                        {(category.availableGenders || ['masculino', 'feminino', 'misto']).map((gender) => (
                          <div key={gender} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${category.id}-${gender}`}
                              checked={selectedCategories[category.name]?.includes(gender) || false}
                              onCheckedChange={() => handleCategoryGenderToggle(category.name, gender)}
                            />
                            <Label htmlFor={`${category.id}-${gender}`} className="text-sm capitalize">
                              {gender}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {/* Mostrar informação sobre naipes já em uso */}
                      {category.availableGenders && category.availableGenders.length < 3 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {3 - category.availableGenders.length === 1 
                            ? "1 naipe já está sendo usado neste torneio"
                            : `${3 - category.availableGenders.length} naipes já estão sendo usados neste torneio`
                          }
                        </p>
                      )}
                    </div>
                    
                    {/* Formato apenas para categorias padrão (não customizadas) */}
                    {!category.id.startsWith('custom-') && (
                      <div>
                        <Label className="text-sm">Formato do Jogo:</Label>
                        <Select 
                          value={categoryFormats[category.name] || 'single_elimination'} 
                          onValueChange={(value) => handleCategoryFormatChange(category.name, value)}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Selecione o formato" />
                          </SelectTrigger>
                          <SelectContent>
                            {formatOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">{option.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Configurações específicas para Liga */}
                        {(categoryFormats[category.name] || 'single_elimination') === 'league' && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <Label className="text-sm font-medium">Configuração da Liga:</Label>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${category.id}-single-round`}
                                  checked={!(categoryLeagueSettings[category.name]?.isRoundTrip ?? false)}
                                  onCheckedChange={() => handleLeagueSettingChange(category.name, false)}
                                />
                                <Label htmlFor={`${category.id}-single-round`} className="text-sm">
                                  Apenas ida (1 rodada)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${category.id}-round-trip`}
                                  checked={categoryLeagueSettings[category.name]?.isRoundTrip ?? false}
                                  onCheckedChange={() => handleLeagueSettingChange(category.name, true)}
                                />
                                <Label htmlFor={`${category.id}-round-trip`} className="text-sm">
                                  Ida e volta (2 rodadas)
                                </Label>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {(categoryLeagueSettings[category.name]?.isRoundTrip ?? false) 
                                ? "Cada jogador enfrentará todos os outros duas vezes (casa e fora)"
                                : "Cada jogador enfrentará todos os outros uma vez"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Custom categories section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Categorias Personalizadas</Label>
              <Button variant="outline" size="sm" onClick={addCustomCategory}>
                + Adicionar Categoria
              </Button>
            </div>
            
            {customCategories.map((category) => (
              <Card key={category.id} className="p-4 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Categoria</Label>
                    <Input
                      value={category.name}
                      onChange={(e) => updateCustomCategory(category.id, 'name', e.target.value)}
                      placeholder="Ex: Master, Juvenil..."
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={category.description}
                      onChange={(e) => updateCustomCategory(category.id, 'description', e.target.value)}
                      placeholder="Descrição da categoria"
                    />
                  </div>
                  <div>
                    <Label>Idade Mínima</Label>
                    <Input
                      type="number"
                      value={category.minAge || ''}
                      onChange={(e) => updateCustomCategory(category.id, 'minAge', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ex: 18"
                    />
                  </div>
                  <div>
                    <Label>Idade Máxima</Label>
                    <Input
                      type="number"
                      value={category.maxAge || ''}
                      onChange={(e) => updateCustomCategory(category.id, 'maxAge', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ex: 35"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Formato do Jogo</Label>
                    <Select 
                      value={category.format || 'single_elimination'} 
                      onValueChange={(value) => updateCustomCategory(category.id, 'format', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o formato" />
                      </SelectTrigger>
                      <SelectContent>
                        {formatOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Configurações específicas para Liga */}
                    {(category.format || 'single_elimination') === 'league' && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <Label className="text-sm font-medium">Configuração da Liga:</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${category.id}-single-round`}
                              checked={!(categoryLeagueSettings[category.name]?.isRoundTrip ?? false)}
                              onCheckedChange={() => handleLeagueSettingChange(category.name, false)}
                            />
                            <Label htmlFor={`${category.id}-single-round`} className="text-sm">
                              Apenas ida (1 rodada)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${category.id}-round-trip`}
                              checked={categoryLeagueSettings[category.name]?.isRoundTrip ?? false}
                              onCheckedChange={() => handleLeagueSettingChange(category.name, true)}
                            />
                            <Label htmlFor={`${category.id}-round-trip`} className="text-sm">
                              Ida e volta (2 rodadas)
                            </Label>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {(categoryLeagueSettings[category.name]?.isRoundTrip ?? false) 
                            ? "Cada jogador enfrentará todos os outros duas vezes (casa e fora)"
                            : "Cada jogador enfrentará todos os outros uma vez"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <Button variant="outline" size="sm" onClick={() => removeCustomCategory(category.id)}>
                    Remover
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Selection summary */}
          {Object.keys(selectedCategories).length > 0 && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Categorias Selecionadas para Adicionar:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedCategories).flatMap(([categoryName, genders]) => 
                  genders.map(gender => (
                    <Badge key={`${categoryName}-${gender}`} variant="outline" className="text-xs bg-green-100 dark:bg-green-900">
                      {categoryName} {gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              {Object.keys(selectedCategories).length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCategories({})}
                  data-testid="clear-selections-btn"
                >
                  Limpar Seleções
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateCategoriesMutation.isPending || Object.keys(selectedCategories).length === 0}
                data-testid="save-categories-btn"
              >
                {updateCategoriesMutation.isPending ? "Adicionando..." : "Adicionar Categorias Selecionadas"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
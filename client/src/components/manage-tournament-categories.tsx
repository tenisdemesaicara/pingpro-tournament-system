import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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

  // Same system as tournament creation: fixed categories + custom categories
  const defaultCategories = [
    { id: "sub07", name: 'Sub-07', description: 'Atletas de até 7 anos', minAge: null, maxAge: 7 },
    { id: "sub09", name: 'Sub-09', description: 'Atletas de até 9 anos', minAge: null, maxAge: 9 },
    { id: "sub11", name: 'Sub-11', description: 'Atletas de até 11 anos', minAge: null, maxAge: 11 },
    { id: "sub13", name: 'Sub-13', description: 'Atletas de até 13 anos', minAge: null, maxAge: 13 },
    { id: "sub15", name: 'Sub-15', description: 'Atletas de até 15 anos', minAge: null, maxAge: 15 },
    { id: "sub19", name: 'Sub-19', description: 'Atletas de até 19 anos', minAge: null, maxAge: 19 },
    { id: "sub21", name: 'Sub-21', description: 'Atletas de até 21 anos', minAge: null, maxAge: 21 },
    { id: "adulto", name: 'Adulto', description: 'Atletas de 22 a 29 anos', minAge: 22, maxAge: 29 },
    { id: "senior30", name: 'Sênior/Lady 30', description: 'Atletas de 30 a 34 anos', minAge: 30, maxAge: 34 },
    { id: "senior35", name: 'Sênior/Lady 35', description: 'Atletas de 35 a 39 anos', minAge: 35, maxAge: 39 },
    { id: "veterano40", name: 'Veterano 40', description: 'Atletas de 40 a 44 anos', minAge: 40, maxAge: 44 },
    { id: "veterano45", name: 'Veterano 45', description: 'Atletas de 45 a 49 anos', minAge: 45, maxAge: 49 },
    { id: "veterano50", name: 'Veterano 50', description: 'Atletas de 50 a 54 anos', minAge: 50, maxAge: 54 },
    { id: "veterano55", name: 'Veterano 55', description: 'Atletas de 55 a 59 anos', minAge: 55, maxAge: 59 },
    { id: "veterano60", name: 'Veterano 60', description: 'Atletas de 60 a 64 anos', minAge: 60, maxAge: 64 },
    { id: "veterano65", name: 'Veterano 65', description: 'Atletas de 65 a 69 anos', minAge: 65, maxAge: 69 },
    { id: "veterano70", name: 'Veterano 70', description: 'Atletas de 70 a 74 anos', minAge: 70, maxAge: 74 },
    { id: "veterano75", name: 'Veterano 75', description: 'Atletas de 75 anos ou mais', minAge: 75, maxAge: null },
    { id: "absolutoa", name: 'Absoluto A', description: 'Maior Pontuação', minAge: 14, maxAge: 100 },
    { id: "absolutob", name: 'Absoluto B', description: '2ª Divisão', minAge: 14, maxAge: 100 },
    { id: "absolutoc", name: 'Absoluto C', description: '3ª Divisão', minAge: 14, maxAge: 100 },
    { id: "absolutod", name: 'Absoluto D', description: '4ª Divisão', minAge: 14, maxAge: 100 },
  ];

  const [selectedCategories, setSelectedCategories] = useState<{[key: string]: string[]}>({});
  const [categoryFormats, setCategoryFormats] = useState<{[key: string]: string}>({});
  const [categoryLeagueSettings, setCategoryLeagueSettings] = useState<{[key: string]: {isRoundTrip: boolean}}>({});
  const [customCategories, setCustomCategories] = useState<any[]>([]);

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

    // Build new categories from selections
    const allCategories = [...defaultCategories, ...customCategories];
    
    const newCategoriesToAdd = Object.entries(selectedCategories).flatMap(([categoryName, genders]) => 
      genders.map(gender => {
        const baseCategory = allCategories.find(c => c.name === categoryName);
        
        const fullCategoryName = `${categoryName} ${gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}`;
        const categoryFormat = categoryFormats[categoryName] || 'single_elimination';
        
        return {
          name: fullCategoryName,
          description: baseCategory?.description || '',
          minAge: baseCategory?.minAge || null,
          maxAge: baseCategory?.maxAge || null,
          gender: gender,
          isActive: true,
          format: categoryFormat,
        };
      })
    );

    // Adicionar categorias customizadas completas
    const customCategoriesToAdd = customCategories
      .filter(cat => cat.name.trim() !== '')
      .flatMap(customCat => {
        const selectedGenders = selectedCategories[customCat.name] || [];
        return selectedGenders.map(gender => {
          const categoryFormat = customCat.format || 'single_elimination';
          
          return {
            name: `${customCat.name} ${gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}`,
            description: customCat.description || '',
            minAge: customCat.minAge,
            maxAge: customCat.maxAge,
            gender: gender,
            isActive: true,
            format: categoryFormat,
          };
        });
      });

    // Combinar todas as novas categorias
    const allNewCategories = [...newCategoriesToAdd, ...customCategoriesToAdd];
    
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

  const allCategories = [...defaultCategories, ...customCategories];

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
            <div className="flex flex-wrap gap-2 mt-2 min-h-[2.5rem] p-3 border rounded-lg">
              {currentCategories.length > 0 ? (
                currentCategories.map((category) => (
                  <div key={category.id} className="relative group flex items-center">
                    <Badge variant="secondary" className="text-xs pr-8">
                      {category.name}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Tem certeza que deseja remover a categoria "${category.name}" deste torneio?`)) {
                          removeCategoryMutation.mutate(category.id);
                        }
                      }}
                      disabled={removeCategoryMutation.isPending}
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                      data-testid={`remove-category-${category.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
              <li>• Selecione os naipes (Masculino, Feminino, Misto) para as categorias desejadas</li>
              <li>• Escolha o formato do jogo para cada categoria (Eliminação Simples, Round Robin, etc.)</li>
              <li>• Clique em "Adicionar Categorias Selecionadas" para incluir no torneio</li>
              <li>• As novas categorias serão adicionadas às já existentes</li>
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
                        {['masculino', 'feminino', 'misto'].map((gender) => (
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
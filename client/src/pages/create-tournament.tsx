import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Category } from "@shared/schema";
import { Plus, X, FileText, Trophy, Settings, Target } from "lucide-react";
import ScoringSystemExplanation from "@/components/scoring-system-explanation";

export default function CreateTournament() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Buscar categorias do banco de dados
  const { data: dbCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Lista fallback de categorias padrão
  const fallbackCategories = [
    { name: 'Sub-07', description: 'Atletas de até 7 anos', minAge: null, maxAge: 7 },
    { name: 'Sub-09', description: 'Atletas de até 9 anos', minAge: null, maxAge: 9 },
    { name: 'Sub-11', description: 'Atletas de até 11 anos', minAge: null, maxAge: 11 },
    { name: 'Sub-13', description: 'Atletas de até 13 anos', minAge: null, maxAge: 13 },
    { name: 'Sub-15', description: 'Atletas de até 15 anos', minAge: null, maxAge: 15 },
    { name: 'Sub-19', description: 'Atletas de até 19 anos', minAge: null, maxAge: 19 },
    { name: 'Sub-21', description: 'Atletas de até 21 anos', minAge: null, maxAge: 21 },
    { name: 'Adulto', description: 'Atletas de 22 a 29 anos', minAge: 22, maxAge: 29 },
    { name: 'Sênior/Lady 30', description: 'Atletas de 30 a 34 anos', minAge: 30, maxAge: 34 },
    { name: 'Sênior/Lady 35', description: 'Atletas de 35 a 39 anos', minAge: 35, maxAge: 39 },
    { name: 'Veterano 40', description: 'Atletas de 40 a 44 anos', minAge: 40, maxAge: 44 },
    { name: 'Veterano 45', description: 'Atletas de 45 a 49 anos', minAge: 45, maxAge: 49 },
    { name: 'Veterano 50', description: 'Atletas de 50 a 54 anos', minAge: 50, maxAge: 54 },
    { name: 'Veterano 55', description: 'Atletas de 55 a 59 anos', minAge: 55, maxAge: 59 },
    { name: 'Veterano 60', description: 'Atletas de 60 a 64 anos', minAge: 60, maxAge: 64 },
    { name: 'Veterano 65', description: 'Atletas de 65 a 69 anos', minAge: 65, maxAge: 69 },
    { name: 'Veterano 70', description: 'Atletas de 70 a 74 anos', minAge: 70, maxAge: 74 },
    { name: 'Veterano 75', description: 'Atletas de 75 anos ou mais', minAge: 75, maxAge: null },
    { name: 'Absoluto A', description: 'Maior Pontuação', minAge: 14, maxAge: 100 },
    { name: 'Absoluto B', description: '2ª Divisão', minAge: 14, maxAge: 100 },
    { name: 'Absoluto C', description: '3ª Divisão', minAge: 14, maxAge: 100 },
    { name: 'Absoluto D', description: '4ª Divisão', minAge: 14, maxAge: 100 },
  ];

  // Criar mapa único de categorias (remover duplicatas por nome)
  const uniqueCategories = new Map();
  
  // Priorizar categorias do banco
  dbCategories.forEach(cat => uniqueCategories.set(cat.name, cat));
  
  // Adicionar fallback apenas se não existir no banco
  fallbackCategories.forEach(cat => {
    if (!uniqueCategories.has(cat.name)) {
      uniqueCategories.set(cat.name, cat);
    }
  });

  const categories = Array.from(uniqueCategories.values());


  const [tournamentMode, setTournamentMode] = useState<"individual" | "team">("individual");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    format: "single_elimination",
    maxParticipants: "",
    organizer: "",
    location: "",
    season: new Date().getFullYear().toString(),
    prizePool: "",
    rules: "",
    isPublic: true,
    registrationDeadline: "",
    startDate: "",
    endDate: "",
    selectedCategories: {} as Record<string, ('feminino' | 'masculino' | 'misto')[]>, // { "Sub-11": ["feminino", "misto"] }
    categoryLimits: {} as Record<string, number>, // { "Sub-11-feminino": 32, "Sub-11-masculino": 64 }
    categoryFormats: {} as Record<string, string>, // { "Sub-11-feminino": "single_elimination", "Sub-11-masculino": "round_robin" }
    
    // Categorias personalizadas
    customCategories: [] as Array<{
      id: string;
      name: string;
      description: string;
      minAge: number | null;
      maxAge: number | null;
    }>,
    
    // Sistema de pontuação avançado
    scoringSystem: {
      enabled: false,
      basePoints: 10,
      useRankingMultiplier: false,
      rankingFormula: "linear" as "linear" | "exponential" | "bracket",
      bonusForUpset: 0,
      penaltyForLoss: 0,
      
      // Penalização de perdedores
      losePenaltyEnabled: true,
      losePenaltyPoints: 3,
      useLosePenaltyMultiplier: true,
      
      // Pontuação por colocação
      placementPointsEnabled: true,
      placementPointsFormula: "dynamic" as "dynamic" | "fixed" | "percentage",
      championPoints: 50,
      runnerUpPoints: 30,
      semifinalistPoints: 20,
      quarterfinalistPoints: 10,
      
      customFormula: "",
    },
    
    // Configurações específicas para torneios por equipe
    teamPairingMode: "ordered", // 'ordered', 'snake', 'all_pairs'
    teamMembersPerTeam: 3,
    pointsPerWin: 1,
    bestOfSetsTeam: 3
  });

  const createTournamentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/tournaments', data);
      return response.json();
    },
    onSuccess: (tournament: any) => {
      const isTeamTournament = tournament.format === 'team_round_robin' || tournament.format === 'team_group_knockout';
      
      toast({
        title: "Sucesso!",
        description: isTeamTournament 
          ? "Torneio por equipe criado! Agora você pode gerenciar suas equipes." 
          : "Torneio criado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      
      // Redirecionar para a aba adequada
      if (isTeamTournament) {
        setLocation(`/tournaments/${tournament.id}?tab=teams`);
      } else {
        setLocation(`/tournaments/${tournament.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar torneio",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combinar categorias fixas com personalizadas
    const allCategories = [...categories, ...formData.customCategories];
    
    // Converter categorias selecionadas para o formato do backend com configurações individuais
    const selectedCategoriesToSend = Object.entries(formData.selectedCategories).flatMap(([categoryName, genders]) => 
      genders.map(gender => {
        const categoryGenderKey = `${categoryName}-${gender}`;
        const baseCategory = allCategories.find(c => c.name === categoryName);
        
        return {
          name: `${categoryName} ${gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}`,
          description: baseCategory?.description || '',
          minAge: baseCategory?.minAge || null,
          maxAge: baseCategory?.maxAge || null,
          gender: gender,
          isActive: true,
          // Configurações individuais desta categoria+gênero
          participantLimit: formData.categoryLimits[categoryGenderKey] || 0,
          format: formData.categoryFormats[categoryGenderKey] || formData.format,
        };
      })
    );
    
    const dataToSend = {
      name: formData.name,
      description: formData.description,
      format: formData.format,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
      organizer: formData.organizer,
      location: formData.location,
      season: formData.season,
      prizePool: formData.prizePool,
      rules: formData.rules,
      isPublic: formData.isPublic,
      registrationDeadline: formData.registrationDeadline || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      // IMPORTANTE: Enviar as categorias criadas
      categories: selectedCategoriesToSend,
      // IMPORTANTE: Enviar sistema de pontuação
      scoringSystem: formData.scoringSystem,
    };
    
    createTournamentMutation.mutate(dataToSend as any);
  };

  // Funções para gerenciar categorias personalizadas
  const addCustomCategory = () => {
    const newCategory = {
      id: `custom-${Date.now()}`,
      name: "",
      description: "",
      minAge: null as number | null,
      maxAge: null as number | null,
    };
    
    setFormData(prev => ({
      ...prev,
      customCategories: [...prev.customCategories, newCategory]
    }));
  };

  const removeCustomCategory = (categoryId: string) => {
    setFormData(prev => {
      // Remover categoria personalizada
      const newCustomCategories = prev.customCategories.filter(c => c.id !== categoryId);
      
      // Limpar seleções e configurações desta categoria
      const newSelectedCategories = { ...prev.selectedCategories };
      const newCategoryLimits = { ...prev.categoryLimits };
      const newCategoryFormats = { ...prev.categoryFormats };
      
      const category = prev.customCategories.find(c => c.id === categoryId);
      if (category) {
        delete newSelectedCategories[category.name];
        // Limpar configurações por gênero
        ['feminino', 'masculino', 'misto'].forEach(gender => {
          const key = `${category.name}-${gender}`;
          delete newCategoryLimits[key];
          delete newCategoryFormats[key];
        });
      }
      
      return {
        ...prev,
        customCategories: newCustomCategories,
        selectedCategories: newSelectedCategories,
        categoryLimits: newCategoryLimits,
        categoryFormats: newCategoryFormats,
      };
    });
  };

  const updateCustomCategory = (categoryId: string, field: string, value: any) => {
    setFormData(prev => {
      const oldCategory = prev.customCategories.find(c => c.id === categoryId);
      
      // Validar se o nome não é duplicado (quando mudando o nome)
      if (field === 'name' && value.trim()) {
        const allCategories = [...categories, ...prev.customCategories];
        const nameExists = allCategories.some(cat => {
          if ('id' in cat) {
            // Categoria personalizada
            return cat.name.toLowerCase() === value.trim().toLowerCase() && cat.id !== categoryId;
          } else {
            // Categoria fixa
            return cat.name.toLowerCase() === value.trim().toLowerCase();
          }
        });
        
        if (nameExists) {
          toast({
            title: "Nome duplicado",
            description: `Já existe uma categoria com o nome "${value}". Escolha outro nome.`,
            variant: "destructive",
          });
          return prev; // Não atualizar se nome duplicado
        }
      }
      
      const newCustomCategories = prev.customCategories.map(category => 
        category.id === categoryId 
          ? { ...category, [field]: value }
          : category
      );
      
      // Se mudou o nome, atualizar as seleções
      let newSelectedCategories = { ...prev.selectedCategories };
      let newCategoryLimits = { ...prev.categoryLimits };
      let newCategoryFormats = { ...prev.categoryFormats };
      
      if (field === 'name' && oldCategory && oldCategory.name !== value) {
        // Transferir seleções do nome antigo para o novo
        if (newSelectedCategories[oldCategory.name]) {
          newSelectedCategories[value] = newSelectedCategories[oldCategory.name];
          delete newSelectedCategories[oldCategory.name];
          
          // Transferir configurações também
          ['feminino', 'masculino', 'misto'].forEach(gender => {
            const oldKey = `${oldCategory.name}-${gender}`;
            const newKey = `${value}-${gender}`;
            if (newCategoryLimits[oldKey] !== undefined) {
              newCategoryLimits[newKey] = newCategoryLimits[oldKey];
              delete newCategoryLimits[oldKey];
            }
            if (newCategoryFormats[oldKey] !== undefined) {
              newCategoryFormats[newKey] = newCategoryFormats[oldKey];
              delete newCategoryFormats[oldKey];
            }
          });
        }
      }
      
      return {
        ...prev,
        customCategories: newCustomCategories,
        selectedCategories: newSelectedCategories,
        categoryLimits: newCategoryLimits,
        categoryFormats: newCategoryFormats,
      };
    });
  };

  const handleCategoryGenderToggle = (categoryName: string, gender: 'feminino' | 'masculino' | 'misto') => {
    setFormData(prev => {
      const currentGenders = prev.selectedCategories[categoryName] || [];
      const categoryGenderKey = `${categoryName}-${gender}`;
      
      const newGenders = currentGenders.includes(gender)
        ? currentGenders.filter(g => g !== gender)
        : [...currentGenders, gender];
      
      const newSelectedCategories = { ...prev.selectedCategories };
      const newCategoryLimits = { ...prev.categoryLimits };
      const newCategoryFormats = { ...prev.categoryFormats };
      
      if (newGenders.length === 0) {
        delete newSelectedCategories[categoryName];
      } else {
        newSelectedCategories[categoryName] = newGenders;
      }
      
      // Gerenciar configurações individuais por categoria+gênero
      if (currentGenders.includes(gender)) {
        // Removendo: limpar configurações desta categoria+gênero específica
        delete newCategoryLimits[categoryGenderKey];
        delete newCategoryFormats[categoryGenderKey];
      } else {
        // Adicionando: inicializar com formato padrão
        newCategoryFormats[categoryGenderKey] = prev.format;
      }
      
      return {
        ...prev,
        selectedCategories: newSelectedCategories,
        categoryLimits: newCategoryLimits,
        categoryFormats: newCategoryFormats,
      };
    });
  };

  const individualFormats = [
    { value: "single_elimination", label: "Eliminação Simples", description: "Eliminação imediata após uma derrota" },
    { value: "double_elimination", label: "Eliminação Dupla", description: "Segunda chance para todos os participantes" },
    { value: "round_robin", label: "Todos contra Todos", description: "Cada participante enfrenta todos os outros" },
    { value: "swiss", label: "Sistema Suíço", description: "Emparelhamentos baseados na performance" },
    { value: "league", label: "Liga", description: "Competição contínua com ranking acumulativo" },
    { value: "group_stage_knockout", label: "Grupos + Eliminatórias", description: "Fase de grupos seguida de mata-mata" },
    { value: "custom", label: "Personalizado", description: "Formato personalizado definido pelo organizador" },
  ];

  const teamFormats = [
    { value: "team_round_robin", label: "Todos contra Todos", description: "Cada equipe enfrenta todas as outras equipes" },
    { value: "team_group_knockout", label: "Grupos + Eliminatórias", description: "Fase de grupos seguida de mata-mata entre equipes" },
  ];

  const formatOptions = tournamentMode === "team" ? teamFormats : individualFormats;

  const rankingFormulaOptions = [
    { value: "linear", label: "Linear", description: "Multiplicador linear baseado na diferença de ranking" },
    { value: "exponential", label: "Exponencial", description: "Crescimento exponencial para grandes diferenças" },
    { value: "bracket", label: "Por Chave", description: "Multiplicador baseado na posição na chave" },
  ];

  const placementFormulaOptions = [
    { value: "dynamic", label: "Dinâmico", description: "Pontos baseados no número de participantes" },
    { value: "fixed", label: "Fixo", description: "Pontos fixos por colocação" },
    { value: "percentage", label: "Percentual", description: "Percentual dos pontos base" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Criar Novo Torneio</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Configure todos os aspectos do seu torneio de tênis de mesa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 h-auto p-3 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 dark:from-blue-950 dark:via-purple-950 dark:to-green-950 border-2 border-blue-200 dark:border-blue-700 rounded-xl shadow-lg backdrop-blur-sm">
              <TabsTrigger 
                value="basic" 
                className="relative flex flex-col items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200 data-[state=active]:scale-105 hover:bg-blue-100 hover:scale-102 dark:hover:bg-blue-900/50 group"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-blue-600/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 relative z-10 group-data-[state=active]:animate-pulse" />
                <span className="hidden sm:inline relative z-10">Informações Básicas</span>
                <span className="sm:hidden relative z-10">Básico</span>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-data-[state=active]:opacity-100 group-data-[state=active]:animate-ping"></div>
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="relative flex flex-col items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-200 data-[state=active]:scale-105 hover:bg-green-100 hover:scale-102 dark:hover:bg-green-900/50 group"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400/20 to-green-600/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 relative z-10 group-data-[state=active]:animate-pulse" />
                <span className="hidden sm:inline relative z-10">Categorias</span>
                <span className="sm:hidden relative z-10">Categorias</span>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full opacity-0 group-data-[state=active]:opacity-100 group-data-[state=active]:animate-ping"></div>
              </TabsTrigger>
              <TabsTrigger 
                value="advanced" 
                className="relative flex flex-col items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-200 data-[state=active]:scale-105 hover:bg-purple-100 hover:scale-102 dark:hover:bg-purple-900/50 group"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-purple-600/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 relative z-10 group-data-[state=active]:animate-spin group-data-[state=active]:duration-slow" />
                <span className="hidden sm:inline relative z-10">Configurações Avançadas</span>
                <span className="sm:hidden relative z-10">Avançado</span>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full opacity-0 group-data-[state=active]:opacity-100 group-data-[state=active]:animate-ping"></div>
              </TabsTrigger>
              <TabsTrigger 
                value="scoring" 
                className="relative flex flex-col items-center gap-1 sm:gap-2 px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-200 data-[state=active]:scale-105 hover:bg-orange-100 hover:scale-102 dark:hover:bg-orange-900/50 group"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-400/20 to-orange-600/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                <Target className="h-4 w-4 sm:h-5 sm:w-5 relative z-10 group-data-[state=active]:animate-bounce" />
                <span className="hidden sm:inline relative z-10">Sistema de Pontuação</span>
                <span className="sm:hidden relative z-10">Pontuação</span>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full opacity-0 group-data-[state=active]:opacity-100 group-data-[state=active]:animate-ping"></div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
              <Card>
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-lg sm:text-xl">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Torneio *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        data-testid="input-tournament-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="organizer">Organizador *</Label>
                      <Input
                        id="organizer"
                        value={formData.organizer}
                        onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                        required
                        data-testid="input-organizer"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      placeholder="Descreva seu torneio, regras especiais, premiação..."
                      data-testid="textarea-description"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="location">Local</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="Ex: Clube ABC, São Paulo"
                        data-testid="input-location"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="season">Temporada</Label>
                      <Input
                        id="season"
                        value={formData.season}
                        onChange={(e) => setFormData({...formData, season: e.target.value})}
                        placeholder="Ex: 2024"
                        data-testid="input-season"
                      />
                    </div>

                    <div>
                      <Label htmlFor="prizePool">Premiação</Label>
                      <Input
                        id="prizePool"
                        value={formData.prizePool}
                        onChange={(e) => setFormData({...formData, prizePool: e.target.value})}
                        placeholder="Ex: R$ 1.000,00"
                        data-testid="input-prize-pool"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="registrationDeadline">Prazo de Inscrição</Label>
                      <Input
                        id="registrationDeadline"
                        type="datetime-local"
                        value={formData.registrationDeadline}
                        onChange={(e) => setFormData({...formData, registrationDeadline: e.target.value})}
                        data-testid="input-registration-deadline"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="startDate">Data de Início</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        data-testid="input-start-date"
                      />
                    </div>

                    <div>
                      <Label htmlFor="endDate">Data de Término</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPublic"
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData({...formData, isPublic: checked})}
                      data-testid="switch-public"
                    />
                    <Label htmlFor="isPublic">Torneio público (visível para auto-inscrição)</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Competição</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Toggle entre Individual e Equipe */}
                  <div className="space-y-3">
                    <Label>Modalidade</Label>
                    <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="individual-mode"
                          name="tournament-mode"
                          checked={tournamentMode === "individual"}
                          onChange={() => {
                            setTournamentMode("individual");
                            setFormData({...formData, format: "single_elimination"});
                          }}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="individual-mode" className="text-sm font-medium cursor-pointer">
                          🏃 Individual
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="team-mode"
                          name="tournament-mode"
                          checked={tournamentMode === "team"}
                          onChange={() => {
                            setTournamentMode("team");
                            setFormData({...formData, format: "team_round_robin"});
                          }}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="team-mode" className="text-sm font-medium cursor-pointer">
                          🏆 Por Equipes
                        </Label>
                      </div>
                    </div>
                    
                    {/* Banner explicativo para modo de equipes */}
                    {tournamentMode === "team" && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="text-blue-600 dark:text-blue-400 text-lg">🏆</div>
                          <div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              Torneios por Equipe
                            </h4>
                            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                              Equipes competem entre si com múltiplas partidas individuais por confronto.
                            </p>
                            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                              <li>• Cada confronto gera várias partidas individuais</li>
                              <li>• A equipe com mais vitórias individuais vence o confronto</li>
                              <li>• Você poderá gerenciar equipes e atletas após criar o torneio</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label htmlFor="format">Formato Principal</Label>
                    <Select value={formData.format} onValueChange={(value) => setFormData({...formData, format: value})}>
                      <SelectTrigger data-testid="select-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formatOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-sm text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maxParticipants">Limite de Participantes</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}
                      placeholder="Deixe vazio para sem limite"
                      data-testid="input-max-participants"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rules">Regras Específicas</Label>
                    <Textarea
                      id="rules"
                      value={formData.rules}
                      onChange={(e) => setFormData({...formData, rules: e.target.value})}
                      rows={4}
                      placeholder="Regras específicas deste torneio, equipamentos, tempo de partida..."
                      data-testid="textarea-rules"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Categorias do Torneio</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Para cada categoria, ative os naipes (Feminino, Masculino ou Misto) que estarão disponíveis no torneio
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map((category) => (
                      <div key={category.name} className="border rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Nome da categoria e descrição */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-foreground">{category.name}</h3>
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                            {category.minAge && category.maxAge && (
                              <p className="text-xs text-muted-foreground">
                                Idade: {category.minAge} - {category.maxAge} anos
                              </p>
                            )}
                            {category.minAge && !category.maxAge && (
                              <p className="text-xs text-muted-foreground">
                                Idade: {category.minAge} anos ou mais
                              </p>
                            )}
                          </div>

                          {/* Switches para os 3 naipes */}
                          <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8">
                            {/* Feminino */}
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={formData.selectedCategories[category.name]?.includes('feminino') || false}
                                onCheckedChange={(checked) => handleCategoryGenderToggle(category.name, 'feminino')}
                                data-testid={`switch-${category.name}-feminino`}
                              />
                              <Label className="text-sm font-medium text-pink-600">Feminino</Label>
                            </div>

                            {/* Masculino */}
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={formData.selectedCategories[category.name]?.includes('masculino') || false}
                                onCheckedChange={(checked) => handleCategoryGenderToggle(category.name, 'masculino')}
                                data-testid={`switch-${category.name}-masculino`}
                              />
                              <Label className="text-sm font-medium text-blue-600">Masculino</Label>
                            </div>

                            {/* Misto */}
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={formData.selectedCategories[category.name]?.includes('misto') || false}
                                onCheckedChange={(checked) => handleCategoryGenderToggle(category.name, 'misto')}
                                data-testid={`switch-${category.name}-misto`}
                              />
                              <Label className="text-sm font-medium text-purple-600">Misto</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}


                    {/* Seção de Categorias Personalizadas */}
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          Criar Nova Categoria Personalizada
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={addCustomCategory}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar Categoria
                          </Button>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Crie categorias totalmente novas definindo nome, idade e naipes disponíveis
                        </p>
                      </CardHeader>
                      <CardContent>
                        {formData.customCategories.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Nenhuma categoria personalizada criada.</p>
                            <p className="text-sm">Clique em "Adicionar Categoria" para criar uma nova.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {formData.customCategories.map((customCategory, index) => (
                              <div key={customCategory.id} className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <Label htmlFor={`custom-name-${customCategory.id}`}>Nome da Categoria *</Label>
                                        <Input
                                          id={`custom-name-${customCategory.id}`}
                                          placeholder="Ex: Veterano 80"
                                          value={customCategory.name}
                                          onChange={(e) => updateCustomCategory(customCategory.id, 'name', e.target.value)}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`custom-desc-${customCategory.id}`}>Descrição</Label>
                                        <Input
                                          id={`custom-desc-${customCategory.id}`}
                                          placeholder="Ex: Atletas de 80 anos ou mais"
                                          value={customCategory.description}
                                          onChange={(e) => updateCustomCategory(customCategory.id, 'description', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <Label htmlFor={`custom-min-${customCategory.id}`}>Idade Mínima</Label>
                                        <Input
                                          id={`custom-min-${customCategory.id}`}
                                          type="number"
                                          placeholder="Ex: 80"
                                          value={customCategory.minAge || ""}
                                          onChange={(e) => updateCustomCategory(customCategory.id, 'minAge', e.target.value ? parseInt(e.target.value) : null)}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`custom-max-${customCategory.id}`}>Idade Máxima</Label>
                                        <Input
                                          id={`custom-max-${customCategory.id}`}
                                          type="number"
                                          placeholder="Deixe vazio para sem limite"
                                          value={customCategory.maxAge || ""}
                                          onChange={(e) => updateCustomCategory(customCategory.id, 'maxAge', e.target.value ? parseInt(e.target.value) : null)}
                                        />
                                      </div>
                                    </div>

                                    {/* Mostrar switches apenas se a categoria tem nome */}
                                    {customCategory.name && (
                                      <>
                                        <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 pt-2">
                                          {/* Feminino */}
                                          <div className="flex items-center space-x-2">
                                            <Switch
                                              checked={formData.selectedCategories[customCategory.name]?.includes('feminino') || false}
                                              onCheckedChange={(checked) => handleCategoryGenderToggle(customCategory.name, 'feminino')}
                                              data-testid={`switch-${customCategory.name}-feminino`}
                                            />
                                            <Label className="text-sm font-medium text-pink-600">Feminino</Label>
                                          </div>

                                          {/* Masculino */}
                                          <div className="flex items-center space-x-2">
                                            <Switch
                                              checked={formData.selectedCategories[customCategory.name]?.includes('masculino') || false}
                                              onCheckedChange={(checked) => handleCategoryGenderToggle(customCategory.name, 'masculino')}
                                              data-testid={`switch-${customCategory.name}-masculino`}
                                            />
                                            <Label className="text-sm font-medium text-blue-600">Masculino</Label>
                                          </div>

                                          {/* Misto */}
                                          <div className="flex items-center space-x-2">
                                            <Switch
                                              checked={formData.selectedCategories[customCategory.name]?.includes('misto') || false}
                                              onCheckedChange={(checked) => handleCategoryGenderToggle(customCategory.name, 'misto')}
                                              data-testid={`switch-${customCategory.name}-misto`}
                                            />
                                            <Label className="text-sm font-medium text-purple-600">Misto</Label>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  
                                  <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeCustomCategory(customCategory.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Configurações avançadas das categorias selecionadas - agora individuais por naipe */}
                    {Object.keys(formData.selectedCategories).length > 0 && (
                      <Card className="mt-6">
                        <CardHeader className="pb-4 sm:pb-6">
                          <CardTitle className="text-lg sm:text-xl">Configurações das Categorias Selecionadas</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Configure individualmente cada naipe selecionado
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {Object.entries(formData.selectedCategories).map(([categoryName, genders]) => 
                              genders.map(gender => {
                                const categoryGenderKey = `${categoryName}-${gender}`;
                                const genderLabel = gender === 'masculino' ? 'Masculino' : 
                                                   gender === 'feminino' ? 'Feminino' : 'Misto';
                                const genderColor = gender === 'masculino' ? 'text-blue-600' : 
                                                   gender === 'feminino' ? 'text-pink-600' : 'text-purple-600';
                                
                                return (
                                  <div key={categoryGenderKey} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center space-x-2">
                                      <Label className="font-medium">{categoryName}</Label>
                                      <Badge variant="outline" className={genderColor}>
                                        {genderLabel}
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <Label htmlFor={`limit-${categoryGenderKey}`}>Limite de participantes</Label>
                                        <Input
                                          id={`limit-${categoryGenderKey}`}
                                          type="number"
                                          placeholder="Sem limite"
                                          value={formData.categoryLimits[categoryGenderKey] || ""}
                                          onChange={(e) => setFormData({
                                            ...formData,
                                            categoryLimits: {
                                              ...formData.categoryLimits,
                                              [categoryGenderKey]: parseInt(e.target.value) || 0
                                            }
                                          })}
                                          data-testid={`input-category-limit-${categoryGenderKey}`}
                                        />
                                      </div>
                                      
                                      <div>
                                        <Label htmlFor={`format-${categoryGenderKey}`}>Formato do torneio</Label>
                                        <Select 
                                          value={formData.categoryFormats[categoryGenderKey] || formData.format}
                                          onValueChange={(value) => setFormData({
                                            ...formData,
                                            categoryFormats: {
                                              ...formData.categoryFormats,
                                              [categoryGenderKey]: value
                                            }
                                          })}
                                        >
                                          <SelectTrigger data-testid={`select-category-format-${categoryGenderKey}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {formatOptions.map((option) => (
                                              <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Avançadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium mb-4">Configurações do Formato</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Número de jogos por partida</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="best-of-3">Melhor de 3</SelectItem>
                              <SelectItem value="best-of-5">Melhor de 5</SelectItem>
                              <SelectItem value="best-of-7">Melhor de 7</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Pontos por jogo</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="11 pontos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="11">11 pontos</SelectItem>
                              <SelectItem value="21">21 pontos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Configurações específicas para torneios por equipe */}
                    {(formData.format === 'team_round_robin' || formData.format === 'team_group_knockout') && (
                      <>
                        <Separator />
                        
                        <div>
                          <h4 className="text-lg font-medium mb-4">🏆 Configurações de Equipes</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Modo de Emparelhamento</Label>
                              <Select 
                                value={formData.teamPairingMode} 
                                onValueChange={(value) => setFormData({...formData, teamPairingMode: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ordered">Ordenado (1x1, 2x2, 3x3)</SelectItem>
                                  <SelectItem value="snake">Snake (1x3, 2x2, 3x1)</SelectItem>
                                  <SelectItem value="all_pairs">Todos vs Todos</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Como os membros das equipes enfrentam entre si
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Membros por Equipe</Label>
                              <Input
                                type="number"
                                min="2"
                                max="10"
                                value={formData.teamMembersPerTeam}
                                onChange={(e) => setFormData({...formData, teamMembersPerTeam: parseInt(e.target.value) || 3})}
                                placeholder="3"
                              />
                              <p className="text-xs text-muted-foreground">
                                Número de atletas por equipe
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Pontos por Vitória</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.pointsPerWin}
                                onChange={(e) => setFormData({...formData, pointsPerWin: parseInt(e.target.value) || 1})}
                                placeholder="1"
                              />
                              <p className="text-xs text-muted-foreground">
                                Pontos que a equipe ganha por cada partida individual vencida
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Melhor de Sets (por partida individual)</Label>
                              <Select 
                                value={formData.bestOfSetsTeam.toString()} 
                                onValueChange={(value) => setFormData({...formData, bestOfSetsTeam: parseInt(value)})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">Melhor de 3</SelectItem>
                                  <SelectItem value="5">Melhor de 5</SelectItem>
                                  <SelectItem value="7">Melhor de 7</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Sets por partida individual entre atletas
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                            <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Como funcionam os torneios por equipe:</h5>
                            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                              <li>• Cada confronto entre equipes gera várias partidas individuais</li>
                              <li>• A equipe que vencer mais partidas individuais vence o confronto</li>
                              <li>• Os atletas de cada equipe são ordenados por tabuleiro (1, 2, 3...)</li>
                              <li>• O modo de emparelhamento define como os atletas se enfrentam</li>
                            </ul>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <h4 className="text-lg font-medium mb-4">Configurações de Inscrição</h4>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch />
                          <Label>Permitir inscrições múltiplas (mesma pessoa em várias categorias)</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch />
                          <Label>Exigir comprovante de ranking</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch />
                          <Label>Aprovar inscrições manualmente</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scoring" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Sistema de Pontuação Avançado</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure um sistema de pontuação personalizado para rankings
                      </p>
                    </div>
                    <Switch
                      checked={formData.scoringSystem.enabled}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        scoringSystem: { ...formData.scoringSystem, enabled: checked }
                      })}
                      data-testid="switch-scoring-enabled"
                    />
                  </div>
                </CardHeader>
                
                {formData.scoringSystem.enabled && (
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="basic-points">
                        <AccordionTrigger>Pontuação Básica</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="basePoints">Pontos base por vitória</Label>
                              <Input
                                id="basePoints"
                                type="number"
                                value={formData.scoringSystem.basePoints}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  scoringSystem: {
                                    ...formData.scoringSystem,
                                    basePoints: parseInt(e.target.value) || 10
                                  }
                                })}
                                data-testid="input-base-points"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="bonusForUpset">Bônus por upset (vencer melhor rankeado)</Label>
                              <Input
                                id="bonusForUpset"
                                type="number"
                                value={formData.scoringSystem.bonusForUpset}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  scoringSystem: {
                                    ...formData.scoringSystem,
                                    bonusForUpset: parseInt(e.target.value) || 0
                                  }
                                })}
                                data-testid="input-bonus-upset"
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="ranking-multiplier">
                        <AccordionTrigger>Multiplicador de Ranking</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.scoringSystem.useRankingMultiplier}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                scoringSystem: { ...formData.scoringSystem, useRankingMultiplier: checked }
                              })}
                              data-testid="switch-ranking-multiplier"
                            />
                            <Label>Usar multiplicador baseado em ranking</Label>
                          </div>

                          {formData.scoringSystem.useRankingMultiplier && (
                            <div>
                              <Label>Fórmula do multiplicador</Label>
                              <Select 
                                value={formData.scoringSystem.rankingFormula}
                                onValueChange={(value: "linear" | "exponential" | "bracket") => setFormData({
                                  ...formData,
                                  scoringSystem: { ...formData.scoringSystem, rankingFormula: value }
                                })}
                              >
                                <SelectTrigger data-testid="select-ranking-formula">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {rankingFormulaOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{option.label}</span>
                                        <span className="text-sm text-muted-foreground">{option.description}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="loss-penalty">
                        <AccordionTrigger>Penalização por Derrota</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.scoringSystem.losePenaltyEnabled}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                scoringSystem: { ...formData.scoringSystem, losePenaltyEnabled: checked }
                              })}
                              data-testid="switch-loss-penalty"
                            />
                            <Label>Ativar penalização para perdedores</Label>
                          </div>

                          {formData.scoringSystem.losePenaltyEnabled && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="losePenaltyPoints">Pontos perdidos por derrota</Label>
                                <Input
                                  id="losePenaltyPoints"
                                  type="number"
                                  value={formData.scoringSystem.losePenaltyPoints}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    scoringSystem: {
                                      ...formData.scoringSystem,
                                      losePenaltyPoints: parseInt(e.target.value) || 3
                                    }
                                  })}
                                  data-testid="input-loss-penalty-points"
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2 mt-6">
                                <Switch
                                  checked={formData.scoringSystem.useLosePenaltyMultiplier}
                                  onCheckedChange={(checked) => setFormData({
                                    ...formData,
                                    scoringSystem: { ...formData.scoringSystem, useLosePenaltyMultiplier: checked }
                                  })}
                                  data-testid="switch-loss-penalty-multiplier"
                                />
                                <Label>Usar multiplicador de ranking na penalização</Label>
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="placement-points">
                        <AccordionTrigger>Pontuação por Colocação</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.scoringSystem.placementPointsEnabled}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                scoringSystem: { ...formData.scoringSystem, placementPointsEnabled: checked }
                              })}
                              data-testid="switch-placement-points"
                            />
                            <Label>Ativar pontuação por colocação final</Label>
                          </div>

                          {formData.scoringSystem.placementPointsEnabled && (
                            <>
                              <div>
                                <Label>Fórmula da pontuação</Label>
                                <Select 
                                  value={formData.scoringSystem.placementPointsFormula}
                                  onValueChange={(value: "dynamic" | "fixed" | "percentage") => setFormData({
                                    ...formData,
                                    scoringSystem: { ...formData.scoringSystem, placementPointsFormula: value }
                                  })}
                                >
                                  <SelectTrigger data-testid="select-placement-formula">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {placementFormulaOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{option.label}</span>
                                          <span className="text-sm text-muted-foreground">{option.description}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <Label htmlFor="championPoints">Campeão</Label>
                                  <Input
                                    id="championPoints"
                                    type="number"
                                    value={formData.scoringSystem.championPoints}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      scoringSystem: {
                                        ...formData.scoringSystem,
                                        championPoints: parseInt(e.target.value) || 50
                                      }
                                    })}
                                    data-testid="input-champion-points"
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="runnerUpPoints">Vice-campeão</Label>
                                  <Input
                                    id="runnerUpPoints"
                                    type="number"
                                    value={formData.scoringSystem.runnerUpPoints}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      scoringSystem: {
                                        ...formData.scoringSystem,
                                        runnerUpPoints: parseInt(e.target.value) || 30
                                      }
                                    })}
                                    data-testid="input-runner-up-points"
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="semifinalistPoints">Semifinalista</Label>
                                  <Input
                                    id="semifinalistPoints"
                                    type="number"
                                    value={formData.scoringSystem.semifinalistPoints}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      scoringSystem: {
                                        ...formData.scoringSystem,
                                        semifinalistPoints: parseInt(e.target.value) || 20
                                      }
                                    })}
                                    data-testid="input-semifinalist-points"
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="quarterfinalistPoints">Quarterfinalista</Label>
                                  <Input
                                    id="quarterfinalistPoints"
                                    type="number"
                                    value={formData.scoringSystem.quarterfinalistPoints}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      scoringSystem: {
                                        ...formData.scoringSystem,
                                        quarterfinalistPoints: parseInt(e.target.value) || 10
                                      }
                                    })}
                                    data-testid="input-quarterfinalist-points"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="custom-formula">
                        <AccordionTrigger>Fórmula Personalizada</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div>
                            <Label htmlFor="customFormula">Fórmula JavaScript personalizada</Label>
                            <Textarea
                              id="customFormula"
                              value={formData.scoringSystem.customFormula}
                              onChange={(e) => setFormData({
                                ...formData,
                                scoringSystem: { ...formData.scoringSystem, customFormula: e.target.value }
                              })}
                              rows={6}
                              placeholder="// Variáveis disponíveis: basePoints, playerRanking, opponentRanking, isWin
// Exemplo:
// if (isWin) {
//   return basePoints + (opponentRanking - playerRanking) * 0.1;
// } else {
//   return -Math.abs(playerRanking - opponentRanking) * 0.05;
// }"
                              data-testid="textarea-custom-formula"
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                              Use JavaScript para criar fórmulas complexas de pontuação
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                )}
              </Card>

              {/* Explicação do Sistema de Pontuação */}
              <ScoringSystemExplanation variant="card" />
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setLocation('/tournaments')}
              data-testid="button-cancel"
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            
            <Button 
              type="submit" 
              disabled={createTournamentMutation.isPending}
              data-testid="button-create-tournament"
              className="w-full sm:w-auto"
            >
              {createTournamentMutation.isPending ? "Criando..." : "Criar Torneio"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
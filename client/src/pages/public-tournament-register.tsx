import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, unformatCPF, formatPhone, unformatPhone } from "@/lib/format-utils";
import { getEligibleCategoriesForAthlete, extractYearFromDate } from "@shared/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, User, Calendar, MapPin, Trophy } from "lucide-react";
import RegistrationConfirmationCard from "@/components/registration-confirmation-card";
import ImageUpload from "@/components/image-upload";

interface Tournament {
  id: string;
  name: string;
  categories?: Array<{
    id: string;
    name: string;
  }>;
}

interface PublicTournamentRegisterProps {
  tournamentId: string;
}

export default function PublicTournamentRegister({ tournamentId }: PublicTournamentRegisterProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Estados do fluxo
  const [currentStep, setCurrentStep] = useState<'initial' | 'found' | 'register' | 'success'>('initial');
  const [consentData, setConsentData] = useState<any>(null);
  const [foundAthlete, setFoundAthlete] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<any>(null);
  
  // Dados iniciais (data nascimento + CPF)
  const [initialData, setInitialData] = useState({
    birthDate: '',
    cpf: ''
  });
  
  // Dados completos do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    birthDate: '',
    phone: '',
    gender: 'masculino',
    city: '',
    state: '',
    neighborhood: '', // Campo obrigatório no banco
    zipCode: '', // Campo obrigatório no banco
    club: '',
    category: '', // Categoria de idade (automática)
    technicalCategory: '', // Categoria técnica (A, B, C, D, Iniciante)
    photoUrl: '' // Campo de foto
  });

  // Buscar dados do torneio (endpoint público)
  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ['/api/public/tournaments', tournamentId],
    enabled: !!tournamentId
  });

  // Type guard para tournament
  const tournamentData = tournament as any;


  // Separar categorias por tipo (idade vs técnica)
  const getAgeCategories = () => {
    if (!tournamentData?.categories) {
      return [];
    }
    
    // Filtrar apenas categorias por IDADE (não técnicas) E compatíveis com o gênero
    // Categorias técnicas começam com "Absoluto" seguido de letra (A, B, C, D) ou são "Iniciante"
    const ageCategories = tournamentData.categories.filter((cat: any) => {
      const name = cat.name?.toLowerCase().trim() || '';
      
      // Regex para detectar categorias técnicas: "absoluto" seguido de espaço e letra A/B/C/D
      const isTechnical = /^absoluto\s+[abcd]/i.test(name) || name.startsWith('iniciante');
      
      // Regra de gênero:
      // - Categoria "mista" → permite qualquer gênero
      // - Categoria "masculino" → permite apenas masculino
      // - Categoria "feminino" → permite apenas feminino
      const categoryGender = cat.gender?.toLowerCase().trim() || '';
      const athleteGender = formData.gender?.toLowerCase().trim() || '';
      const isGenderCompatible = categoryGender === 'mista' || categoryGender === athleteGender;
      
      return !isTechnical && isGenderCompatible;
    }).sort((a: any, b: any) => {
      // Ordenar por idade mínima (mais novos primeiro)
      const aMinAge = a.minAge || a.maxAge || 0;
      const bMinAge = b.minAge || b.maxAge || 0;
      return aMinAge - bMinAge;
    });
    
    console.log("📅 Categorias por idade (gênero:", formData.gender, "):", ageCategories.map((c: any) => c.name));
    return ageCategories;
  };

  const getTechnicalCategories = () => {
    if (!tournamentData?.categories) {
      return [];
    }
    
    // Filtrar apenas categorias TÉCNICAS E compatíveis com o gênero
    // Categorias técnicas começam com "Absoluto" seguido de letra (A, B, C, D) ou são "Iniciante"
    const technicalCategories = tournamentData.categories.filter((cat: any) => {
      const name = cat.name?.toLowerCase().trim() || '';
      
      // Regex para detectar categorias técnicas: "absoluto" seguido de espaço e letra A/B/C/D
      const isTechnical = /^absoluto\s+[abcd]/i.test(name) || name.startsWith('iniciante');
      
      // Regra de gênero:
      // - Categoria "mista" → permite qualquer gênero
      // - Categoria "masculino" → permite apenas masculino
      // - Categoria "feminino" → permite apenas feminino
      const categoryGender = cat.gender?.toLowerCase().trim() || '';
      const athleteGender = formData.gender?.toLowerCase().trim() || '';
      const isGenderCompatible = categoryGender === 'mista' || categoryGender === athleteGender;
      
      return isTechnical && isGenderCompatible;
    }).sort((a: any, b: any) => {
      // Ordenar categorias Absoluto na ordem A, B, C, D (ignorando sufixos de gênero)
      const order = ['iniciante', 'absoluto a', 'absoluto b', 'absoluto c', 'absoluto d'];
      
      // Normalizar nomes: remover sufixos de gênero (feminino/masculino/mista)
      const normalizeName = (name: string) => {
        return name?.toLowerCase().trim()
          .replace(/\s+(feminino|masculino|mista)$/, '')
          .trim() || '';
      };
      
      const aNormalized = normalizeName(a.name);
      const bNormalized = normalizeName(b.name);
      
      const aIndex = order.indexOf(aNormalized);
      const bIndex = order.indexOf(bNormalized);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.name.localeCompare(b.name);
    });
    
    console.log("🎯 Categorias técnicas (gênero:", formData.gender, "):", technicalCategories.map((c: any) => c.name));
    return technicalCategories;
  };

  // Verificar consentimento e processar resultado da busca
  useEffect(() => {
    const storedConsent = sessionStorage.getItem('consentData');
    if (!storedConsent) {
      setLocation(`/consent/tournament/${tournamentId}`);
      return;
    }
    
    const parsedConsent = JSON.parse(storedConsent);
    setConsentData(parsedConsent);
    
    // Processar dados do atleta já buscado no consentimento
    if (parsedConsent.foundAthlete) {
      // Atleta encontrado - mostrar dados para confirmação
      const athlete = parsedConsent.foundAthlete;
      setFoundAthlete(athlete);
      setFormData({
        ...formData,
        name: athlete.name || '',
        email: athlete.email || '',
        cpf: parsedConsent.athleteCpf,
        birthDate: parsedConsent.birthDate,
        phone: athlete.phone || '',
        gender: athlete.gender || 'masculino',
        city: athlete.city || '',
        state: athlete.state || '',
        neighborhood: athlete.neighborhood || '',
        zipCode: athlete.zipCode || '',
        club: athlete.club || '',
      });
      setCurrentStep('found');
    } else {
      // Atleta não encontrado - preencher dados básicos do consentimento
      setFormData({
        ...formData,
        cpf: parsedConsent.athleteCpf,
        birthDate: parsedConsent.birthDate
      });
      setCurrentStep('register');
    }
  }, [tournamentId, setLocation]);

  // Não precisa mais da busca manual - será feita no consentimento

  // Mutation para cadastro + inscrição
  const registrationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const cleanData = {
        ...data,
        cpf: data.cpf,
        phone: data.phone ? unformatPhone(data.phone) : '',
        tournamentId,
        technicalCategory: data.technicalCategory || null,
        consentData,
        athleteId: foundAthlete?.id || null
      };
      
      const response = await fetch('/api/tournaments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("❌ Erro HTTP:", response.status, error);
        throw new Error(error.message || error.error || `Erro HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Inscrição realizada com sucesso:', data);
      setRegistrationResult(data);
      setCurrentStep('success');
      sessionStorage.removeItem('consentData');
      
      // Debug log para verificar o estado
      console.log('🔍 Estado após sucesso:', {
        currentStep: 'success',
        hasRegistrationResult: !!data,
        registrationNumber: data?.participation?.registrationNumber
      });
    },
    onError: (error: any) => {
      console.error("❌ Erro detalhado na inscrição:", error);
      
      // Tratar erro específico de email/CPF duplicado
      if (error.message.includes("Email já cadastrado") || error.message.includes("CPF já cadastrado")) {
        toast({
          title: "⚠️ Você já tem conta!",
          description: error.message,
          variant: "destructive",
          duration: 8000, // Mais tempo para ler a mensagem
        });
      } else {
        // Mostrar erro detalhado
        const errorMessage = error.message || error.toString() || "Erro desconhecido na inscrição";
        toast({
          title: "❌ Erro na inscrição",
          description: `${errorMessage}. Tente novamente ou entre em contato com o suporte.`,
          variant: "destructive",
          duration: 10000,
        });
        
        // Log adicional para debug
        console.error("Stack trace:", error.stack);
        console.error("Dados enviados:", formData);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação completa dos campos obrigatórios
    const requiredFields = {
      name: "Nome é obrigatório",
      email: "Email é obrigatório",
      neighborhood: "Bairro é obrigatório",
      zipCode: "CEP é obrigatório",
      city: "Cidade é obrigatória",
      state: "Estado é obrigatório"
    };

    for (const [field, message] of Object.entries(requiredFields)) {
      if (!formData[field as keyof typeof formData] || formData[field as keyof typeof formData].trim() === '') {
        toast({
          title: "Campo obrigatório",
          description: message,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validação dinâmica de categoria: pelo menos UMA deve ser preenchida
    if (!formData.category && !formData.technicalCategory) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione pelo menos uma categoria (idade ou técnica)",
        variant: "destructive",
      });
      return;
    }

    // Validação do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    // Validação da foto obrigatória
    if (!formData.photoUrl) {
      toast({
        title: "Foto obrigatória",
        description: "Por favor, adicione sua foto para completar a inscrição.",
        variant: "destructive",
      });
      return;
    }

    registrationMutation.mutate(formData);
  };

  const handleInitialDataChange = (field: string, value: string) => {
    if (field === 'cpf') {
      value = formatCPF(value);
    }
    setInitialData(prev => ({ ...prev, [field]: value }));
  };

  if (tournamentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardContent className="p-6">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Torneio não encontrado</h2>
            <p className="text-muted-foreground">O torneio não foi encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de sucesso com card de confirmação
  if (currentStep === 'success' && registrationResult) {
    console.log('🎉 Renderizando card de confirmação:', {
      currentStep,
      hasRegistrationResult: !!registrationResult,
      tournamentId,
      foundAthlete: !!foundAthlete,
      formData: formData.name,
      windowLocation: window.location.href
    });
    
    // Calcular idade baseada na data de nascimento
    const birthYear = new Date(foundAthlete?.birthDate || formData.birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    
    // Encontrar nome das categorias selecionadas (idade E/OU técnica)
    const selectedCategories: string[] = [];
    
    if (formData.category) {
      const ageCategoryName = tournamentData?.categories?.find((cat: any) => cat.id === formData.category)?.name;
      if (ageCategoryName) {
        selectedCategories.push(ageCategoryName);
      }
    }
    
    if (formData.technicalCategory) {
      const techCategoryName = tournamentData?.categories?.find((cat: any) => cat.id === formData.technicalCategory)?.name;
      if (techCategoryName) {
        selectedCategories.push(techCategoryName);
      }
    }
    
    // Fallback se nenhuma categoria foi encontrada
    if (selectedCategories.length === 0) {
      selectedCategories.push('Categoria não especificada');
    }
    
    return (
      <>
        <RegistrationConfirmationCard
          registrationNumber={registrationResult.participation?.registrationNumber || 'N/A'}
          athleteName={foundAthlete?.name || formData.name}
          athletePhoto={foundAthlete?.photoUrl}
          athleteAge={age}
          categories={selectedCategories}
          club={foundAthlete?.club || formData.club}
          city={foundAthlete?.city || formData.city}
          tournamentName={tournamentData?.name}
          registrationDate={new Date().toISOString()}
          publicShareUrl={(() => {
            // Construir URL segura do torneio
            if (tournamentId && tournamentId !== 'undefined') {
              console.log('✅ Usando tournamentId:', tournamentId);
              return `${import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin}/tournament/${tournamentId}`;
            }
            
            // Fallback: extrair ID da URL atual
            const currentUrl = window.location.href;
            const match = currentUrl.match(/tournament\/([^\/]+)/);
            if (match && match[1] !== 'undefined') {
              console.log('✅ Extraído da URL:', match[1]);
              return `${import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin}/tournament/${match[1]}`;
            }
            
            // Último fallback seguro: verificar se não contém "undefined"
            const fallbackUrl = currentUrl.replace('/register', '');
            if (fallbackUrl.includes('/tournament/undefined')) {
              console.log('⚠️ URL contém undefined, redirecionando para lista de torneios');
              return `${import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin}/tournaments`;
            }
            
            console.log('⚠️ Usando fallback de URL:', fallbackUrl);
            return fallbackUrl;
          })()}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            {/* Imagem de capa quando disponível */}
            {tournamentData?.coverImage ? (
              <div className="relative mb-4">
                <div className="w-full h-32 rounded-lg overflow-hidden">
                  <img 
                    src={tournamentData.coverImage} 
                    alt={tournamentData.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-white opacity-80" />
                  </div>
                </div>
              </div>
            ) : (
              <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
            )}
            <CardTitle className="text-2xl">Inscrição no Torneio</CardTitle>
            <p className="text-lg font-medium text-primary">{tournamentData?.name}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ETAPA INICIAL: Data nascimento + CPF */}
              {currentStep === 'initial' && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <User className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="text-lg font-medium">Dados Básicos</h3>
                    <p className="text-sm text-muted-foreground">Informe sua data de nascimento e CPF para verificarmos se você já tem cadastro</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="birthDate">Data de Nascimento *</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={initialData.birthDate}
                        onChange={(e) => handleInitialDataChange('birthDate', e.target.value)}
                        required
                        data-testid="input-birthdate"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={initialData.cpf}
                        onChange={(e) => handleInitialDataChange('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required
                        data-testid="input-cpf"
                      />
                    </div>
                  </div>
                  
                  {isSearching && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Verificando cadastro...</p>
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA: ATLETA ENCONTRADO - Confirmação */}
              {currentStep === 'found' && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Atleta encontrado! Confirme seus dados e selecione a categoria.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        data-testid="input-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        data-testid="input-email"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                        placeholder="(00) 00000-0000"
                        data-testid="input-phone"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        required
                        data-testid="input-city"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                        required
                        data-testid="input-neighborhood"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="zipCode">CEP *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                        placeholder="00000-000"
                        required
                        data-testid="input-zipcode"
                      />
                    </div>
                  </div>

                  {/* Alertar quando não há categorias disponíveis para o gênero */}
                  {getAgeCategories().length === 0 && getTechnicalCategories().length === 0 && (
                    <Alert className="bg-amber-50 border-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-900">
                        <strong>Nenhuma categoria disponível</strong><br/>
                        Infelizmente não há categorias disponíveis para atletas do gênero <strong>{formData.gender}</strong> neste torneio. 
                        Por favor, entre em contato com os organizadores para mais informações.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Alertar que pelo menos uma categoria é obrigatória (somente se houver categorias) */}
                  {(getAgeCategories().length > 0 || getTechnicalCategories().length > 0) && !formData.category && !formData.technicalCategory && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Campo obrigatório</strong><br/>
                        Selecione pelo menos uma categoria (idade ou técnica)
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getAgeCategories().length > 0 && (
                      <div>
                        <Label htmlFor="category">
                          Categoria por Idade 
                          <span className="text-xs text-muted-foreground ml-2">(opcional; selecione ao menos uma)</span>
                        </Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Selecione a categoria por idade" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAgeCategories().map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {getTechnicalCategories().length > 0 && (
                      <div>
                        <Label htmlFor="technicalCategory">
                          Categoria Técnica 
                          <span className="text-xs text-muted-foreground ml-2">(opcional; selecione ao menos uma)</span>
                        </Label>
                        <Select value={formData.technicalCategory} onValueChange={(value) => setFormData({...formData, technicalCategory: value})}>
                          <SelectTrigger data-testid="select-technical-category">
                            <SelectValue placeholder="Selecione a categoria técnica" />
                          </SelectTrigger>
                          <SelectContent>
                            {getTechnicalCategories().map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ETAPA: CADASTRO NOVO */}
              {currentStep === 'register' && (
                <div className="space-y-4">
                  <Alert>
                    <User className="h-4 w-4" />
                    <AlertDescription>
                      Vamos criar seu cadastro para participar do torneio.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        data-testid="input-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        data-testid="input-email"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                        placeholder="(00) 00000-0000"
                        data-testid="input-phone"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="gender">Gênero *</Label>
                      <Select value={formData.gender} onValueChange={(value) => {
                        setFormData({
                          ...formData, 
                          gender: value,
                          category: '', // Limpar categoria de idade ao mudar gênero
                          technicalCategory: '' // Limpar categoria técnica ao mudar gênero
                        });
                      }}>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        required
                        data-testid="input-city"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        required
                        data-testid="input-state"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                        required
                        data-testid="input-neighborhood"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="zipCode">CEP *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                        placeholder="00000-000"
                        required
                        data-testid="input-zipcode"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="club">Clube (opcional)</Label>
                      <Input
                        id="club"
                        value={formData.club}
                        onChange={(e) => setFormData({...formData, club: e.target.value})}
                        data-testid="input-club"
                      />
                    </div>
                  </div>

                  {/* Alertar quando não há categorias disponíveis para o gênero */}
                  {getAgeCategories().length === 0 && getTechnicalCategories().length === 0 && (
                    <Alert className="bg-amber-50 border-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-900">
                        <strong>Nenhuma categoria disponível</strong><br/>
                        Infelizmente não há categorias disponíveis para atletas do gênero <strong>{formData.gender}</strong> neste torneio. 
                        Por favor, entre em contato com os organizadores para mais informações.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Alertar que pelo menos uma categoria é obrigatória (somente se houver categorias) */}
                  {(getAgeCategories().length > 0 || getTechnicalCategories().length > 0) && !formData.category && !formData.technicalCategory && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Campo obrigatório</strong><br/>
                        Selecione pelo menos uma categoria (idade ou técnica)
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getAgeCategories().length > 0 && (
                      <div>
                        <Label htmlFor="category">
                          Categoria por Idade 
                          <span className="text-xs text-muted-foreground ml-2">(opcional; selecione ao menos uma)</span>
                        </Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Selecione a categoria por idade" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAgeCategories().map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {getTechnicalCategories().length > 0 && (
                      <div>
                        <Label htmlFor="technicalCategory">
                          Categoria Técnica 
                          <span className="text-xs text-muted-foreground ml-2">(opcional; selecione ao menos uma)</span>
                        </Label>
                        <Select value={formData.technicalCategory} onValueChange={(value) => setFormData({...formData, technicalCategory: value})}>
                          <SelectTrigger data-testid="select-technical-category">
                            <SelectValue placeholder="Selecione a categoria técnica" />
                          </SelectTrigger>
                          <SelectContent>
                            {getTechnicalCategories().map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Campo de foto do atleta */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span>📷 Foto do Atleta *</span>
                      <span className="text-xs text-red-500">(obrigatória)</span>
                    </Label>
                    <p className="text-sm text-gray-600">Sua foto aparecerá na página pública do torneio</p>
                    <ImageUpload
                      onImageSelect={(imageUrl) => setFormData({...formData, photoUrl: imageUrl})}
                      currentImage={formData.photoUrl}
                      aspectRatio="aspect-square"
                      label="Foto do Atleta"
                    />
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              {(currentStep === 'found' || currentStep === 'register') && (
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCurrentStep('initial');
                      setInitialData({ birthDate: '', cpf: '' });
                      setFoundAthlete(null);
                    }}
                    className="flex-1"
                    data-testid="button-back"
                  >
                    Voltar
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={registrationMutation.isPending}
                    className="flex-1"
                    data-testid="button-submit"
                  >
                    {registrationMutation.isPending ? "Inscrevendo..." : 
                     currentStep === 'found' ? "Confirmar Inscrição" : "Cadastrar e Inscrever"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
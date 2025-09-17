import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ImageUpload from "@/components/image-upload";
import { formatCPF, unformatCPF, formatPhone, unformatPhone } from "@/lib/format-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Search, UserPlus, Calendar, MapPin, Trophy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Tournament } from "@shared/schema";

export default function TournamentRegistration() {
  const { tournamentId } = useParams() as { tournamentId: string };
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [consentData, setConsentData] = useState<any>(null);
  const [isCheckingConsent, setIsCheckingConsent] = useState(true);
  const [athleteFound, setAthleteFound] = useState<any>(null);
  const [searchStep, setSearchStep] = useState(true); // true = buscar atleta, false = cadastrar novo
  const [searchData, setSearchData] = useState({
    cpf: "",
    email: ""
  });
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    cpf: "",
    rg: "",
    gender: "",
    zipCode: "",
    street: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: "",
    club: "",
    photoUrl: "",
    observations: "",
    type: 'atleta'
  });
  
  // Buscar dados do torneio (endpoint público)
  const { data: tournament, isLoading: tournamentLoading } = useQuery<Tournament>({
    queryKey: ['/api/public/tournaments', tournamentId],
    enabled: !!tournamentId
  });
  
  // Verificar consentimento na inicialização
  useEffect(() => {
    const checkConsent = () => {
      try {
        const storedConsent = sessionStorage.getItem('consentData');
        if (storedConsent) {
          const parsedConsent = JSON.parse(storedConsent);
          setConsentData(parsedConsent);
          
          // Auto-preencher data de nascimento se disponível
          if (parsedConsent.birthDate) {
            setFormData(prev => ({ ...prev, birthDate: parsedConsent.birthDate }));
          }
        } else {
          // Redirecionar para página de consentimento específica para torneio
          setLocation(`/consent/tournament/${tournamentId}`);
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar consentimento:', error);
        setLocation(`/consent/tournament/${tournamentId}`);
        return;
      }
      setIsCheckingConsent(false);
    };
    
    checkConsent();
  }, [tournamentId, setLocation]);
  
  // Buscar atleta existente
  const searchAthleteMutation = useMutation({
    mutationFn: async (data: typeof searchData) => {
      const searchParams = new URLSearchParams();
      if (data.cpf) searchParams.append('cpf', data.cpf);
      if (data.email) searchParams.append('email', data.email);
      
      const response = await fetch(`/api/athletes/search?${searchParams}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Atleta não encontrado
        }
        throw new Error('Erro na busca');
      }
      return response.json();
    },
    onSuccess: (athlete) => {
      if (athlete) {
        setAthleteFound(athlete);
        // Preencher dados básicos para inscrição
        setFormData(prev => ({
          ...prev,
          name: athlete.name,
          email: athlete.email,
          cpf: athlete.cpf,
          birthDate: athlete.birthDate,
          club: athlete.club,
          city: athlete.city,
          state: athlete.state
        }));
      } else {
        // Não encontrado, preencher com dados da busca
        setFormData(prev => ({
          ...prev,
          cpf: searchData.cpf,
          email: searchData.email
        }));
        setSearchStep(false);
        toast({
          title: "Atleta não encontrado",
          description: "Vamos fazer seu cadastro para inscrição no torneio.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro na busca",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Inscrição no torneio (com cadastro se necessário)
  const registrationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const cleanData = {
        ...data,
        cpf: data.cpf,
        phone: unformatPhone(data.phone),
        consentData: consentData,
        tournamentId: tournamentId,
        athleteId: athleteFound?.id || null // Se atleta já existe, usar ID
      };
      
      const response = await fetch('/api/tournaments/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Erro na inscrição');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowSuccessMessage(true);
      sessionStorage.removeItem('consentData');
    },
    onError: (error: any) => {
      let title = "Erro na inscrição";
      let message = error.message;
      
      if (error.message.includes('já inscrito')) {
        title = "Já inscrito";
        message = "Você já está inscrito neste torneio.";
      }
      
      toast({
        title,
        description: message,
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registrationMutation.mutate(formData);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchData.cpf && !searchData.email) {
      toast({
        title: "Dados obrigatórios",
        description: "Informe pelo menos CPF ou email para buscar.",
        variant: "destructive",
      });
      return;
    }
    searchAthleteMutation.mutate(searchData);
  };
  
  if (isCheckingConsent || tournamentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (showSuccessMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">
              Inscrição Realizada!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Sua inscrição foi enviada com sucesso! Você receberá uma confirmação por email.
            </p>
            <div className="pt-4">
              <Button 
                onClick={() => setLocation('/')}
                className="w-full"
              >
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
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
            <p className="text-muted-foreground mb-4">
              O torneio que você está tentando acessar não foi encontrado.
            </p>
            <Button onClick={() => setLocation('/')}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Informações do Torneio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {tournament.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('pt-BR') : 'Data a definir'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{tournament.location}</span>
              </div>
            </div>
            {tournament.description && (
              <p className="mt-3 text-muted-foreground">{tournament.description}</p>
            )}
          </CardContent>
        </Card>
        
        {searchStep ? (
          /* Etapa 1: Buscar Atleta */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Verificar Cadastro
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Vamos verificar se você já possui cadastro no sistema
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label htmlFor="search-cpf">CPF</Label>
                  <Input
                    id="search-cpf"
                    value={searchData.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setSearchData({...searchData, cpf: formatted});
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                
                <div className="text-center text-sm text-muted-foreground">ou</div>
                
                <div>
                  <Label htmlFor="search-email">Email</Label>
                  <Input
                    id="search-email"
                    type="email"
                    value={searchData.email}
                    onChange={(e) => setSearchData({...searchData, email: e.target.value})}
                    placeholder="seu@email.com"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={searchAthleteMutation.isPending}
                    className="flex-1"
                  >
                    {searchAthleteMutation.isPending ? "Buscando..." : "Verificar Cadastro"}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setSearchStep(false)}
                  >
                    Novo Cadastro
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Etapa 2: Formulário de Cadastro/Inscrição */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {athleteFound ? <Trophy className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {athleteFound ? `Inscrição de ${athleteFound.name}` : "Cadastro e Inscrição"}
              </CardTitle>
              {athleteFound && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Atleta encontrado! Confirme seus dados e finalize a inscrição.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="font-medium">Dados Pessoais</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        disabled={!!athleteFound}
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
                        disabled={!!athleteFound}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => {
                          const formatted = formatCPF(e.target.value);
                          setFormData({...formData, cpf: formatted});
                        }}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required
                        disabled={!!athleteFound}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="birthDate">Data de Nascimento *</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                        required
                        disabled={!!athleteFound}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="gender">Gênero *</Label>
                      <Select
                        value={formData.gender || undefined}
                        onValueChange={(value) => setFormData({...formData, gender: value})}
                        disabled={!!athleteFound}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setFormData({...formData, phone: formatted});
                        }}
                        placeholder="(00) 00000-0000"
                        disabled={!!athleteFound}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Dados de Localização */}
                <div className="space-y-4">
                  <h3 className="font-medium">Localização</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        required
                        disabled={!!athleteFound}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="state">Estado *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        required
                        disabled={!!athleteFound}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="club">Clube</Label>
                      <Input
                        id="club"
                        value={formData.club}
                        onChange={(e) => setFormData({...formData, club: e.target.value})}
                        disabled={!!athleteFound}
                      />
                    </div>
                  </div>
                </div>
                
                {!athleteFound && (
                  <>
                    <Separator />
                    
                    {/* Foto */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Foto (Opcional)</h3>
                      <ImageUpload
                        onImageSelect={(url) => setFormData({...formData, photoUrl: url})}
                        currentImage={formData.photoUrl}
                      />
                    </div>
                  </>
                )}
                
                <div className="flex gap-3 pt-4">
                  {!athleteFound && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSearchStep(true);
                        setAthleteFound(null);
                      }}
                    >
                      Voltar
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={registrationMutation.isPending}
                    className="flex-1"
                  >
                    {registrationMutation.isPending ? "Inscrevendo..." : 
                     athleteFound ? "Confirmar Inscrição" : "Cadastrar e Inscrever"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
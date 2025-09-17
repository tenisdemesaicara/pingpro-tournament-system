import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trophy, Calendar, MapPin, Shield } from "lucide-react";
import { formatCPF } from "@/lib/format-utils";
import DigitalSignature from "@/components/digital-signature";
// import SignaturePad from "@/components/signature-pad";

export default function ConsentTournament() {
  const { tournamentId } = useParams() as { tournamentId: string };
  const [, setLocation] = useLocation();
  
  // Buscar dados do torneio (endpoint público)
  const { data: tournament, isLoading } = useQuery({
    queryKey: ['/api/public/tournaments', tournamentId],
    enabled: !!tournamentId
  });

  // Type guard para tournament
  const tournamentData = tournament as any;
  
  const [formData, setFormData] = useState({
    birthDate: "",
    athleteCpf: "", // CPF do atleta
    isMinor: false,
    lgpdConsent: false,
    imageRightsConsent: false,
    termsConsent: false,
    signature: "",
    signerName: "",
    parentName: "",
    parentCpf: "",
    parentEmail: "",
    parentRelationship: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [foundAthlete, setFoundAthlete] = useState<any>(null);
  
  // Clear any existing athlete data when component mounts
  useEffect(() => {
    console.log("🧹 Consent page mounted - clearing any existing athlete search results");
    setFoundAthlete(null);
  }, []);
  const [isSearching, setIsSearching] = useState(false);
  
  // Calcular se é menor de idade quando data de nascimento muda
  useEffect(() => {
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Se ainda não fez aniversário este ano, subtrai 1
      const isMinor = age < 18 || (age === 18 && monthDiff < 0) || 
                     (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate());
      
      setFormData(prev => ({ ...prev, isMinor }));
    }
  }, [formData.birthDate]);

  // Busca automática quando CPF e data estão preenchidos
  useEffect(() => {
    const searchAthlete = async () => {
      // Always clear foundAthlete first to prevent stale data
      console.log("🔍 Athlete search triggered with CPF:", formData.athleteCpf, "birthDate:", formData.birthDate);
      
      if (!formData.athleteCpf || !formData.birthDate) {
        console.log("❌ Missing CPF or birthDate - clearing foundAthlete");
        setFoundAthlete(null);
        return;
      }

      // Verificar se CPF tem pelo menos 11 dígitos
      const cpfNumbers = formData.athleteCpf.replace(/\D/g, '');
      if (cpfNumbers.length < 11) {
        console.log("❌ CPF incomplete - clearing foundAthlete");
        setFoundAthlete(null);
        return;
      }

      setIsSearching(true);
      // Clear previous results before new search
      setFoundAthlete(null);
      
      try {
        const searchParams = new URLSearchParams({
          cpf: cpfNumbers,
          birthDate: formData.birthDate
        });
        
        console.log("🔍 Searching for athlete with:", { cpf: cpfNumbers, birthDate: formData.birthDate });
        const response = await fetch(`/api/athletes/search?${searchParams}`);
        
        if (response.ok) {
          const athlete = await response.json();
          console.log("✅ Athlete found:", athlete);
          setFoundAthlete(athlete);
        } else {
          console.log("📝 No athlete found - will create new");
          setFoundAthlete(null);
        }
      } catch (error) {
        console.error("❌ Error searching athlete:", error);
        setFoundAthlete(null);
      } finally {
        setIsSearching(false);
      }
    };

    // Delay de 500ms para evitar muitas requests
    const delayTimer = setTimeout(searchAthlete, 500);
    return () => clearTimeout(delayTimer);
  }, [formData.athleteCpf, formData.birthDate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lgpdConsent || !formData.imageRightsConsent || !formData.termsConsent) {
      alert("Você deve aceitar todos os termos para continuar.");
      return;
    }
    
    if (!formData.signature) {
      alert("A assinatura é obrigatória.");
      return;
    }
    
    // Nome será preenchido automaticamente (responsável se menor, ou não obrigatório se maior)
    
    // Validações para menores de idade - só pedir dados do responsável se não foi encontrado atleta
    if (formData.isMinor && !foundAthlete) {
      if (!formData.parentName || !formData.parentCpf || !formData.parentEmail || !formData.parentRelationship) {
        alert("Para menores de idade, todos os dados do responsável são obrigatórios.");
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // Log final state before saving to sessionStorage
      console.log("💾 Saving consent data with:", {
        athleteCpf: formData.athleteCpf,
        birthDate: formData.birthDate,
        foundAthlete: foundAthlete ? {
          id: foundAthlete.id,
          name: foundAthlete.name,
          cpf: foundAthlete.cpf
        } : null
      });

      // Salvar dados de consentimento e resultado da busca no sessionStorage
      const consentData = {
        ...formData,
        signerName: formData.isMinor ? formData.parentName : 'Atleta',
        tournamentId,
        consentTimestamp: new Date().toISOString(),
        ipAddress: "127.0.0.1", // Placeholder
        userAgent: navigator.userAgent,
        // Resultado da busca - only save if actually found for this specific CPF/birthDate
        foundAthlete: foundAthlete
      };
      
      sessionStorage.setItem('consentData', JSON.stringify(consentData));
      
      // 3. Redirecionar para página de inscrição PÚBLICA
      setLocation(`/tournament/${tournamentId}/register`);
      
    } catch (error) {
      console.error("Erro ao salvar consentimento:", error);
      alert("Erro ao processar consentimento. Tente novamente.");
    }
    
    setIsSubmitting(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!isLoading && !tournamentData) {
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
            {/* Imagem de capa quando disponível */}
            {tournamentData?.coverImage ? (
              <div className="relative mb-4">
                <div className="w-full h-40 rounded-lg overflow-hidden">
                  <img 
                    src={tournamentData.coverImage} 
                    alt={tournamentData.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white opacity-90" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
            )}
            <CardTitle className="flex items-center gap-2 justify-center">
              {tournamentData?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{tournamentData?.startDate ? new Date(tournamentData.startDate).toLocaleDateString('pt-BR') : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{tournamentData?.location}</span>
              </div>
            </div>
            {tournamentData?.description && (
              <p className="mt-3 text-muted-foreground">{tournamentData.description}</p>
            )}
          </CardContent>
        </Card>
        
        {/* Formulário de Consentimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Termos de Consentimento
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Para participar do torneio, é necessário aceitar os termos de consentimento e fornecer sua assinatura digital.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Dados Básicos do Atleta */}
              <div className="space-y-4">
                <h3 className="font-medium">Dados do Atleta</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="athleteCpf">CPF do Atleta *</Label>
                    <Input
                      id="athleteCpf"
                      value={formData.athleteCpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        setFormData({...formData, athleteCpf: formatted});
                      }}
                      maxLength={14}
                      placeholder="000.000.000-00"
                      required
                    />
                    {/* Status visual da busca */}
                    <div className="text-xs mt-1">
                      {isSearching && <span className="text-blue-600">🔍 Buscando atleta...</span>}
                      {foundAthlete && <span className="text-green-600">✅ Encontrado: {foundAthlete.name}</span>}
                      {!isSearching && !foundAthlete && formData.athleteCpf.replace(/\D/g, '').length >= 11 && formData.birthDate && (
                        <span className="text-orange-600">📝 Novo cadastro</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Status da busca */}
                {isSearching && formData.athleteCpf.replace(/\D/g, '').length >= 11 && (
                  <Alert>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    <AlertDescription>
                      Verificando se o atleta já possui cadastro...
                    </AlertDescription>
                  </Alert>
                )}
                
                {foundAthlete && (
                  <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                    <div className="text-green-600">✅</div>
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <strong>Atleta encontrado!</strong> {foundAthlete.name} já possui cadastro.
                      {formData.isMinor ? " Os dados do responsável já estão no sistema." : ""}
                    </AlertDescription>
                  </Alert>
                )}
                
                {formData.isMinor && !foundAthlete && !isSearching && formData.athleteCpf.replace(/\D/g, '').length >= 11 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Menor de idade detectado. Será necessário o consentimento do responsável legal.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Dados do Responsável (só para novos cadastros de menores) */}
              {formData.isMinor && !foundAthlete && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-medium">Dados do Responsável Legal</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parentName">Nome do Responsável *</Label>
                      <Input
                        id="parentName"
                        value={formData.parentName}
                        onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                        required={formData.isMinor}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="parentCpf">CPF do Responsável *</Label>
                      <Input
                        id="parentCpf"
                        value={formData.parentCpf}
                        onChange={(e) => {
                          const formatted = formatCPF(e.target.value);
                          setFormData({...formData, parentCpf: formatted});
                        }}
                        maxLength={14}
                        placeholder="000.000.000-00"
                        required={formData.isMinor}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="parentEmail">Email do Responsável *</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                        required={formData.isMinor}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="parentRelationship">Grau de Parentesco *</Label>
                      <Input
                        id="parentRelationship"
                        value={formData.parentRelationship}
                        onChange={(e) => setFormData({...formData, parentRelationship: e.target.value})}
                        placeholder="Ex: Pai, Mãe, Tutor"
                        required={formData.isMinor}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Termos de Consentimento */}
              <div className="space-y-4">
                <h3 className="font-medium">Aceite dos Termos</h3>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="lgpdConsent"
                    checked={formData.lgpdConsent}
                    onCheckedChange={(checked) => setFormData({...formData, lgpdConsent: !!checked})}
                  />
                  <Label htmlFor="lgpdConsent" className="text-sm leading-relaxed">
                    Aceito que meus dados pessoais sejam coletados e tratados conforme a Lei Geral de Proteção de Dados (LGPD) para fins de organização do torneio, comunicações relacionadas ao evento e elaboração de estatísticas.
                  </Label>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="imageRightsConsent"
                    checked={formData.imageRightsConsent}
                    onCheckedChange={(checked) => setFormData({...formData, imageRightsConsent: !!checked})}
                  />
                  <Label htmlFor="imageRightsConsent" className="text-sm leading-relaxed">
                    Autorizo o uso de minha imagem e voz em fotos, vídeos e transmissões do evento para fins de divulgação nas redes sociais, site oficial e materiais promocionais da organização.
                  </Label>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="termsConsent"
                    checked={formData.termsConsent}
                    onCheckedChange={(checked) => setFormData({...formData, termsConsent: !!checked})}
                  />
                  <Label htmlFor="termsConsent" className="text-sm leading-relaxed">
                    Declaro que li e concordo com os termos de participação do torneio, incluindo regras, regulamentos e políticas de conduta estabelecidas pela organização.
                  </Label>
                </div>
              </div>
              
              {/* Assinatura Digital */}
              <div className="space-y-4">
                <h3 className="font-medium">Assinatura Digital</h3>
                
                {/* Nome será capturado automaticamente dos dados já preenchidos */}
                
                <DigitalSignature
                  title={formData.isMinor ? "Assinatura do Responsável Legal" : "Assinatura Digital"}
                  placeholder={formData.isMinor ? "Responsável, desenhe sua assinatura acima" : "Desenhe sua assinatura acima"}
                  required={true}
                  onSignatureChange={(signature) => 
                    setFormData({...formData, signature: signature})
                  }
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? "Processando..." : "Aceitar Termos e Continuar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
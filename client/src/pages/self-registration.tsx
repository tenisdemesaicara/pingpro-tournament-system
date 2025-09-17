import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { AlertCircle } from "lucide-react";

export default function SelfRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Detect type from URL parameters (DEVE estar antes de usar no useState)
  const urlParams = new URLSearchParams(window.location.search);
  const registrationType = urlParams.get('type') || 'athlete'; // default to athlete
  
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [consentData, setConsentData] = useState<any>(null);
  const [isCheckingConsent, setIsCheckingConsent] = useState(true);
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
    type: registrationType === 'associate' ? 'associado' : 'atleta'
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
          // Redirecionar para página de consentimento se não houver dados
          const consentUrl = registrationType === 'associate' ? '/consent/associate' : '/consent/athlete';
          setLocation(consentUrl);
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar consentimento:', error);
        // Em caso de erro, redirecionar para consentimento
        const consentUrl = registrationType === 'associate' ? '/consent/associate' : '/consent/athlete';
        setLocation(consentUrl);
        return;
      }
      setIsCheckingConsent(false);
    };
    
    checkConsent();
  }, [registrationType, setLocation]);
  
  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Both athletes and associates use the public self-register endpoint
      const endpoint = '/api/athletes/self-register';
      // Remove formatting before sending to backend
      const cleanData = {
        ...data,
        cpf: data.cpf,
        phone: unformatPhone(data.phone),
        status: 'pending',
        consentData: consentData // Incluir dados de consentimento
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Erro no cadastro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowSuccessMessage(true);
      // Limpar dados de consentimento para evitar reutilização
      sessionStorage.removeItem('consentData');
    },
    onError: (error: any) => {
      // Show friendly error messages for unique field violations
      let title = "Não foi possível completar seu cadastro";
      let message = error.message;
      
      if (error.message.includes('CPF já cadastrado')) {
        title = "CPF já cadastrado";
      } else if (error.message.includes('RG já cadastrado')) {
        title = "RG já cadastrado";
      } else if (error.message.includes('Email já cadastrado')) {
        title = "Email já em uso";
      } else {
        message = "Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.";
      }
      
      toast({
        title: title,
        description: message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se a foto foi adicionada
    if (!formData.photoUrl) {
      toast({
        title: "Foto obrigatória",
        description: "Por favor, adicione sua foto para completar o cadastro.",
        variant: "destructive"
      });
      return;
    }
    
    submitMutation.mutate(formData);
  };

  const isAssociate = registrationType === 'associate';
  const title = isAssociate ? 'Cadastro de Associado' : 'Cadastro de Atleta';
  const subtitle = isAssociate 
    ? 'Complete seus dados para se cadastrar como associado' 
    : 'Complete seus dados para se cadastrar como atleta';
  const buttonText = isAssociate ? 'Cadastrar como Associado' : 'Cadastrar como Atleta';
  const bgGradient = isAssociate 
    ? 'bg-gradient-to-br from-green-50 to-emerald-100' 
    : 'bg-gradient-to-br from-blue-50 to-indigo-100';

  // Show loading while checking consent
  if (isCheckingConsent) {
    return (
      <div className={`min-h-screen ${bgGradient} flex items-center justify-center`}>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-600 mb-4">
              <svg className="animate-spin w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.5 8.5L12 12l7-7M8.5 15.5L12 12l-7 7"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verificando Consentimento...
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto verificamos suas informações de consentimento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success message instead of form
  if (showSuccessMessage) {
    const personType = isAssociate ? 'associado' : 'atleta';
    
    return (
      <div className={`min-h-screen ${bgGradient} flex items-center justify-center`}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  isAssociate ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Cadastro Realizado com Sucesso!
                </h1>
                <p className="text-gray-600 mb-6">
                  Seu cadastro como <strong>{personType}</strong> foi enviado e está aguardando aprovação dos administradores.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Próximos passos:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Nossa equipe analisará seus dados em até 48 horas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Você receberá um email de confirmação quando seu cadastro for aprovado</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Em caso de dúvidas, entre em contato conosco</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Precisa de ajuda?
                </h4>
                <p className="text-blue-700 text-sm mb-2">
                  Entre em contato conosco através do email:
                </p>
                <p className="text-blue-900 font-semibold">
                  contato@tenisdemesa.biz
                </p>
              </div>
              
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgGradient}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">{title}</CardTitle>
            <p className="text-muted-foreground text-center">{subtitle}</p>
            <div className="text-center">
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                Seu cadastro ficará pendente de aprovação
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Informação sobre consentimento confirmado */}
            {consentData && (
              <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>✅ Consentimento confirmado</strong> - Todos os termos foram aceitos em {new Date(consentData.consentTimestamp).toLocaleString('pt-BR')}.
                  {consentData.isMinor && (
                    <span className="block mt-1">
                      <strong>Responsável:</strong> {consentData.parentalData?.name || consentData.signerName} ({consentData.parentalData?.relationship})
                    </span>
                  )}
                  {!consentData.isMinor && (
                    <span className="block mt-1">
                      <strong>Assinado por:</strong> {consentData.signerName}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
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
                    />
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
                      placeholder="(11) 99999-9999"
                      maxLength={15}
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        setFormData({...formData, cpf: formatted});
                      }}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => setFormData({...formData, rg: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender">Gênero *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="club">Clube</Label>
                    <Input
                      id="club"
                      value={formData.club}
                      onChange={(e) => setFormData({...formData, club: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode">CEP *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                      placeholder="00000-000"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({...formData, street: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      placeholder="SP"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({...formData, complement: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Foto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Foto *</h3>
                <div className="max-w-xs">
                  <ImageUpload
                    onImageSelect={(imageUrl) => setFormData({...formData, photoUrl: imageUrl})}
                    currentImage={formData.photoUrl}
                    maxSizeMB={10}
                    aspectRatio="aspect-square"
                    label="Foto de Rosto"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className={`w-full ${isAssociate ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Enviando..." : buttonText}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
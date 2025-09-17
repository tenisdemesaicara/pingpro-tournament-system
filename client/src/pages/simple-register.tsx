import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trophy, User } from "lucide-react";
import ImageUpload from "@/components/image-upload";

interface SimpleRegisterProps {
  tournamentId: string;
}

export default function SimpleRegister({ tournamentId }: SimpleRegisterProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    birthDate: '',
    phone: '',
    gender: 'masculino',
    street: '',      
    neighborhood: '',
    zipCode: '',
    city: '',
    state: '',
    photoUrl: '',
    cpf: '',         // CPF obrigatório para identificação única
    rg: ''           // RG obrigatório
  });

  // Mutation para auto-cadastro
  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/athletes/self-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || `Erro HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Cadastro realizado!",
        description: "Sua inscrição foi enviada com sucesso. Aguarde aprovação.",
        duration: 5000,
      });
      setLocation('/');
    },
    onError: (error: any) => {
      console.error("❌ Erro no cadastro:", error);
      toast({
        title: "Não foi possível completar seu cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações obrigatórias
    if (!formData.name || !formData.email || !formData.birthDate || !formData.cpf || !formData.rg) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, email, data de nascimento, CPF e RG.",
        variant: "destructive",
      });
      return;
    }
    
    // Validação de CPF (formato básico)
    const cpfNumbers = formData.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "CPF deve ter 11 dígitos.",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Cadastro Simples</CardTitle>
            <p className="text-lg font-medium text-primary">Inscrição para Torneio</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <User className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="text-lg font-medium">Dados do Atleta</h3>
                <p className="text-sm text-muted-foreground">Preencha todos os campos obrigatórios</p>
              </div>
              
              {/* Dados pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
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
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                    required
                    data-testid="input-birthdate"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    data-testid="input-phone"
                  />
                </div>
                
                <div>
                  <Label htmlFor="gender">Gênero *</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
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
                  <Label htmlFor="cpf">CPF * (obrigatório)</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                    data-testid="input-cpf"
                  />
                </div>
                
                <div>
                  <Label htmlFor="rg">RG * (obrigatório)</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => handleInputChange('rg', e.target.value)}
                    placeholder="00.000.000-0"
                    required
                    data-testid="input-rg"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h4 className="text-md font-medium">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="street">Rua/Endereço</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      placeholder="Rua, Av, etc..."
                      data-testid="input-street"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                      data-testid="input-neighborhood"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      data-testid="input-city"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="SP"
                      data-testid="input-state"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="00000-000"
                      data-testid="input-zipcode"
                    />
                  </div>
                </div>
              </div>

              {/* Campo de foto */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span>📷 Foto do Atleta</span>
                  <span className="text-xs text-gray-500">(opcional)</span>
                </Label>
                <p className="text-sm text-gray-600">Sua foto aparecerá na página pública do torneio</p>
                <ImageUpload
                  onImageSelect={(imageUrl) => handleInputChange('photoUrl', imageUrl)}
                  currentImage={formData.photoUrl}
                  aspectRatio="aspect-square"
                  label="Foto do Atleta"
                />
              </div>
              
              {/* Botão de envio */}
              <div className="pt-6 border-t">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={registerMutation.isPending}
                  data-testid="button-submit"
                >
                  {registerMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cadastrando...
                    </>
                  ) : (
                    "Realizar Cadastro"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
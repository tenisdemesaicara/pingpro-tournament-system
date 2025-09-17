import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DigitalSignature from "@/components/digital-signature";

interface ConsentProps {
  type: "atleta" | "associado";
}

export default function Consent({ type }: ConsentProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [birthDate, setBirthDate] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [consents, setConsents] = useState({
    lgpd: false,
    imageRights: false,
    terms: false,
  });
  const [parentalData, setParentalData] = useState({
    parentName: "",
    parentCpf: "",
    parentEmail: "",
    relationship: "", // pai, mãe, responsável legal
  });
  const [signature, setSignature] = useState("");
  const [hasEnteredBirthDate, setHasEnteredBirthDate] = useState(false);

  const isAssociate = type === "associado";
  const title = isAssociate ? "Consentimento - Cadastro de Associado" : "Consentimento - Cadastro de Atleta";

  // Calcular se é menor de idade
  useEffect(() => {
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      setIsMinor(age < 18);
      setHasEnteredBirthDate(true);
    }
  }, [birthDate]);

  // Verificar se todos os consentimentos foram aceitos
  const allConsentsAccepted = Object.values(consents).every(consent => consent);
  
  // Verificar se dados dos pais estão completos (para menores)
  const parentalDataComplete = !isMinor || (
    parentalData.parentName.trim() !== "" &&
    parentalData.parentCpf.trim() !== "" &&
    parentalData.parentEmail.trim() !== "" &&
    parentalData.relationship.trim() !== ""
  );

  // Verificar se assinatura está completa (deve ser um dataURL válido)
  const signatureComplete = signature && signature.startsWith('data:image/');

  // Verificar se pode prosseguir
  const canProceed = hasEnteredBirthDate && allConsentsAccepted && parentalDataComplete && signatureComplete;

  const handleProceed = () => {
    if (canProceed) {
      // Salvar dados de consentimento no sessionStorage para usar no cadastro
      const consentData = {
        birthDate,
        isMinor,
        parentalData: isMinor ? parentalData : null,
        signature,
        signerName: isMinor ? parentalData.parentName : null, // Nome será preenchido no cadastro para maiores
        lgpdConsent: consents.lgpd,
        imageRightsConsent: consents.imageRights,
        termsConsent: consents.terms,
        consentTimestamp: new Date().toISOString()
      };
      
      sessionStorage.setItem('consentData', JSON.stringify(consentData));
      
      // Redirecionar para cadastro
      const targetUrl = isAssociate ? "/self-registration?type=associate" : "/self-registration?type=athlete";
      setLocation(targetUrl);
      
      toast({
        title: "Consentimento registrado",
        description: "Prossiga com seu cadastro.",
      });
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  return (
    <div className={`min-h-screen ${isAssociate ? 'bg-gradient-to-br from-green-50 to-emerald-100' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} dark:from-gray-900 dark:to-gray-800`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="text-muted-foreground">
              Para prosseguir com o cadastro, é necessário aceitar os termos de consentimento abaixo
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Data de Nascimento */}
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-lg text-yellow-700 dark:text-yellow-300">
                  🎂 Data de Nascimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                      className="max-w-xs"
                    />
                  </div>
                  
                  {hasEnteredBirthDate && isMinor && (
                    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Menor de idade detectado.</strong> Será necessário o consentimento e assinatura de um dos pais ou responsável legal.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {hasEnteredBirthDate && !isMinor && (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <AlertDescription>
                        ✅ Maior de idade. Você pode prosseguir com seu próprio consentimento.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dados dos Pais/Responsável (apenas para menores) */}
            {hasEnteredBirthDate && isMinor && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-700 dark:text-orange-300">
                    👨‍👩‍👧‍👦 Dados do Pai/Mãe/Responsável Legal
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Como o candidato é menor de idade, é necessário o consentimento de um responsável legal.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parentName">Nome Completo do Responsável *</Label>
                      <Input
                        id="parentName"
                        value={parentalData.parentName}
                        onChange={(e) => setParentalData({...parentalData, parentName: e.target.value})}
                        placeholder="Nome completo do pai/mãe/responsável"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="relationship">Grau de Parentesco *</Label>
                      <Input
                        id="relationship"
                        value={parentalData.relationship}
                        onChange={(e) => setParentalData({...parentalData, relationship: e.target.value})}
                        placeholder="Ex: Pai, Mãe, Responsável Legal"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="parentCpf">CPF do Responsável *</Label>
                      <Input
                        id="parentCpf"
                        value={parentalData.parentCpf}
                        onChange={(e) => {
                          const formatted = formatCPF(e.target.value);
                          setParentalData({...parentalData, parentCpf: formatted});
                        }}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="parentEmail">Email do Responsável *</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={parentalData.parentEmail}
                        onChange={(e) => setParentalData({...parentalData, parentEmail: e.target.value})}
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LGPD - Lei Geral de Proteção de Dados */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-lg text-blue-700 dark:text-blue-300">
                  📋 Proteção de Dados Pessoais (LGPD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Coleta e Uso de Dados:</strong> Os dados pessoais (nome, CPF, data de nascimento, 
                      endereço, telefone, e-mail, foto) são coletados para fins de cadastro no sistema, 
                      controle de categorias por idade, comunicação e identificação.
                    </p>
                    <p>
                      <strong>Finalidade:</strong> Os dados são utilizados exclusivamente para o cadastro 
                      e gestão do sistema de atletas/associados, incluindo comunicações, categorização 
                      por idade e emissão de relatórios.
                    </p>
                    <p>
                      <strong>Armazenamento:</strong> Seus dados são armazenados de forma segura e serão 
                      mantidos pelo período necessário para cumprimento das finalidades ou conforme exigido por lei.
                    </p>
                    <p>
                      <strong>Seus Direitos:</strong> Você pode solicitar acesso, correção, exclusão ou 
                      portabilidade dos dados conforme previsto na LGPD (Lei 13.709/2018).
                    </p>
                    <p>
                      <strong>Contato:</strong> Para exercer seus direitos ou esclarecer dúvidas sobre o 
                      tratamento dos dados, entre em contato através de: <strong>contato@tenisdemesa.biz</strong>
                    </p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="lgpd-consent"
                    checked={consents.lgpd}
                    onCheckedChange={(checked) => 
                      setConsents(prev => ({...prev, lgpd: checked as boolean}))
                    }
                  />
                  <label htmlFor="lgpd-consent" className="text-sm font-medium">
                    {isMinor ? 
                      "Como responsável legal, aceito os termos de proteção de dados pessoais (LGPD)" :
                      "Aceito os termos de proteção de dados pessoais (LGPD)"
                    }
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Autorização de Uso de Imagem e Áudio */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-lg text-green-700 dark:text-green-300">
                  📷 Autorização de Imagem e Áudio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Captação de Imagem:</strong> Durante eventos e atividades, poderão ser realizadas 
                      fotografias e gravações para fins de documentação e divulgação do esporte.
                    </p>
                    <p>
                      <strong>Uso e Veiculação:</strong> Autorizo o uso das imagens captadas durante 
                      minha participação em eventos para fins de divulgação em websites, redes sociais, 
                      materiais promocionais e outros meios de comunicação.
                    </p>
                    <p>
                      <strong>Direitos Autorais:</strong> Declaro estar ciente de que não terei direito a 
                      qualquer remuneração pela utilização das imagens nos termos desta autorização.
                    </p>
                    <p>
                      <strong>Vigência:</strong> Esta autorização tem validade por tempo indeterminado, 
                      podendo ser revogada por solicitação expressa.
                    </p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="image-consent"
                    checked={consents.imageRights}
                    onCheckedChange={(checked) => 
                      setConsents(prev => ({...prev, imageRights: checked as boolean}))
                    }
                  />
                  <label htmlFor="image-consent" className="text-sm font-medium">
                    {isMinor ? 
                      "Como responsável legal, autorizo o uso de imagem e áudio" :
                      "Autorizo o uso de minha imagem e áudio"
                    }
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Termos Gerais */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-lg text-purple-700 dark:text-purple-300">
                  📄 Termos Gerais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Veracidade das Informações:</strong> Declaro que todas as informações fornecidas 
                      são verdadeiras e me comprometo a mantê-las atualizadas.
                    </p>
                    <p>
                      <strong>Responsabilidades:</strong> Concordo em seguir todas as regras e normas 
                      estabelecidas pela organização e assumo total responsabilidade por minhas ações.
                    </p>
                    <p>
                      <strong>Alterações:</strong> A organização reserva-se o direito de alterar estes 
                      termos a qualquer momento, com devida comunicação prévia.
                    </p>
                    <p>
                      <strong>Legislação:</strong> Este consentimento é regido pela legislação brasileira, 
                      especialmente pela LGPD e demais normas aplicáveis.
                    </p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="terms-consent"
                    checked={consents.terms}
                    onCheckedChange={(checked) => 
                      setConsents(prev => ({...prev, terms: checked as boolean}))
                    }
                  />
                  <label htmlFor="terms-consent" className="text-sm font-medium">
                    {isMinor ? 
                      "Como responsável legal, aceito os termos gerais" :
                      "Aceito os termos gerais"
                    }
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Assinatura Digital */}
            {hasEnteredBirthDate && (
              <DigitalSignature
                onSignatureChange={(signatureData) => setSignature(signatureData)}
                title={isMinor ? 
                  "Assinatura Digital do Responsável Legal" : 
                  "Sua Assinatura Digital"
                }
                placeholder={isMinor ? 
                  "O responsável legal deve desenhar sua assinatura" :
                  "Desenhe sua assinatura"
                }
                required={true}
              />
            )}

            <Separator />

            {/* Botão para prosseguir */}
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleProceed}
                disabled={!canProceed}
                className={`px-8 py-3 text-lg ${
                  isAssociate ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                } ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Prosseguir com o Cadastro
              </Button>
            </div>
            
            {!canProceed && (
              <div className="text-center text-sm text-muted-foreground">
                {!hasEnteredBirthDate && "⚠️ Informe sua data de nascimento"}
                {hasEnteredBirthDate && !allConsentsAccepted && "⚠️ Aceite todos os termos de consentimento"}
                {hasEnteredBirthDate && !parentalDataComplete && "⚠️ Complete os dados do responsável legal"}
                {hasEnteredBirthDate && !signatureComplete && "⚠️ Desenhe sua assinatura digital"}
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
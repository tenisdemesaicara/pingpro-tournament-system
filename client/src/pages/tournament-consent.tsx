import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface TournamentConsentProps {
  tournamentId: string;
}

export default function TournamentConsent({ tournamentId }: TournamentConsentProps) {
  const [, setLocation] = useLocation();
  const [consents, setConsents] = useState({
    lgpd: false,
    imageRights: false,
    terms: false,
  });

  const allConsentsAccepted = Object.values(consents).every(consent => consent);

  const handleProceed = () => {
    if (allConsentsAccepted) {
      setLocation(`/tournament/${tournamentId}/register`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Consentimento e Termos de Participação</CardTitle>
            <p className="text-muted-foreground">
              Para participar do torneio, é necessário aceitar os termos abaixo
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
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
                      <strong>Coleta e Uso de Dados:</strong> Seus dados pessoais (nome, CPF, data de nascimento, 
                      endereço, telefone, e-mail) são coletados para fins de organização do torneio, 
                      controle de categorias por idade, comunicação sobre o evento e emissão de certificados.
                    </p>
                    <p>
                      <strong>Finalidade:</strong> Os dados são utilizados exclusivamente para a organização 
                      e realização do evento esportivo, incluindo divulgação de resultados, premiação e 
                      comunicação com os participantes.
                    </p>
                    <p>
                      <strong>Armazenamento:</strong> Seus dados são armazenados de forma segura e serão 
                      mantidos pelo período necessário para cumprimento das finalidades descritas ou 
                      conforme exigido por lei.
                    </p>
                    <p>
                      <strong>Seus Direitos:</strong> Você pode solicitar acesso, correção, exclusão ou 
                      portabilidade de seus dados a qualquer momento, conforme previsto na LGPD 
                      (Lei 13.709/2018).
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
                    Aceito os termos de proteção de dados pessoais (LGPD)
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
                      <strong>Captação de Imagem e Áudio:</strong> Durante o evento, poderão ser realizadas 
                      gravações de áudio, vídeo e fotografias para fins de documentação, divulgação e 
                      promoção do esporte.
                    </p>
                    <p>
                      <strong>Uso e Veiculação:</strong> Autorizo o uso das imagens e áudio captados durante 
                      minha participação no torneio para fins de divulgação em websites, redes sociais, 
                      materiais promocionais, transmissões ao vivo e outros meios de comunicação.
                    </p>
                    <p>
                      <strong>Direitos Autorais:</strong> Declaro estar ciente de que não terei direito a 
                      qualquer remuneração pela utilização de minha imagem e áudio nos termos desta autorização.
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
                    Autorizo o uso de minha imagem e áudio conforme descrito
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Termos de Participação */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-lg text-orange-700 dark:text-orange-300">
                  📜 Termos de Participação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Responsabilidade:</strong> Declaro estar em condições físicas adequadas para 
                      participar da competição e assumo total responsabilidade por eventuais lesões ou 
                      danos que possa vir a sofrer durante o evento.
                    </p>
                    <p>
                      <strong>Regulamento:</strong> Comprometo-me a seguir integralmente o regulamento do 
                      torneio, as decisões da arbitragem e manter conduta esportiva durante toda a competição.
                    </p>
                    <p>
                      <strong>Documentação:</strong> Declaro que as informações fornecidas são verdadeiras 
                      e comprometo-me a apresentar documentos de identificação quando solicitados.
                    </p>
                    <p>
                      <strong>Alterações:</strong> Estou ciente de que a organização pode fazer alterações 
                      no cronograma, local ou formato do torneio, sendo comunicadas com antecedência.
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
                    Aceito os termos de participação no torneio
                  </label>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-center gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleProceed}
                disabled={!allConsentsAccepted}
                className="px-8"
              >
                {allConsentsAccepted ? 'Prosseguir para Inscrição' : 'Aceite todos os termos para continuar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, QrCode, Share2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCodeGenerator from "@/components/qr-code-generator";

interface PublicRegistrationLinksProps {
  tournamentId: string;
  tournamentName: string;
  isOpen?: boolean;
}

export default function PublicRegistrationLinks({ 
  tournamentId, 
  tournamentName, 
  isOpen = false 
}: PublicRegistrationLinksProps) {
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  
  const baseUrl = import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin;
  const consentUrl = `${baseUrl}/consent/tournament/${tournamentId}`;
  const directUrl = `${baseUrl}/tournament/${tournamentId}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copiado!",
        description: `${type} copiado para a área de transferência`,
      });
    });
  };

  const shareLink = (url: string) => {
    if (navigator.share) {
      navigator.share({
        title: `Inscrição - ${tournamentName}`,
        text: `Participe do torneio: ${tournamentName}`,
        url: url,
      });
    } else {
      copyToClipboard(url, "Link de compartilhamento");
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <Users className="w-5 h-5" />
          Links de Inscrição Pública
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compartilhe estes links para permitir inscrições diretas dos atletas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Link com consentimento LGPD (recomendado) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Recomendado
            </Badge>
            <label className="text-sm font-medium">Link com Consentimento LGPD</label>
          </div>
          <div className="flex gap-2">
            <Input
              value={consentUrl}
              readOnly
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(consentUrl, "Link com consentimento")}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareLink(consentUrl)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openInNewTab(consentUrl)}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Este link leva o atleta primeiro pela página de consentimento LGPD e depois para a inscrição
          </p>
        </div>

        {/* Link direto */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Link Direto</label>
          <div className="flex gap-2">
            <Input
              value={directUrl}
              readOnly
              className="text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(directUrl, "Link direto")}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareLink(directUrl)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openInNewTab(directUrl)}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Link para visualização pública do torneio (sem inscrição automática)
          </p>
        </div>

        {/* Instruções de uso */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Como usar os links:
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Link com Consentimento:</strong> Use para promover inscrições via redes sociais, email, etc.</li>
            <li>• <strong>Link Direto:</strong> Para que pessoas vejam os detalhes do torneio</li>
            <li>• Os atletas precisam preencher todos os dados pessoais na inscrição</li>
            <li>• As inscrições ficam pendentes de aprovação do organizador</li>
          </ul>
        </div>

        {/* QR Codes para ambos os links */}
        <div className="flex justify-center gap-4">
          <QRCodeGenerator 
            originalUrl={consentUrl}
            linkType="tournament_registration_consent"
            tournamentId={tournamentId}
            title="QR Code - Inscrição com Consentimento"
            size={200}
            metadata={{ type: "consent" }}
          />
          <QRCodeGenerator 
            originalUrl={directUrl}
            linkType="tournament_public"
            tournamentId={tournamentId}
            title="QR Code - Link Direto"
            size={200}
            metadata={{ type: "direct" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
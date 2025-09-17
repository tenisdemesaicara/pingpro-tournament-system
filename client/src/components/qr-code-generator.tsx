import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface QRCodeGeneratorProps {
  originalUrl: string; // URL original que o usuário acessará
  linkType: string; // Tipo do link (tournament_public, tournament_registration, etc)
  title?: string;
  size?: number;
  // Props opcionais para dados adicionais do link
  tournamentId?: string;
  metadata?: Record<string, any>;
}

export default function QRCodeGenerator({ 
  originalUrl,
  linkType, 
  title = "QR Code", 
  size = 200,
  tournamentId,
  metadata 
}: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [shortUrl, setShortUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    const generateExternalLink = async () => {
      if (!originalUrl || !originalUrl.trim()) {
        console.warn("URL original vazia ou inválida para QR Code:", originalUrl);
        return;
      }

      setIsGenerating(true);
      
      try {
        console.log("Gerando link externo para URL:", originalUrl);
        
        const linkData = {
          originalUrl,
          linkType,
          tournamentId,
          metadata: metadata || {}
        };

        const response = await apiRequest(
          'POST', 
          '/api/public/external-links/generate',
          linkData
        );

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const result = await response.json();
        
        // Usar domínio do serviço de links se configurado, senão usar origem atual
        const baseUrl = import.meta.env.VITE_LINKS_SERVICE_URL || window.location.origin;
        const fullShortUrl = `${baseUrl}${result.shortUrl}`;
        
        console.log("Link externo criado:", result);
        console.log("URL curta completa:", fullShortUrl);
        console.log("Base URL usado:", baseUrl);
        
        setShortUrl(fullShortUrl);
        
        // Gerar QR Code com a URL curta
        const qrUrl = await QRCode.toDataURL(fullShortUrl, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        
        setQrCodeUrl(qrUrl);
        console.log("QR Code gerado com sucesso");
        
      } catch (error) {
        console.error("Erro ao gerar link externo ou QR code:", error);
        setQrCodeUrl("");
        setShortUrl("");
      } finally {
        setIsGenerating(false);
      }
    };

    generateExternalLink();
  }, [originalUrl, linkType, size, tournamentId, metadata]);

  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `qr-code-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const copyUrl = async () => {
    const urlToCopy = shortUrl || originalUrl;
    try {
      await navigator.clipboard.writeText(urlToCopy);
    } catch (err) {
      // Fallback para navegadores antigos
      const textArea = document.createElement('textarea');
      textArea.value = urlToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        variant="outline" 
        size="sm"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <span className="mr-1">📱</span>
        QR Code
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">📱</span>
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-center">
          {qrCodeUrl ? (
            <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">
                {isGenerating ? "Criando link e gerando QR Code..." : "Gerando QR Code..."}
              </p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            {qrCodeUrl ? "Escaneie para acessar o link ou compartilhe diretamente" : isGenerating ? "Criando link seguro..." : "Aguarde a geração do código"}
          </p>
          
          <div className="flex space-x-2">
            <Button onClick={copyUrl} variant="outline" className="flex-1" disabled={!shortUrl && !originalUrl}>
              <span className="mr-1">📋</span>
              Copiar Link
            </Button>
            <Button onClick={downloadQR} className="flex-1" disabled={!qrCodeUrl}>
              <span className="mr-1">⬇️</span>
              Baixar QR
            </Button>
          </div>
          
          <div className="bg-muted p-3 rounded text-xs break-all">
            {shortUrl ? (
              <>
                <div className="text-green-600 font-medium mb-2">Link seguro:</div>
                <div className="mb-2">{shortUrl}</div>
                <div className="text-gray-500 text-xs">Redireciona para:</div>
                <div className="opacity-70">{originalUrl}</div>
              </>
            ) : (
              <div>{originalUrl}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
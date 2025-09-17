import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ObjectUploaderProps {
  maxFileSize?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * Componente para upload de arquivos para o Object Storage
 * Suporta upload via seleção de arquivo ou câmera
 */
export function ObjectUploader({
  maxFileSize = 10485760, // 10MB padrão
  acceptedTypes = ["image/*"],
  onUploadComplete,
  onUploadError,
  buttonClassName,
  children,
  disabled = false,
}: ObjectUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (file.size > maxFileSize) {
      const error = `Arquivo muito grande. Tamanho máximo: ${Math.round(maxFileSize / 1024 / 1024)}MB`;
      onUploadError?.(error);
      toast({
        title: "Erro no upload",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // 1. Obter URL de upload pré-assinada
      const response = await apiRequest('POST', '/api/objects/upload', {});
      const { uploadURL } = await response.json();

      // 2. Upload direto para o storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Erro no upload do arquivo');
      }

      // 3. Definir política ACL
      const aclResponse = await apiRequest('PUT', '/api/athlete-photos', {
        photoURL: uploadURL.split('?')[0], // Remove query parameters
      });

      if (!aclResponse.ok) {
        throw new Error('Erro ao configurar permissões da foto');
      }

      const { objectPath } = await aclResponse.json();

      onUploadComplete?.(objectPath);
      toast({
        title: "Upload concluído!",
        description: "Foto enviada com sucesso",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido no upload";
      onUploadError?.(errorMessage);
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleCameraCapture = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Criar input file com capture="camera" para mobile
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'user'; // Câmera frontal para selfie
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleFileUpload(file);
        }
      };
      input.click();
    } else {
      toast({
        title: "Câmera não disponível",
        description: "Seu dispositivo não suporta acesso à câmera",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        {/* Upload de arquivo */}
        <div>
          <input
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={uploading || disabled}
          />
          <label htmlFor="file-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading || disabled}
              className={buttonClassName}
              asChild
            >
              <span>
                {uploading ? (
                  <>
                    <span className="material-icons mr-2 animate-spin">refresh</span>
                    Enviando...
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-2">folder_open</span>
                    {children || "Selecionar Arquivo"}
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>

        {/* Captura via câmera */}
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraCapture}
          disabled={uploading || disabled}
          data-testid="button-camera-capture"
        >
          <span className="material-icons mr-2">camera_alt</span>
          Câmera
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Tamanho máximo: {Math.round(maxFileSize / 1024 / 1024)}MB
      </p>
    </div>
  );
}
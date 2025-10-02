import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  maxSizeMB?: number;
  aspectRatio?: string;
  label?: string;
  enableCamera?: boolean;
}

export default function ImageUpload({ 
  onImageSelect, 
  currentImage, 
  maxSizeMB = 10,
  aspectRatio = "aspect-video",
  label = "Imagem",
  enableCamera = true
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (currentImage) {
      setPreview(currentImage);
    } else {
      setPreview(null);
    }
  }, [currentImage]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar tamanho do arquivo
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "Arquivo muito grande",
        description: `A imagem deve ter no máximo ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Revogar URL anterior se existir
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      // Criar preview local
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      setPreview(previewUrl);

      // Converter imagem para base64 para armazenamento local
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.onerror = () => {
          reject(new Error('Erro ao processar a imagem'));
        };
        reader.readAsDataURL(file);
      });
      
      // Usar base64 como imageUrl
      onImageSelect(base64String);
      setUploading(false);
      
      toast({
        title: "Sucesso!",
        description: "Imagem carregada com sucesso",
      });

    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar imagem",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    // Revogar URL do preview se existir
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    
    setPreview(null);
    onImageSelect("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">{label}</label>
      
      <div className={`relative ${aspectRatio} bg-muted rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors`}>
        {preview ? (
          <div className="relative w-full h-full">
            <img 
              src={preview} 
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <span className="mr-1">✏️</span>
                Alterar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemoveImage}
                disabled={uploading}
              >
                <span className="mr-1">🗑️</span>
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="text-4xl text-muted-foreground mb-3">
              {uploading ? "📤" : "🖼️"}
            </div>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {uploading ? "Carregando..." : `Adicione ${label.toLowerCase()}`}
            </p>
            
            {!uploading && (
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                {enableCamera && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1"
                    data-testid="button-camera"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Tirar Foto
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                  data-testid="button-upload"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Escolher Arquivo
                </Button>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-3">
              Máximo {maxSizeMB}MB • JPG, PNG, GIF
            </p>
          </div>
        )}
      </div>

      {/* Input para escolher arquivo da galeria */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
        data-testid="input-file"
      />
      
      {/* Input para capturar foto com câmera */}
      {enableCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
          data-testid="input-camera"
        />
      )}
    </div>
  );
}
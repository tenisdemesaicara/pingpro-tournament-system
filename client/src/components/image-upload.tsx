import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
  currentImage?: string;
  maxSizeMB?: number;
  aspectRatio?: string;
  label?: string;
}

export default function ImageUpload({ 
  onImageSelect, 
  currentImage, 
  maxSizeMB = 10,
  aspectRatio = "aspect-video",
  label = "Imagem"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      // Criar preview local
      const previewUrl = URL.createObjectURL(file);
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
    setPreview(null);
    onImageSelect("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
          <div 
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl text-muted-foreground mb-2">
              {uploading ? "📤" : "🖼️"}
            </div>
            <p className="text-sm text-muted-foreground text-center px-4">
              {uploading ? "Carregando..." : `Clique para adicionar ${label.toLowerCase()}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Máximo {maxSizeMB}MB • JPG, PNG, GIF
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
}
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Eye, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 3, 
  disabled = false 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detectar se o dispositivo suporta câmera
  const supportCamera = typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newImages: string[] = [];
    
    for (let i = 0; i < Math.min(files.length, maxImages - images.length); i++) {
      const file = files[i];
      
      // Verificar tamanho do arquivo (10MB máximo)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxFileSize) {
        alert(`O arquivo ${file.name} é muito grande. Tamanho máximo permitido: 10MB`);
        continue;
      }
      
      if (file.type.startsWith('image/')) {
        // Converter para base64 para demo - em produção usaria upload real
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = () => {
            newImages.push(reader.result as string);
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      }
    }
    
    onImagesChange([...images, ...newImages]);
    setIsUploading(false);
  }, [images, maxImages, onImagesChange]);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const openFileDialog = () => fileInputRef.current?.click();
  const openCameraDialog = () => cameraInputRef.current?.click();

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {/* Upload de arquivo */}
        <Button
          type="button"
          variant="outline"
          onClick={openFileDialog}
          disabled={disabled || images.length >= maxImages || isUploading}
          data-testid="button-upload-file"
        >
          <Upload className="w-4 h-4 mr-2" />
          Escolher Arquivo
        </Button>

        {/* Captura por câmera (só aparece se suportado) */}
        {supportCamera && (
          <Button
            type="button"
            variant="outline"
            onClick={openCameraDialog}
            disabled={disabled || images.length >= maxImages || isUploading}
            data-testid="button-camera"
          >
            <Camera className="w-4 h-4 mr-2" />
            Tirar Foto
          </Button>
        )}

        {images.length > 0 && (
          <span className="text-sm text-muted-foreground self-center">
            {images.length}/{maxImages} imagens
          </span>
        )}
      </div>

      {/* Preview das imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                <div className="aspect-square relative overflow-hidden rounded-md">
                  <img
                    src={image}
                    alt={`Imagem ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay com ações */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewImage(image)}
                          data-testid={`button-preview-${index}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <div className="flex items-center justify-center p-4">
                          <img
                            src={previewImage || image}
                            alt="Preview"
                            className="max-w-full max-h-[80vh] object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeImage(index)}
                      disabled={disabled}
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inputs ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={disabled}
      />
      
      {supportCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment" // Usa câmera traseira por padrão
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled}
        />
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RotateCcw className="w-4 h-4 animate-spin" />
          Processando imagens...
        </div>
      )}
    </div>
  );
}
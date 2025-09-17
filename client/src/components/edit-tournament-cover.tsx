import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ImageUpload from "@/components/image-upload";

interface EditTournamentCoverProps {
  tournamentId: string;
  currentCover?: string | null;
}

export default function EditTournamentCover({ tournamentId, currentCover }: EditTournamentCoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newCoverImage, setNewCoverImage] = useState<string>(currentCover || "");
  const { toast } = useToast();

  const updateCoverMutation = useMutation({
    mutationFn: async (coverImage: string) => {
      const response = await apiRequest('PUT', `/api/tournaments/${tournamentId}`, {
        coverImage: coverImage || null
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      toast({
        title: "✅ Capa atualizada!",
        description: "A imagem de capa do torneio foi alterada com sucesso.",
      });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao atualizar a capa do torneio.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateCoverMutation.mutate(newCoverImage);
  };

  const handleRemoveCover = () => {
    setNewCoverImage("");
    updateCoverMutation.mutate("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <span className="mr-1">🖼️</span>
          {currentCover ? "Trocar Capa" : "Adicionar Capa"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">🖼️</span>
            Editar Capa do Torneio
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <ImageUpload
            label="Nova Imagem de Capa (até 10MB)"
            onImageSelect={setNewCoverImage}
            currentImage={newCoverImage}
            maxSizeMB={10}
            aspectRatio="aspect-video"
          />
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A imagem será exibida nos cards do torneio e no QR code de compartilhamento.
              Recomendamos formato 16:9 (paisagem) para melhor visualização.
            </p>
            
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={handleRemoveCover}
                disabled={updateCoverMutation.isPending}
                className="text-red-600 hover:text-red-700"
              >
                🗑️ Remover Capa
              </Button>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={updateCoverMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updateCoverMutation.isPending || newCoverImage === currentCover}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                >
                  {updateCoverMutation.isPending ? (
                    <>⏳ Salvando...</>
                  ) : (
                    <>💾 Salvar Capa</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DeleteTournamentProps {
  tournamentId: string;
  tournamentName: string;
}

export default function DeleteTournament({ tournamentId, tournamentName }: DeleteTournamentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const expectedConfirmation = `REMOVER ${tournamentName}`;
  const isConfirmationValid = confirmationText === expectedConfirmation;

  const deleteTournamentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/tournaments/${tournamentId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      toast({
        title: "🗑️ Torneio removido",
        description: `O torneio "${tournamentName}" foi removido permanentemente.`,
      });
      setLocation('/tournaments');
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao remover o torneio.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (isConfirmationValid) {
      deleteTournamentMutation.mutate();
    }
  };

  const resetForm = () => {
    setConfirmationText("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
        >
          <span className="mr-1">🗑️</span>
          Remover Torneio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <span className="mr-2">⚠️</span>
            Remover Torneio
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              <strong>⚠️ Atenção!</strong> Esta ação é irreversível e irá remover permanentemente:
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>O torneio e todas as suas configurações</li>
                <li>Todas as inscrições de participantes</li>
                <li>Histórico de partidas e resultados</li>
                <li>Dados não poderão ser recuperados</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Para confirmar, digite exatamente:
              </label>
              <div className="mt-1 p-2 bg-gray-100 rounded border font-mono text-sm">
                REMOVER {tournamentName}
              </div>
            </div>

            <div>
              <Input
                placeholder="Digite a confirmação aqui..."
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className={`${
                  confirmationText && !isConfirmationValid 
                    ? "border-red-300 focus:border-red-500" 
                    : isConfirmationValid 
                    ? "border-green-300 focus:border-green-500" 
                    : ""
                }`}
                disabled={deleteTournamentMutation.isPending}
              />
              {confirmationText && !isConfirmationValid && (
                <p className="text-xs text-red-600 mt-1">
                  Texto de confirmação incorreto
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={deleteTournamentMutation.isPending}
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={handleDelete}
              disabled={!isConfirmationValid || deleteTournamentMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteTournamentMutation.isPending ? (
                <>⏳ Removendo...</>
              ) : (
                <>🗑️ Confirmar Remoção</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Edit } from "lucide-react";

interface EditTournamentDetailsProps {
  tournamentId: string;
  currentDeadline?: Date | null;
  currentStartDate?: Date | null;
  currentEndDate?: Date | null;
  currentLocation?: string | null;
}

export default function EditTournamentDetails({
  tournamentId,
  currentDeadline,
  currentStartDate,
  currentEndDate,
  currentLocation,
}: EditTournamentDetailsProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Format date to YYYY-MM-DDTHH:mm for datetime-local input
  const formatDateForInput = (date?: Date | null) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    registrationDeadline: formatDateForInput(currentDeadline),
    startDate: formatDateForInput(currentStartDate),
    endDate: formatDateForInput(currentEndDate),
    location: currentLocation || '',
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {};
      
      if (data.registrationDeadline) {
        payload.registrationDeadline = new Date(data.registrationDeadline).toISOString();
      }
      if (data.startDate) {
        payload.startDate = new Date(data.startDate).toISOString();
      }
      if (data.endDate) {
        payload.endDate = new Date(data.endDate).toISOString();
      }
      if (data.location) {
        payload.location = data.location;
      }

      return apiRequest('PATCH', `/api/tournaments/${tournamentId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', tournamentId] });
      toast({
        title: "Sucesso!",
        description: "Informações do torneio atualizadas.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar informações do torneio.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-edit-tournament-details">
          <Edit className="h-4 w-4 mr-2" />
          Editar Detalhes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Detalhes do Torneio</DialogTitle>
          <DialogDescription>
            Altere as informações do torneio conforme necessário.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationDeadline">
              <Calendar className="h-4 w-4 inline mr-2" />
              Prazo de Inscrição
            </Label>
            <Input
              id="registrationDeadline"
              type="datetime-local"
              value={formData.registrationDeadline}
              onChange={(e) =>
                setFormData({ ...formData, registrationDeadline: e.target.value })
              }
              data-testid="input-registration-deadline"
            />
            <p className="text-xs text-muted-foreground">
              Data limite para inscrições online
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              data-testid="input-start-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Data de Término</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              data-testid="input-end-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <Input
              id="location"
              type="text"
              placeholder="Local do torneio"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              data-testid="input-location"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

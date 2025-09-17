import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PendingAthlete {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate: string;
  cpf: string;
  rg: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  club?: string;
  gender: string;
  status: string;
  createdAt: string;
  photoUrl?: string;
}

export default function AdminApprovals() {
  const [selectedAthlete, setSelectedAthlete] = useState<PendingAthlete | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: pendingAthletes, isLoading } = useQuery<PendingAthlete[]>({
    queryKey: ["/api/athletes/admin-pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (athleteId: string) => {
      return await apiRequest('PATCH', `/api/athletes/${athleteId}`, { status: "approved" });
    },
    onSuccess: () => {
      toast({
        title: "Atleta aprovado!",
        description: "O atleta foi aprovado com sucesso e já pode acessar o sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes/admin-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes/pending"] }); // Atualizar aba atletas também
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ athleteId, reason }: { athleteId: string; reason: string }) => {
      return await apiRequest('PATCH', `/api/athletes/${athleteId}`, { status: "rejected", reason });
    },
    onSuccess: () => {
      toast({
        title: "Atleta rejeitado",
        description: "O cadastro foi rejeitado conforme o motivo informado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes/admin-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes/pending"] }); // Atualizar aba atletas também
      setRejectionReason("");
    },
  });

  const handleApprove = (athleteId: string) => {
    approveMutation.mutate(athleteId);
  };

  const handleReject = (athleteId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ athleteId, reason });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-icons animate-spin text-4xl mb-4">refresh</span>
          <p>Carregando cadastros pendentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Aprovação de Cadastros</h1>
        <p className="text-muted-foreground">
          Gerencie os cadastros de atletas e inscrições em torneios pendentes de aprovação
        </p>
        {pendingAthletes && pendingAthletes.length > 0 && (
          <div className="mt-4">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {pendingAthletes.length} cadastro{pendingAthletes.length !== 1 ? 's' : ''} pendente{pendingAthletes.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      {!pendingAthletes || pendingAthletes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <span className="material-icons text-6xl text-muted-foreground mb-4">check_circle</span>
            <h3 className="text-xl font-semibold mb-2">Nenhum cadastro pendente</h3>
            <p className="text-muted-foreground">
              Todos os cadastros foram processados!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingAthletes.map((athlete: PendingAthlete) => (
            <Card key={athlete.id} className="material-elevation-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{athlete.name}</CardTitle>
                    <p className="text-muted-foreground">{athlete.email}</p>
                  </div>
                  <Badge variant="secondary">
                    {athlete.gender === "masculino" ? "Masculino" : "Feminino"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label className="text-sm font-medium">Telefone</Label>
                    <p className="text-sm">{athlete.phone || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Data de Nascimento</Label>
                    <p className="text-sm">{new Date(athlete.birthDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">CPF</Label>
                    <p className="text-sm">{athlete.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">RG</Label>
                    <p className="text-sm">{athlete.rg}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cidade/Estado</Label>
                    <p className="text-sm">{athlete.city}/{athlete.state}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Clube</Label>
                    <p className="text-sm">{athlete.club || "Não informado"}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <Label className="text-sm font-medium">Endereço Completo</Label>
                  <p className="text-sm">
                    {athlete.street}, {athlete.neighborhood}, {athlete.city}/{athlete.state} - CEP: {athlete.zipCode}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(athlete.id)}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid={`button-approve-${athlete.id}`}
                  >
                    <span className="material-icons mr-2">check</span>
                    Aprovar
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        onClick={() => setSelectedAthlete(athlete)}
                        data-testid={`button-reject-${athlete.id}`}
                      >
                        <span className="material-icons mr-2">close</span>
                        Rejeitar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rejeitar Cadastro</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm">
                            Você está rejeitando o cadastro de: <strong>{selectedAthlete?.name}</strong>
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="rejection-reason">Motivo da rejeição *</Label>
                          <Textarea
                            id="rejection-reason"
                            placeholder="Informe o motivo da rejeição (será enviado por email para o atleta)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-2"
                            data-testid="input-rejection-reason"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setRejectionReason("")}>
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => selectedAthlete && handleReject(selectedAthlete.id, rejectionReason)}
                            disabled={rejectMutation.isPending}
                            data-testid="button-confirm-reject"
                          >
                            Confirmar Rejeição
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedAthlete(athlete)}
                    data-testid={`button-view-${athlete.id}`}
                  >
                    <span className="material-icons mr-2">visibility</span>
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
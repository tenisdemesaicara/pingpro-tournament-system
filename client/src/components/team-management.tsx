import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Team, type TeamMember, type TournamentTeam, type Athlete } from "@shared/schema";
import { Plus, Users, UserPlus, Trash2, Edit, Crown, ArrowUp, ArrowDown, Swords } from "lucide-react";
import TeamTiesView from "./team-ties-view";

interface TeamManagementProps {
  tournamentId: string;
  categoryId?: string;
}

export default function TeamManagement({ tournamentId, categoryId }: TeamManagementProps) {
  const { toast } = useToast();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newTeamData, setNewTeamData] = useState({
    name: "",
    club: "",
    notes: ""
  });

  // Buscar todas as equipes
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Buscar equipes inscritas no torneio
  const { data: tournamentTeams = [] } = useQuery<TournamentTeam[]>({
    queryKey: ["/api/tournaments", tournamentId, "teams"],
  });

  // 🔧 CORREÇÃO: Buscar contagem de membros usando queries simples
  const teamQueries = teams.map(team => ({
    queryKey: [`/api/teams/${team.id}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${team.id}/members`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!team.id,
    staleTime: 30000,
  }));

  // Usar o hook useQueries para múltiplas queries
  const teamMemberQueries = useQueries({
    queries: teamQueries,
  });

  // Função para buscar contagem de membros por equipe
  const getTeamMemberCount = (teamId: string) => {
    // Se for a equipe selecionada, use os dados carregados (mais preciso)
    if (selectedTeam?.id === teamId) {
      return teamMembers.length;
    }
    
    // Para outras equipes, buscar na query correspondente
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex >= 0 && teamMemberQueries[teamIndex]?.data) {
      return teamMemberQueries[teamIndex].data.length;
    }
    
    return 0;
  };

  // Buscar dados do torneio com participantes inscritos
  const { data: tournamentData } = useQuery<{ participants?: Athlete[] }>({
    queryKey: ["/api/tournaments", tournamentId],
  });

  // Buscar membros da equipe selecionada
  const { data: teamMembers = [], isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useQuery<(TeamMember & { athlete: Athlete })[]>({
    queryKey: ["/api/teams", selectedTeam?.id, "members", "with-athletes"],
    enabled: !!selectedTeam?.id,
    staleTime: 0,
    gcTime: 0, // 🔧 Não manter cache (React Query v5)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
  
  // 🔧 CORREÇÃO: Força refetch dos membros quando muda de equipe
  useEffect(() => {
    if (selectedTeam?.id) {
      console.log('\u26a1 TEAM CHANGED - Forçando refetch para team:', selectedTeam.id);
      refetchMembers();
    }
  }, [selectedTeam?.id, refetchMembers]);

  console.log('\u26a1 DEBUG QUERY - Selected team:', selectedTeam?.id);
  console.log('\u26a1 DEBUG QUERY - Members loading:', membersLoading);
  console.log('\u26a1 DEBUG QUERY - Members error:', membersError);
  console.log('\u26a1 DEBUG QUERY - Team members:', teamMembers);

  // Mutações para equipes
  const createTeamMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/member-counts"] }); // 🔧 NOVO: Invalidar contagens
      setIsCreateTeamOpen(false);
      setNewTeamData({ name: "", club: "", notes: "" });
      toast({
        title: "Sucesso!",
        description: "Equipe criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar equipe",
        variant: "destructive",
      });
    },
  });

  const registerTeamMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/tournaments/${tournamentId}/teams`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "teams"] });
      toast({
        title: "Sucesso!",
        description: "Equipe inscrita no torneio!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao inscrever equipe",
        variant: "destructive",
      });
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/teams/${selectedTeam?.id}/members`, data),
    onSuccess: async () => {
      // 🔧 CORREÇÃO CRÍTICA: Invalidar múltiplas queries + refetch imediato
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam?.id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/member-counts"] }); // 🔧 NOVO: Invalidar contagens // Para outras queries que dependem de membros
      queryClient.invalidateQueries({ queryKey: ["/api/teams/member-counts"] }); // 🔧 NOVO: Invalidar contagens
      await refetchMembers(); // 🔥 Forçar refetch imediato
      setIsAddMemberOpen(false);
      toast({
        title: "Sucesso!",
        description: "Membro adicionado à equipe!",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || "Erro ao adicionar membro";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: (memberId: string) => apiRequest('DELETE', `/api/team-members/${memberId}`),
    onSuccess: async () => {
      // 🔧 CORREÇÃO CRÍTICA: Invalidar múltiplas queries + refetch imediato
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam?.id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/member-counts"] }); // 🔧 NOVO: Invalidar contagens
      await refetchMembers(); // 🔥 Forçar refetch imediato
      toast({
        title: "Sucesso!",
        description: "Membro removido da equipe!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover membro",
        variant: "destructive",
      });
    },
  });

  const updateMemberOrderMutation = useMutation({
    mutationFn: ({ memberId, newOrder }: { memberId: string; newOrder: number }) =>
      apiRequest('PUT', `/api/team-members/${memberId}`, { boardOrder: newOrder }),
    onSuccess: async () => {
      // 🔧 CORREÇÃO CRÍTICA: Invalidar múltiplas queries + refetch imediato
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam?.id, "members"] });
      await refetchMembers(); // 🔥 Forçar refetch imediato
    },
  });

  const toggleCaptainMutation = useMutation({
    mutationFn: ({ memberId, isCaptain }: { memberId: string; isCaptain: boolean }) =>
      apiRequest('PUT', `/api/team-members/${memberId}`, { isCaptain }),
    onSuccess: async () => {
      // 🔧 CORREÇÃO CRÍTICA: Invalidar múltiplas queries + refetch imediato
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeam?.id, "members"] });
      await refetchMembers(); // 🔥 Forçar refetch imediato
      toast({
        title: "Sucesso!",
        description: "Status de capitão atualizado!",
      });
    },
  });

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    createTeamMutation.mutate(newTeamData);
  };

  const handleRegisterTeam = (teamId: string) => {
    registerTeamMutation.mutate({
      teamId,
      categoryId: categoryId || "default",
      groupLabel: "A", // Será ajustado posteriormente
    });
  };

  const handleAddMember = (athleteId: string) => {
    // VALIDAÇÃO: Verificar se o atleta já está na equipe
    const isAlreadyInTeam = teamMembers.some(member => member.athleteId === athleteId);
    if (isAlreadyInTeam) {
      toast({
        title: "Erro",
        description: "Este atleta já está na equipe!",
        variant: "destructive",
      });
      return;
    }

    // Calcular próxima posição com segurança
    const existingOrders = teamMembers.map(m => m.boardOrder || 0).filter(order => order > 0);
    const nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;
    
    addTeamMemberMutation.mutate({
      athleteId,
      boardOrder: nextOrder,
      isCaptain: teamMembers.length === 0, // Primeiro membro é capitão
    });
  };

  const handleMoveUp = (member: TeamMember & { athlete: Athlete }) => {
    const currentOrder = member.boardOrder || 0;
    if (currentOrder > 1) {
      updateMemberOrderMutation.mutate({
        memberId: member.id,
        newOrder: currentOrder - 1,
      });
      
      // Trocar com o membro acima
      const memberAbove = teamMembers.find(m => m.boardOrder === currentOrder - 1);
      if (memberAbove) {
        updateMemberOrderMutation.mutate({
          memberId: memberAbove.id,
          newOrder: currentOrder,
        });
      }
    }
  };

  const handleMoveDown = (member: TeamMember & { athlete: Athlete }) => {
    const currentOrder = member.boardOrder || 0;
    const maxOrder = Math.max(...teamMembers.map(m => m.boardOrder || 0));
    
    if (currentOrder < maxOrder) {
      updateMemberOrderMutation.mutate({
        memberId: member.id,
        newOrder: currentOrder + 1,
      });
      
      // Trocar com o membro abaixo
      const memberBelow = teamMembers.find(m => m.boardOrder === currentOrder + 1);
      if (memberBelow) {
        updateMemberOrderMutation.mutate({
          memberId: memberBelow.id,
          newOrder: currentOrder,
        });
      }
    }
  };

  const registeredTeamIds = new Set(tournamentTeams.map(tt => tt.teamId));
  const availableTeams = teams.filter(team => !registeredTeamIds.has(team.id));
  
  // CORREÇÃO CRÍTICA: Apenas atletas INSCRITOS no torneio podem ser adicionados às equipes
  const enrolledAthletes = tournamentData?.participants || [];
  
  console.log('DEBUG FILTER - Atletas inscritos:', enrolledAthletes.length);
  console.log('DEBUG FILTER - Membros atuais da equipe:', teamMembers.length);
  console.log('DEBUG FILTER - IDs dos membros:', teamMembers.map(m => m.athleteId));
  
  const availableAthletes = enrolledAthletes.filter((participant: any) => {
    const isAlreadyInTeam = teamMembers.some(member => member.athleteId === participant.id);
    console.log(`DEBUG FILTER - Atleta ${participant.name} (${participant.id}) já na equipe: ${isAlreadyInTeam}`);
    return !isAlreadyInTeam;
  });
  
  console.log('DEBUG FILTER - Atletas disponíveis:', availableAthletes.length);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="manage" className="w-full">
        <TabsList>
          <TabsTrigger value="manage">Gerenciar Equipes</TabsTrigger>
          <TabsTrigger value="register">Inscrever Equipes</TabsTrigger>
          <TabsTrigger value="confrontos" className="flex items-center gap-2">
            <Swords className="h-4 w-4" />
            Confrontos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          {/* Lista de Equipes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipes Disponíveis
              </CardTitle>
              
              <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-team">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Equipe
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Equipe</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    <div>
                      <Label htmlFor="team-name">Nome da Equipe</Label>
                      <Input
                        id="team-name"
                        value={newTeamData.name}
                        onChange={(e) => setNewTeamData({...newTeamData, name: e.target.value})}
                        required
                        data-testid="input-team-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-club">Clube</Label>
                      <Input
                        id="team-club"
                        value={newTeamData.club}
                        onChange={(e) => setNewTeamData({...newTeamData, club: e.target.value})}
                        data-testid="input-team-club"
                      />
                    </div>
                    <div>
                      <Label htmlFor="team-notes">Notas</Label>
                      <Input
                        id="team-notes"
                        value={newTeamData.notes}
                        onChange={(e) => setNewTeamData({...newTeamData, notes: e.target.value})}
                        data-testid="input-team-notes"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={createTeamMutation.isPending} data-testid="button-save-team">
                        {createTeamMutation.isPending ? "Criando..." : "Criar Equipe"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsCreateTeamOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTeam?.id === team.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTeam(team)}
                    data-testid={`team-card-${team.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        {team.club && (
                          <p className="text-sm text-muted-foreground">Clube: {team.club}</p>
                        )}
                        {team.notes && (
                          <p className="text-xs text-muted-foreground">{team.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {registeredTeamIds.has(team.id) && (
                          <Badge className="bg-green-100 text-green-800">Inscrita</Badge>
                        )}
                        <Badge variant="outline">
                          {getTeamMemberCount(team.id)} membros
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes da Equipe Selecionada */}
          {selectedTeam && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle>Membros da Equipe: {selectedTeam.name}</CardTitle>
                
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-add-member">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar Membro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Label>Selecionar Atleta Inscrito</Label>
                      {availableAthletes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Nenhum atleta inscrito disponível</p>
                          <p className="text-sm">Apenas atletas inscritos no torneio podem ser adicionados às equipes</p>
                        </div>
                      ) : (
                        <div className="grid gap-2 max-h-48 sm:max-h-60 overflow-y-auto">
                        {availableAthletes.map((participant: Athlete) => (
                          <div
                            key={participant.id}
                            className="p-2 sm:p-3 border rounded-lg cursor-pointer hover:bg-gray-50 text-left"
                            onClick={() => handleAddMember(participant.id)}
                            data-testid={`athlete-option-${participant.id}`}
                          >
                            <div className="font-medium text-sm sm:text-base">{participant.name}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground break-all">{participant.email}</div>
                          </div>
                        ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers
                    .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0))
                    .map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`team-member-${member.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{member.boardOrder}</Badge>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.athlete.name}</span>
                              {member.isCaptain && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">{member.athlete.email}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveUp(member)}
                            disabled={(member.boardOrder || 0) <= 1}
                            data-testid={`button-move-up-${member.id}`}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveDown(member)}
                            disabled={(member.boardOrder || 0) >= teamMembers.length}
                            data-testid={`button-move-down-${member.id}`}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCaptainMutation.mutate({
                              memberId: member.id,
                              isCaptain: !member.isCaptain
                            })}
                            data-testid={`button-toggle-captain-${member.id}`}
                          >
                            <Crown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeTeamMemberMutation.mutate(member.id)}
                            data-testid={`button-remove-member-${member.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  
                  {teamMembers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Esta equipe não possui membros ainda. Clique em "Adicionar Membro" para começar.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="register" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inscrever Equipes no Torneio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableTeams.length > 0 ? (
                  availableTeams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                      data-testid={`register-team-${team.id}`}
                    >
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        {team.club && (
                          <p className="text-sm text-muted-foreground">Clube: {team.club}</p>
                        )}
                        {team.notes && (
                          <p className="text-xs text-muted-foreground">{team.notes}</p>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleRegisterTeam(team.id)}
                        disabled={registerTeamMutation.isPending}
                        data-testid={`button-register-${team.id}`}
                      >
                        {registerTeamMutation.isPending ? "Inscrevendo..." : "Inscrever"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Todas as equipes disponíveis já estão inscritas neste torneio.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipes Inscritas */}
          {tournamentTeams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Equipes Inscritas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {tournamentTeams.map((tournamentTeam) => {
                    const team = teams.find(t => t.id === tournamentTeam.teamId);
                    return (
                      <div
                        key={tournamentTeam.id}
                        className="p-4 border rounded-lg bg-green-50 border-green-200"
                        data-testid={`registered-team-${tournamentTeam.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{team?.name}</h3>
                            {team?.club && (
                              <p className="text-sm text-muted-foreground">Clube: {team.club}</p>
                            )}
                            {team?.notes && (
                              <p className="text-xs text-muted-foreground">{team.notes}</p>
                            )}
                            <Badge className="bg-blue-100 text-blue-800 mt-1">
                              Grupo {tournamentTeam.groupLabel}
                            </Badge>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Inscrita</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="confrontos" className="space-y-6">
          {categoryId ? (
            <TeamTiesView 
              tournamentId={tournamentId}
              categoryId={categoryId}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Selecione uma categoria válida para visualizar os confrontos entre equipes.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
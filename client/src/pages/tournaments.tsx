import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import TournamentCardProfessional from "@/components/tournament-card-professional";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Tournament } from "@shared/schema";

export default function Tournaments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: tournaments, isLoading } = useQuery<Tournament[]>({
    queryKey: ['/api/tournaments'],
  });

  const filteredTournaments = tournaments?.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.organizer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = selectedFormat === "all" || tournament.format === selectedFormat;
    const matchesCategory = selectedCategory === "all" || tournament.category === selectedCategory;
    return matchesSearch && matchesFormat && matchesCategory;
  }) || [];

  const groupTournamentsByStatus = (status: string) => {
    return filteredTournaments.filter(t => t.status === status);
  };

  const formats = [
    { value: "all", label: "Todos os Formatos" },
    { value: "single_elimination", label: "Eliminação Simples" },
    { value: "double_elimination", label: "Eliminação Dupla" },
    { value: "round_robin", label: "Round Robin" },
    { value: "swiss", label: "Sistema Suíço" },
    { value: "league", label: "Liga" },
    { value: "cup", label: "Copa" },
  ];

  const categories = [
    { value: "all", label: "Todas as Categorias" },
    { value: "A", label: "Categoria A" },
    { value: "B", label: "Categoria B" },
    { value: "C", label: "Categoria C" },
    { value: "D", label: "Categoria D" },
    { value: "Iniciante", label: "Iniciante" },
    { value: "Universitário", label: "Universitário" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4 w-48"></div>
            <div className="h-4 bg-muted rounded mb-8 w-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-20"></div>
                      <div className="h-8 bg-muted rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
                Torneios de Tênis de Mesa
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore e participe dos melhores torneios do país
              </p>
            </div>
            <Link href="/create-tournament">
              <Button className="material-elevation-1" data-testid="button-create-tournament">
                <span className="material-icons mr-2">add</span>
                Criar Torneio
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Buscar
                </label>
                <Input
                  placeholder="Nome do torneio ou organizador"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Formato
                </label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger data-testid="select-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Categoria
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedFormat("all");
                    setSelectedCategory("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  <span className="material-icons mr-2">clear</span>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Tabs */}
        <Tabs defaultValue="all" data-testid="tournament-tabs">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger value="all" data-testid="tab-all" className="text-xs md:text-sm px-2 py-1">
              <span className="hidden sm:inline">Todos</span>
              <span className="sm:hidden">Todos</span>
              <span className="ml-1">({filteredTournaments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="registration_open" data-testid="tab-registration" className="text-xs md:text-sm px-2 py-1">
              <span className="hidden sm:inline">Inscrições Abertas</span>
              <span className="sm:hidden">Abertas</span>
              <span className="ml-1">({groupTournamentsByStatus('registration_open').length})</span>
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-live" className="text-xs md:text-sm px-2 py-1">
              <span className="hidden sm:inline">Ao Vivo</span>
              <span className="sm:hidden">Vivo</span>
              <span className="ml-1">({groupTournamentsByStatus('in_progress').length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed" className="text-xs md:text-sm px-2 py-1">
              <span className="hidden sm:inline">Finalizados</span>
              <span className="sm:hidden">Finais</span>
              <span className="ml-1">({groupTournamentsByStatus('completed').length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {filteredTournaments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <span className="material-icons text-6xl text-muted-foreground mb-4 block">
                    sports_tennis
                  </span>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Nenhum torneio encontrado
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Não encontramos torneios com os filtros selecionados.
                  </p>
                  <Link href="/create-tournament">
                    <Button data-testid="button-create-first-tournament">
                      Criar Primeiro Torneio
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTournaments.map((tournament) => (
                  <TournamentCardProfessional 
                    key={tournament.id}
                    tournament={tournament}
                    onViewClick={(id) => window.location.href = `/tournaments/${id}`}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="registration_open" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupTournamentsByStatus('registration_open').map((tournament) => (
                <TournamentCardProfessional 
                  key={tournament.id}
                  tournament={tournament}
                  onViewClick={(id) => window.location.href = `/tournaments/${id}`}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="in_progress" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupTournamentsByStatus('in_progress').map((tournament) => (
                <TournamentCardProfessional 
                  key={tournament.id}
                  tournament={tournament}
                  onViewClick={(id) => window.location.href = `/tournaments/${id}`}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupTournamentsByStatus('completed').map((tournament) => (
                <TournamentCardProfessional 
                  key={tournament.id}
                  tournament={tournament}
                  onViewClick={(id) => window.location.href = `/tournaments/${id}`}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2" data-testid="stat-total-tournaments">
                {tournaments?.length || 0}
              </div>
              <div className="text-muted-foreground">Total de Torneios</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-secondary mb-2" data-testid="stat-active-tournaments">
                {groupTournamentsByStatus('in_progress').length + groupTournamentsByStatus('registration_open').length}
              </div>
              <div className="text-muted-foreground">Torneios Ativos</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2" data-testid="stat-total-participants">
                {tournaments?.reduce((sum, t) => sum + (t.currentParticipants || 0), 0) || 0}
              </div>
              <div className="text-muted-foreground">Total de Participantes</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

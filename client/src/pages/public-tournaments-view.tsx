import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Users, Trophy, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  format: string;
  status: string;
  description?: string;
  registrationDeadline?: string;
  maxParticipants?: number;
  currentParticipants?: number;
}

export default function PublicTournamentsView() {
  const { data: tournaments, isLoading } = useQuery<Tournament[]>({
    queryKey: ['/api/tournaments/active'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando torneios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-page-title">
            Torneios Ativos
          </h1>
          <p className="text-gray-600 dark:text-gray-400" data-testid="text-page-subtitle">
            Acompanhe os torneios da Associação Mesatenista de Içara
          </p>
        </div>

        {/* Lista de Torneios */}
        <div className="grid gap-6">
          {!tournaments || tournaments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" data-testid="text-no-tournaments">
                  Nenhum torneio ativo no momento
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Novos torneios serão anunciados em breve!
                </p>
              </CardContent>
            </Card>
          ) : (
            tournaments.map((tournament) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-shadow" data-testid={`card-tournament-${tournament.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2" data-testid={`text-tournament-name-${tournament.id}`}>
                        {tournament.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span data-testid={`text-tournament-date-${tournament.id}`}>
                            {format(new Date(tournament.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span data-testid={`text-tournament-location-${tournament.id}`}>
                            {tournament.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={tournament.status === 'active' ? 'default' : 'secondary'}
                      data-testid={`badge-tournament-status-${tournament.id}`}
                    >
                      {tournament.status === 'active' ? 'Ativo' : tournament.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {tournament.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4" data-testid={`text-tournament-description-${tournament.id}`}>
                      {tournament.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span data-testid={`text-tournament-participants-${tournament.id}`}>
                          {tournament.currentParticipants || 0}
                          {tournament.maxParticipants && `/${tournament.maxParticipants}`} participantes
                        </span>
                      </div>
                      <Badge variant="outline" data-testid={`badge-tournament-format-${tournament.id}`}>
                        {tournament.format}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/tournament/${tournament.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-tournament-${tournament.id}`}>
                          Visualizar
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
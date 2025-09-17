import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Tournament } from "@shared/schema";
import QRCodeGenerator from "@/components/qr-code-generator";
import { useToast } from "@/hooks/use-toast";

interface TournamentCardProps {
  tournament: Tournament;
  onViewClick?: (id: string) => void;
  onJoinClick?: (id: string) => void;
}

export default function TournamentCard({ tournament, onViewClick, onJoinClick }: TournamentCardProps) {
  const { toast } = useToast();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-red-500";
      case "registration_open":
        return "bg-orange-500";
      case "completed":
        return "bg-green-500";
      case "ready_to_finish":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress":
        return "AO VIVO";
      case "registration_open":
        return "INSCRIÇÕES ABERTAS";
      case "completed":
        return "FINALIZADO";
      case "ready_to_finish":
        return "PRONTO PARA FINALIZAR";
      case "draft":
        return "RASCUNHO";
      default:
        return status.toUpperCase();
    }
  };

  const formatType = (format: string) => {
    switch (format) {
      case "single_elimination":
        return "eliminação simples";
      case "double_elimination":
        return "eliminação dupla";
      case "round_robin":
        return "round robin";
      case "swiss":
        return "sistema suíço";
      case "league":
        return "liga";
      case "group_stage_knockout":
        return "grupos + mata-mata";
      default:
        return format;
    }
  };

  // URLs para compartilhamento
  const baseUrl = import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin;
  const tournamentUrl = `${baseUrl}/tournaments/${tournament.id}`;
  const publicUrl = `${baseUrl}/tournament/${tournament.id}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copiado!",
        description: "Link público do torneio copiado para área de transferência",
      });
    } catch (err) {
      // Fallback para navegadores sem clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Link copiado!",
        description: "Link público do torneio copiado para área de transferência",
      });
    }
  };

  return (
    <Card className="material-elevation-1 hover:material-elevation-2 transition-all duration-300 overflow-hidden relative" data-testid={`card-tournament-${tournament.id}`}>
      {/* QR Code SEMPRE visível no topo direito */}
      <div className="absolute top-3 right-3 flex space-x-2 z-20 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
        <QRCodeGenerator 
          originalUrl={publicUrl}
          linkType="tournament_public"
          tournamentId={tournament.id}
          title={`Torneio ${tournament.name}`}
        />
        <Button size="sm" variant="ghost" onClick={copyShareLink} className="h-8 w-8 p-0">
          <span className="text-sm">🔗</span>
        </Button>
      </div>
      
      {/* Cover Image */}
      {tournament.coverImage && (
        <div className="aspect-video w-full relative overflow-hidden">
          <img 
            src={tournament.coverImage} 
            alt={tournament.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}
      
      <CardContent className={tournament.coverImage ? "p-4" : "p-6"}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {tournament.status === "in_progress" && (
              <div className={`w-3 h-3 ${getStatusColor(tournament.status)} rounded-full animate-pulse`}></div>
            )}
            <Badge variant={tournament.status === "in_progress" ? "destructive" : "secondary"} data-testid={`badge-status-${tournament.id}`}>
              {getStatusText(tournament.status)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground" data-testid={`text-created-${tournament.id}`}>
            {new Date(tournament.createdAt || 0).toLocaleDateString('pt-BR')}
          </span>
        </div>
        
        <h4 className="text-lg font-semibold text-foreground mb-2" data-testid={`text-tournament-name-${tournament.id}`}>
          {tournament.name}
        </h4>
        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-tournament-details-${tournament.id}`}>
          {tournament.organizer} - {formatType(tournament.format || '')}
        </p>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-primary text-lg">👥</span>
              <span data-testid={`text-participants-${tournament.id}`}>
                {(tournament as any).participants?.length || 0} inscritos
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-secondary text-lg">🏓</span>
              <span data-testid={`text-category-${tournament.id}`}>
                {(tournament as any).categories?.length || 0} categorias
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {tournament.status === "registration_open" && onJoinClick && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onJoinClick(tournament.id)}
                data-testid={`button-join-${tournament.id}`}
              >
                Inscrever-se
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={() => onViewClick?.(tournament.id)}
              data-testid={`button-view-${tournament.id}`}
            >
              {tournament.status === "in_progress" ? "Assistir" : "Ver"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

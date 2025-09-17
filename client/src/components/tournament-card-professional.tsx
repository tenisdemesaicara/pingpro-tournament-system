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

export default function TournamentCardProfessional({ tournament, onViewClick, onJoinClick }: TournamentCardProps) {
  const { toast } = useToast();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-gradient-to-r from-red-500 to-red-600";
      case "registration_open": return "bg-gradient-to-r from-orange-500 to-orange-600";
      case "completed": return "bg-gradient-to-r from-green-500 to-green-600";
      default: return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress": return "🔴 AO VIVO";
      case "registration_open": return "✅ INSCRIÇÕES ABERTAS";
      case "completed": return "🏆 FINALIZADO";
      case "draft": return "📝 RASCUNHO";
      default: return status.toUpperCase();
    }
  };

  const formatType = (format: string) => {
    switch (format) {
      case "single_elimination": return "Eliminação Simples";
      case "double_elimination": return "Eliminação Dupla";
      case "round_robin": return "Round Robin";
      case "swiss": return "Sistema Suíço";
      case "league": return "Liga";
      case "cup": return "Copa";
      case "group_stage_knockout": return "Grupos + Mata-mata";
      default: return format;
    }
  };

  // URLs para compartilhamento - página pública sem menu administrativo
  const baseUrl = import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin;
  const publicUrl = `${baseUrl}/tournament/${tournament.id}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "🔗 Link copiado!",
        description: "Link público do torneio foi copiado para área de transferência",
      });
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "🔗 Link copiado!",
        description: "Link público do torneio foi copiado para área de transferência",
      });
    }
  };

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02] rounded-2xl" data-testid={`card-tournament-${tournament.id}`}>
      
      {/* Cover Image with Overlay */}
      {tournament.coverImage ? (
        <div className="relative h-48 overflow-hidden rounded-t-2xl">
          <img 
            src={tournament.coverImage} 
            alt={tournament.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          
          {/* Status Badge on Image */}
          <Badge className={`absolute top-4 left-4 ${getStatusColor(tournament.status)} text-white border-0 px-3 py-1 font-semibold text-sm shadow-lg`}>
            {getStatusText(tournament.status)}
          </Badge>
          
          {/* Action Buttons on Image */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <div className="bg-white/95 hover:bg-white rounded-lg p-1 shadow-lg backdrop-blur-sm">
              <QRCodeGenerator 
                originalUrl={publicUrl}
                linkType="tournament_public"
                tournamentId={tournament.id}
                title={`Torneio ${tournament.name}`}
                size={256}
              />
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={copyShareLink}
              className="bg-white/95 hover:bg-white text-gray-900 border-0 shadow-lg backdrop-blur-sm"
            >
              🔗
            </Button>
          </div>
          
          {/* Title on Image */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-2xl font-bold text-white mb-1 line-clamp-2">{tournament.name}</h3>
            <p className="text-white/90 font-medium">{tournament.organizer}</p>
          </div>
        </div>
      ) : (
        /* No Image - Header with Gradient */
        <div className="relative h-32 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Status Badge */}
          <Badge className={`absolute top-4 left-4 ${getStatusColor(tournament.status)} text-white border-0 px-3 py-1 font-semibold text-sm shadow-lg`}>
            {getStatusText(tournament.status)}
          </Badge>
          
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <div className="bg-white/95 hover:bg-white rounded-lg p-1 shadow-lg backdrop-blur-sm">
              <QRCodeGenerator 
                originalUrl={publicUrl}
                linkType="tournament_public"
                tournamentId={tournament.id}
                title={`Torneio ${tournament.name}`}
                size={256}
              />
            </div>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={copyShareLink}
              className="bg-white/95 hover:bg-white text-gray-900 border-0 shadow-lg backdrop-blur-sm"
            >
              🔗
            </Button>
          </div>
          
          {/* Title */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{tournament.name}</h3>
            <p className="text-white/90 font-medium">{tournament.organizer}</p>
          </div>
        </div>
      )}

      {/* Card Content */}
      <CardContent className="p-6">
        
        {/* Format and Details */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
              🏓 {formatType(tournament.format || '')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {tournament.season}
            </span>
          </div>
          
          {tournament.location && (
            <p className="text-sm text-muted-foreground flex items-center">
              📍 {tournament.location}
            </p>
          )}
        </div>

        {/* Description */}
        {tournament.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {tournament.description}
          </p>
        )}
        
        {/* Stats Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm">👥</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground" data-testid={`text-participants-${tournament.id}`}>
                  {(tournament as any).participants?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">inscritos</p>
              </div>
            </div>
            
            {tournament.prizePool && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">💰</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {tournament.prizePool}
                  </p>
                  <p className="text-xs text-muted-foreground">premiação</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          {tournament.status === "registration_open" && onJoinClick && (
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onJoinClick(tournament.id);
              }}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid={`button-join-${tournament.id}`}
            >
              ⚡ Inscrever-se
            </Button>
          )}
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewClick?.(tournament.id);
            }}
            variant={tournament.status === "registration_open" && onJoinClick ? "outline" : "default"}
            className={`${tournament.status === "registration_open" && onJoinClick ? "flex-1" : "w-full"} ${
              !(tournament.status === "registration_open" && onJoinClick) ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl" : ""
            } transition-all duration-300`}
            data-testid={`button-view-${tournament.id}`}
          >
            {tournament.status === "in_progress" ? "👁️ Assistir" : "📋 Detalhes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
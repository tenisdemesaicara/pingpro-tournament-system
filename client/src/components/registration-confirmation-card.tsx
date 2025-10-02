import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, CheckCircle, Download, MapPin, Trophy, User, Users } from "lucide-react";

interface RegistrationConfirmationCardProps {
  registrationNumber: string;
  athleteName: string;
  athletePhoto?: string;
  athleteAge: number;
  categories: string[];
  club?: string;
  city?: string;
  tournamentName: string;
  registrationDate: string;
  publicShareUrl: string;
}

export default function RegistrationConfirmationCard({
  registrationNumber,
  athleteName,
  athletePhoto,
  athleteAge,
  categories,
  club,
  city,
  tournamentName,
  registrationDate,
  publicShareUrl
}: RegistrationConfirmationCardProps) {
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };
  
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const downloadCard = async () => {
    // Criar uma versão para impressão do card
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const safeAthletePhoto = athletePhoto ? escapeHtml(athletePhoto) : '';
      const safeRegistrationNumber = escapeHtml(registrationNumber);
      const safeTournamentName = escapeHtml(tournamentName);
      const safeAthleteName = escapeHtml(athleteName);
      const safeClub = club ? escapeHtml(club) : '';
      const safeCity = city ? escapeHtml(city) : '';
      const safeCategories = categories.map(cat => escapeHtml(cat));
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Confirmação de Inscrição - ${registrationNumber}</title>
            <style>
              @page { size: A4; margin: 0.5in; }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px;
                background: white;
                height: auto;
                min-height: auto;
              }
              .card { 
                background: white; 
                border-radius: 20px; 
                padding: 30px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 100%;
              }
              .header { 
                text-align: center; 
                border-bottom: 3px solid #667eea; 
                padding-bottom: 20px; 
                margin-bottom: 20px; 
              }
              .reg-number { 
                font-size: 36px; 
                font-weight: bold; 
                color: #667eea; 
                margin: 10px 0;
              }
              .athlete-info { 
                display: flex; 
                align-items: center; 
                gap: 20px; 
                margin: 20px 0; 
              }
              .avatar { 
                width: 80px; 
                height: 80px; 
                border-radius: 50%; 
                background: #667eea; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                color: white; 
                font-size: 24px; 
                font-weight: bold;
              }
              .details { 
                font-size: 16px; 
                line-height: 1.6; 
              }
              .categories { 
                margin: 15px 0; 
              }
              .category-badge { 
                background: #667eea; 
                color: white; 
                padding: 5px 10px; 
                border-radius: 10px; 
                margin-right: 10px; 
                font-size: 12px;
              }
              .footer { 
                text-align: center; 
                margin-top: 30px; 
                color: #666; 
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1 style="color: #667eea; margin: 0;">🏆 CONFIRMAÇÃO DE INSCRIÇÃO</h1>
                <div class="reg-number">#${safeRegistrationNumber}</div>
                <h2 style="margin: 10px 0; color: #333;">${safeTournamentName}</h2>
              </div>
              
              <div class="athlete-info">
                <div class="avatar">
                  ${safeAthletePhoto ? `<img src="${safeAthletePhoto}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;" />` : getInitials(athleteName)}
                </div>
                <div class="details">
                  <h3 style="margin: 0; color: #333;">${safeAthleteName}</h3>
                  <p style="margin: 5px 0; color: #666;">📅 ${athleteAge} anos</p>
                  ${safeClub ? `<p style="margin: 5px 0; color: #666;">🏢 ${safeClub}</p>` : ''}
                  ${safeCity ? `<p style="margin: 5px 0; color: #666;">📍 ${safeCity}</p>` : ''}
                </div>
              </div>
              
              <div class="categories">
                <h4 style="margin: 10px 0; color: #333;">Categorias Inscritas:</h4>
                ${safeCategories.map(cat => `<span class="category-badge">${cat}</span>`).join('')}
              </div>
              
              <div class="footer">
                <p>Inscrição realizada em ${new Date(registrationDate).toLocaleDateString('pt-BR')}</p>
                <p><strong>Apresente este comprovante no dia do evento</strong></p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto" data-testid="registration-confirmation-overlay">
      <Card className="w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-gradient-to-br from-white via-purple-50 to-pink-50 border-0 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 my-2 sm:my-8 overflow-hidden">
        <CardContent className="p-0 max-h-full overflow-y-auto">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 p-4 sm:p-6 lg:p-8 text-white text-center rounded-t-lg">
            <div className="flex items-center justify-center mb-2 sm:mb-3">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-green-400 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 px-2">🎉 INSCRIÇÃO CONFIRMADA!</h2>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 lg:p-4 border border-white/30 mx-2 sm:mx-0">
              <div className="text-xs sm:text-sm lg:text-base opacity-90 mb-1">Número de Inscrição</div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wider" data-testid="registration-number">
                #{registrationNumber}
              </div>
            </div>
          </div>

          {/* Dados do atleta */}
          <div className="p-4 sm:p-6 lg:p-8 xl:p-10 space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 lg:space-x-6">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 border-4 border-purple-200 flex-shrink-0">
                <AvatarImage src={athletePhoto} alt={athleteName} />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-lg sm:text-xl lg:text-2xl font-bold">
                  {getInitials(athleteName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 break-words" data-testid="athlete-name">{athleteName}</h3>
                <div className="flex items-center text-gray-600 mb-1 text-xs sm:text-sm lg:text-base">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                  <span data-testid="athlete-age">{athleteAge} anos</span>
                </div>
                {club && (
                  <div className="flex items-center text-gray-600 mb-1 text-xs sm:text-sm lg:text-base">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate" data-testid="athlete-club" title={club}>{club}</span>
                  </div>
                )}
                {city && (
                  <div className="flex items-center text-gray-600 text-xs sm:text-sm lg:text-base">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                    <span data-testid="athlete-city">{city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Categorias */}
            <div className="space-y-2">
              <div className="flex items-center text-gray-700 font-semibold">
                <Trophy className="w-4 h-4 mr-2" />
                Categorias Inscritas:
              </div>
              <div className="flex flex-wrap gap-2" data-testid="athlete-categories">
                {categories.map((category, index) => (
                  <Badge key={index} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-3 py-1">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Informações do torneio */}
            <div className="bg-gray-50 rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="text-sm lg:text-base text-gray-600 mb-1">Torneio</div>
              <div className="font-semibold text-gray-900 text-base lg:text-lg break-words" data-testid="tournament-name">{tournamentName}</div>
              <div className="text-xs lg:text-sm text-gray-500 mt-2">
                Inscrição realizada em {new Date(registrationDate).toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>

            {/* Botões de ação */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-4">
              <Button 
                onClick={() => {
                  console.log('🔗 Navegando para:', publicShareUrl);
                  window.location.href = publicShareUrl;
                }}
                className="lg:col-span-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 lg:py-3 lg:text-lg"
                data-testid="button-access-tournament"
              >
                <Trophy className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Acessar Torneio
              </Button>
              <div className="grid grid-cols-2 lg:grid-cols-2 lg:col-span-3 gap-3">
                <Button 
                  onClick={downloadCard}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 lg:py-3"
                  data-testid="button-download-card"
                >
                  <Download className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                  Baixar Card
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline" 
                  className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 lg:py-3"
                  data-testid="button-close"
                >
                  Fechar
                </Button>
              </div>
            </div>

            {/* Aviso importante */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <div className="text-amber-800 text-sm font-medium">
                ⚠️ Importante: Apresente este comprovante no dia do evento
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
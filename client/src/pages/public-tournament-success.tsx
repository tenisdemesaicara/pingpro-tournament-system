import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, MapPin, Users } from "lucide-react";

interface PublicTournamentSuccessProps {
  tournamentId: string;
}

export default function PublicTournamentSuccess({ tournamentId }: PublicTournamentSuccessProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-700 dark:text-green-300">
              Inscrição Realizada com Sucesso! 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h3 className="font-medium text-green-800 dark:text-green-200 mb-4">
                O que acontece agora?
              </h3>
              <div className="space-y-3 text-sm text-green-700 dark:text-green-300">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <span>Sua inscrição foi enviada para análise da organização</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <span>Você receberá um email de confirmação em até 24 horas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <span>Informações sobre pagamento e chaveamento serão enviadas por email</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="font-medium">Cronograma</span>
                <span className="text-muted-foreground text-center">
                  Será enviado por email
                </span>
              </div>
              <div className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="font-medium">Local</span>
                <span className="text-muted-foreground text-center">
                  Detalhes no email
                </span>
              </div>
              <div className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Users className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
                <span className="font-medium">Chaveamento</span>
                <span className="text-muted-foreground text-center">
                  Disponível próximo ao evento
                </span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">💡 Dicas Importantes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Verifique sua caixa de spam para emails da organização</li>
                <li>• Mantenha seus dados de contato atualizados</li>
                <li>• Chegue com antecedência no dia do torneio</li>
                <li>• Traga documento de identidade com foto</li>
              </ul>
            </div>

            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => window.location.href = `/tournament/${tournamentId}`}
                variant="default"
                className="flex-1"
                data-testid="button-view-tournament"
              >
                Acessar Torneio
              </Button>
              <Button 
                onClick={() => window.close()}
                variant="outline"
                className="flex-1"
              >
                Fechar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Em caso de dúvidas, entre em contato com a organização do torneio
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
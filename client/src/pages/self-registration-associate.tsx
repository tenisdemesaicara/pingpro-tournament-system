import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SelfRegistrationAssociate() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Inscrição de Associado</CardTitle>
            <p className="text-muted-foreground text-center">
              Funcionalidade em desenvolvimento
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button>Em breve</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { Link } from "wouter";
import HeroSection from "@/components/hero-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Users, Trophy, BarChart3 } from "lucide-react";

export default function Home() {
  const resources = [
    {
      icon: CreditCard,
      title: "Gestão financeira",
      description: "Controle contas a pagar e receber.",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      icon: Users,
      title: "Atletas e associados",
      description: "Cadastro organizado e atualizado.",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      icon: Trophy,
      title: "Torneios e ranking",
      description: "Acompanhe resultados e desempenho em tempo real.",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      icon: BarChart3,
      title: "Relatórios práticos",
      description: "Informações claras para apoiar decisões.",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Seção de Recursos */}
      <section id="recursos" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tudo o que você precisa em um só lugar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {resources.map((resource, index) => {
              const IconComponent = resource.icon;
              return (
                <Card 
                  key={index} 
                  className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  data-testid={`resource-card-${index}`}
                >
                  <CardContent className="pt-6">
                    <div className={`w-16 h-16 ${resource.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <IconComponent className={`h-8 w-8 ${resource.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" data-testid={`resource-title-${index}`}>
                      {resource.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm" data-testid={`resource-description-${index}`}>
                      {resource.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Seção Sobre */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Sobre o Sistema
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            A Associação Mesatenista de Içara agora conta com um sistema digital que une gestão administrativa, 
            financeira e esportiva em um só ambiente. Simples, ágil e confiável.
          </p>
        </div>
      </section>

      {/* Chamada Final (Call to Action) */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Mais tempo para o esporte, menos preocupação com a gestão.
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Simplifique a administração da sua associação e foque no que realmente importa.
          </p>
          <Link href="/login">
            <Button 
              size="lg" 
              className="text-lg font-medium px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid="button-cta-access"
            >
              Acessar Agora
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

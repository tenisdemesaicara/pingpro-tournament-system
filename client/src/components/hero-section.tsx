import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function HeroSection() {
  const scrollToResources = () => {
    const resourcesSection = document.getElementById('recursos');
    resourcesSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-blue-950 dark:via-gray-950 dark:to-gray-900">
      <div className="absolute inset-0 z-0 opacity-5 bg-gradient-to-br from-blue-100 to-transparent dark:from-blue-900"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Gestão da Associação<br/>
            <span className="text-blue-600 dark:text-blue-400">Mesatenista de Içara</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-4xl mx-auto leading-relaxed">
            Controle financeiro, mensalidades, atletas, associados, torneios e ranking em uma única plataforma fácil de usar.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/login">
              <Button 
                size="lg" 
                className="text-lg font-medium px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-login"
              >
                Entrar no Sistema
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg font-medium px-8 py-4 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-300"
              onClick={scrollToResources}
              data-testid="button-know-resources"
            >
              Conhecer Recursos
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

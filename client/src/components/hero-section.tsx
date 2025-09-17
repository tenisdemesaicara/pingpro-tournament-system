import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center animate-fade-in">
          <h2 className="text-4xl sm:text-6xl font-bold text-foreground mb-6">
            TODOS OS JOGOS.<br/>
            <span className="text-primary">TÊNIS DE MESA.</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Gerencie seus torneios de tênis de mesa de forma simples e profissional. 
            Milhares de jogadores confiam na nossa plataforma para organizar competições, 
            acompanhar rankings e manter suas comunidades conectadas.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/create-tournament">
              <Button 
                size="lg" 
                className="text-lg font-medium material-elevation-2"
                data-testid="button-create-tournament"
              >
                Criar Torneio Gratuito
              </Button>
            </Link>
            
            <Link href="/tournaments">
              <Button 
                variant="outline" 
                size="lg" 
                className="flex items-center space-x-2"
                data-testid="button-explore-tournaments"
              >
                <span className="material-icons">sports</span>
                <span>Explorar Chaveamentos</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

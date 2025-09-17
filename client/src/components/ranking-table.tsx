import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type AthleteWithStats } from "@shared/schema";
import PositionIndicator from "@/components/position-indicator";

interface RankingTableProps {
  athletes: AthleteWithStats[];
  title?: string;
  showHeader?: boolean;
}

export default function RankingTable({ athletes, title = "Ranking Nacional", showHeader = true }: RankingTableProps) {
  const getRankColor = (index: number) => {
    if (index === 0) return "bg-primary";
    if (index === 1) return "bg-secondary";
    return "bg-muted";
  };

  const getRankTextColor = (index: number) => {
    if (index === 0) return "text-primary-foreground";
    if (index === 1) return "text-secondary-foreground";
    return "text-muted-foreground";
  };

  return (
    <Card className="material-elevation-2 overflow-hidden" data-testid="ranking-table">
      {showHeader && (
        <CardHeader className="gradient-orange-primary text-white">
          <CardTitle className="text-lg sm:text-xl font-semibold" data-testid="ranking-title">{title}</CardTitle>
          <p className="text-xs sm:text-sm opacity-90">Atualizado em tempo real</p>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {athletes.map((athlete, index) => (
            <div 
              key={athlete.id} 
              className="p-3 sm:p-4 hover:bg-accent transition-colors"
              data-testid={`ranking-row-${athlete.id}`}
            >
              {/* Mobile Layout */}
              <div className="sm:hidden">
                <div className="flex items-start space-x-3">
                  {/* POSIÇÃO NA PRIMEIRA COLUNA MOBILE */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className={`w-10 h-10 ${getRankColor(index)} rounded-full flex items-center justify-center`}>
                      <span className={`${getRankTextColor(index)} font-bold text-sm`} data-testid={`rank-position-${athlete.id}`}>
                        {index + 1}
                      </span>
                    </div>
                  </div>

                  {/* FOTO DO ATLETA MOBILE */}
                  <div className="flex-shrink-0">
                    {athlete.photoUrl ? (
                      <img 
                        src={athlete.photoUrl} 
                        alt={athlete.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                        data-testid={`athlete-photo-${athlete.id}`}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border-2 border-white shadow-md">
                        <span className="text-lg">🏓</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="text-base font-medium text-foreground" data-testid={`athlete-name-${athlete.id}`}>
                          {athlete.name}
                        </h5>
                        <PositionIndicator 
                          currentPosition={index + 1}
                          previousPosition={athlete.previousPosition || undefined}
                          isNew={!athlete.previousPosition}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`athlete-club-${athlete.id}`}>
                        {athlete.club} - {athlete.city}, {athlete.state}
                      </p>
                    </div>
                    
                    {/* Mobile Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="bg-accent p-2 rounded">
                        <div className="font-semibold text-foreground" data-testid={`athlete-points-${athlete.id}`}>
                          {(athlete.points || 0).toLocaleString()}
                        </div>
                        <div className="text-muted-foreground">Pontos</div>
                      </div>
                      <div className="bg-accent p-2 rounded">
                        <div className="font-semibold text-secondary" data-testid={`athlete-winrate-${athlete.id}`}>
                          {athlete.winRate ? athlete.winRate.toFixed(1) : '0.0'}%
                        </div>
                        <div className="text-muted-foreground">Taxa</div>
                      </div>
                      <div className="bg-accent p-2 rounded">
                        <div className="font-semibold text-primary" data-testid={`athlete-wins-${athlete.id}`}>
                          {athlete.wins || 0}
                        </div>
                        <div className="text-muted-foreground">Vitórias</div>
                      </div>
                      <div className="bg-accent p-2 rounded">
                        <div className="font-semibold text-destructive" data-testid={`athlete-losses-${athlete.id}`}>
                          {athlete.losses || 0}
                        </div>
                        <div className="text-muted-foreground">Derrotas</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center space-x-4">
                {/* POSIÇÃO NA PRIMEIRA COLUNA */}
                <div className="flex-shrink-0 w-16 text-center">
                  <div className={`w-12 h-12 ${getRankColor(index)} rounded-full flex items-center justify-center mx-auto`}>
                    <span className={`${getRankTextColor(index)} font-bold text-lg`} data-testid={`rank-position-${athlete.id}`}>
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* FOTO DO ATLETA */}
                <div className="flex-shrink-0">
                  {athlete.photoUrl ? (
                    <img 
                      src={athlete.photoUrl} 
                      alt={athlete.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                      data-testid={`athlete-photo-${athlete.id}`}
                    />
                  ) : (
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center border-2 border-white shadow-md">
                      <span className="text-xl">🏓</span>
                    </div>
                  )}
                </div>
                
                {/* NOME E CLUBE */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h5 className="text-lg font-medium text-foreground truncate" data-testid={`athlete-name-${athlete.id}`}>
                      {athlete.name}
                    </h5>
                    <PositionIndicator 
                      currentPosition={index + 1}
                      previousPosition={athlete.previousPosition || undefined}
                      isNew={!athlete.previousPosition}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid={`athlete-club-${athlete.id}`}>
                    {athlete.club} - {athlete.city}, {athlete.state}
                  </p>
                </div>
                
                {/* ESTATÍSTICAS */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-foreground" data-testid={`athlete-points-${athlete.id}`}>
                      {(athlete.points || 0).toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">Pontos</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-primary" data-testid={`athlete-wins-${athlete.id}`}>
                      {athlete.wins || 0}
                    </div>
                    <div className="text-muted-foreground">Vitórias</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-destructive" data-testid={`athlete-losses-${athlete.id}`}>
                      {athlete.losses || 0}
                    </div>
                    <div className="text-muted-foreground">Derrotas</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-secondary" data-testid={`athlete-winrate-${athlete.id}`}>
                      {athlete.winRate ? athlete.winRate.toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-muted-foreground">Taxa</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

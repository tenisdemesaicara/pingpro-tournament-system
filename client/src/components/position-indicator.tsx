import { TrendingUp, TrendingDown, Minus, Dot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PositionIndicatorProps {
  currentPosition: number;
  previousPosition?: number;
  isNew?: boolean;
  className?: string;
}

export default function PositionIndicator({ 
  currentPosition, 
  previousPosition, 
  isNew = false,
  className 
}: PositionIndicatorProps) {
  // Se é novo atleta no ranking
  if (isNew) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5">
          <Dot className="h-3 w-3 mr-0.5" />
          NOVO
        </Badge>
      </div>
    );
  }

  // Se não há posição anterior, não mostrar indicador
  if (!previousPosition) {
    return null;
  }

  const positionChange = previousPosition - currentPosition; // Positivo = subiu, Negativo = desceu

  // Sem mudança de posição
  if (positionChange === 0) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="flex items-center text-gray-500">
          <Minus className="h-3 w-3" />
        </div>
      </div>
    );
  }

  // Subiu posições (positionChange positivo)
  if (positionChange > 0) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0.5">
          <TrendingUp className="h-3 w-3 mr-0.5" />
          +{positionChange}
        </Badge>
      </div>
    );
  }

  // Desceu posições (positionChange negativo)
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1.5 py-0.5">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {Math.abs(positionChange)}
      </Badge>
    </div>
  );
}
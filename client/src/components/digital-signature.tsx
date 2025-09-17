import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pen, RotateCcw, Check } from 'lucide-react';

interface DigitalSignatureProps {
  onSignatureChange: (signature: string) => void;
  title?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function DigitalSignature({ 
  onSignatureChange, 
  title = "Assinatura Eletrônica", 
  placeholder = "Desenhe sua assinatura acima",
  required = false,
  className = ""
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Configurar canvas quando componente monta
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurações do canvas
    ctx.strokeStyle = '#1e40af'; // Azul
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Limpar canvas inicial
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Obter posição do mouse/touch relativa ao canvas
  const getCanvasPosition = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  // Iniciar desenho
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  // Desenhar
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    setHasSignature(true);
  };

  // Finalizar desenho
  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    // Gerar dados da assinatura e notificar parent component
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      onSignatureChange(dataURL);
    }
  };

  // Limpar assinatura
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
    onSignatureChange('');
  };

  // Eventos de mouse para desktop
  const handleMouseEvents = {
    onMouseDown: startDrawing,
    onMouseMove: draw,
    onMouseUp: stopDrawing,
    onMouseLeave: stopDrawing
  };

  // Eventos de touch para mobile
  const handleTouchEvents = {
    onTouchStart: startDrawing,
    onTouchMove: draw,
    onTouchEnd: stopDrawing
  };

  return (
    <Card className={`border-indigo-200 dark:border-indigo-800 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg text-indigo-700 dark:text-indigo-300 flex items-center">
          <Pen className="w-5 h-5 mr-2" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {placeholder}. Use o mouse (desktop) ou dedo (mobile) para desenhar.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Canvas para assinatura */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white max-w-full">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full h-auto max-w-full cursor-crosshair touch-none"
              style={{ touchAction: 'none', maxWidth: '100%', height: 'auto' }}
              {...handleMouseEvents}
              {...handleTouchEvents}
            />
          </div>

          {/* Indicador visual do status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasSignature ? (
                <div className="flex items-center text-green-600 text-sm">
                  <Check className="w-4 h-4 mr-1" />
                  Assinatura capturada
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  {required ? "Assinatura obrigatória" : "Aguardando assinatura"}
                </div>
              )}
            </div>

            {/* Botão para limpar */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              disabled={!hasSignature}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          </div>

          {/* Instrução para mobile */}
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
            <strong>💡 Dica:</strong> Em dispositivos móveis, use o dedo para desenhar. 
            Em computadores, use o mouse. A assinatura deve ser legível e representar seu nome.
          </div>

          {/* Declaração legal */}
          {hasSignature && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <p>
                <strong>Declaração:</strong> Esta assinatura eletrônica tem validade legal 
                e confirma minha concordância com todos os termos apresentados.
              </p>
              <p className="mt-1">
                <strong>Data e hora:</strong> {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type Athlete } from "@shared/schema";

interface AthleteDetailModalProps {
  athlete: Athlete | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (athlete: Athlete) => void;
  onDelete?: (athlete: Athlete) => void;
}

export default function AthleteDetailModal({ 
  athlete, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}: AthleteDetailModalProps) {
  if (!athlete) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "Não informado";
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <span className="material-icons">person</span>
            <span>Dados Completos do Atleta</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com foto e dados básicos */}
          <div className="flex items-start space-x-6 p-6 bg-accent rounded-lg">
            <div className="flex-shrink-0">
              {athlete.photoUrl ? (
                <img
                  src={athlete.photoUrl}
                  alt={athlete.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-border"
                  data-testid="athlete-detail-photo"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-background border-4 border-border flex items-center justify-center">
                  <span className="material-icons text-3xl text-muted-foreground">person</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{athlete.name}</h2>
              <div className="flex items-center space-x-3">
                <span className="text-muted-foreground">
                  {athlete.ranking || 1000} pontos
                </span>
                <span className="text-muted-foreground">
                  {athlete.wins || 0}V - {athlete.losses || 0}D
                </span>
              </div>
              {athlete.club && (
                <div className="flex items-center space-x-2">
                  <span className="material-icons text-sm text-muted-foreground">sports_tennis</span>
                  <span className="text-sm text-muted-foreground">{athlete.club}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="material-icons mr-2">badge</span>
                Documentos
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF</label>
                  <p className="font-mono">{athlete.cpf || "Não informado"}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">RG</label>
                  <p className="font-mono">{athlete.rg || "Não informado"}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                  <p>{formatDate(athlete.birthDate)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="material-icons mr-2">contact_mail</span>
                Contato
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                  <p className="text-primary">{athlete.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p>{athlete.phone || "Não informado"}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <span className="material-icons mr-2">home</span>
              Endereço Completo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">CEP</label>
                <p className="font-mono">{athlete.zipCode || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                <p>{athlete.city || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <p>{athlete.state || "Não informado"}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rua/Logradouro</label>
                <p>{athlete.street || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                <p>{athlete.neighborhood || "Não informado"}</p>
              </div>
            </div>
            
            {athlete.complement && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Complemento</label>
                <p>{athlete.complement}</p>
              </div>
            )}
          </div>

          {athlete.observations && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <span className="material-icons mr-2">note</span>
                  Observações
                </h3>
                <p className="text-muted-foreground bg-accent p-4 rounded-lg">
                  {athlete.observations}
                </p>
              </div>
            </>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={() => onEdit(athlete)}
                data-testid="button-edit-athlete"
              >
                <span className="material-icons mr-2">edit</span>
                Editar
              </Button>
            )}
            
            {onDelete && (
              <Button 
                variant="destructive" 
                onClick={() => onDelete(athlete)}
                data-testid="button-delete-athlete"
              >
                <span className="material-icons mr-2">delete</span>
                Excluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
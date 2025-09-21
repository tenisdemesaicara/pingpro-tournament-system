import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Upload, Download, Trash2, Globe, Image } from "lucide-react";
import { SystemSetting } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SystemSettingWithFile extends SystemSetting {
  hasFile?: boolean;
}

export default function AdminSystem() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  // Query para buscar configurações do sistema
  const { data: settings = [], isLoading } = useQuery<SystemSettingWithFile[]>({
    queryKey: ['/api/system/settings'],
  });

  // Encontrar configurações específicas
  const faviconSetting = settings.find(s => s.key === 'favicon');
  const siteTitleSetting = settings.find(s => s.key === 'site_title');

  // Mutação para salvar configuração
  const saveSettingMutation = useMutation({
    mutationFn: async (data: { key: string; value?: string; file?: File }) => {
      const formData = new FormData();
      formData.append('key', data.key);
      if (data.value !== undefined) {
        formData.append('value', data.value);
      }
      if (data.file) {
        formData.append('file', data.file);
      }

      const response = await fetch('/api/system/settings', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Erro ao salvar configuração');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/settings'] });
      toast({
        title: "Sucesso",
        description: "Configuração salva com sucesso!",
        variant: "default",
      });
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  // Mutação para remover arquivo
  const removeFileMutation = useMutation({
    mutationFn: async (key: string) => {
      return await apiRequest('DELETE', `/api/system/settings/${key}/file`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/settings'] });
      toast({
        title: "Sucesso",
        description: "Arquivo removido com sucesso!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover arquivo",
        variant: "destructive",
      });
    },
  });

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/ico'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo ICO ou PNG válido",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo 2MB permitido.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    saveSettingMutation.mutate({
      key: 'favicon',
      file: file
    });

    // Limpar input
    if (faviconFileRef.current) {
      faviconFileRef.current.value = '';
    }
  };

  const handleSiteTitleSave = () => {
    const input = document.getElementById('site-title-input') as HTMLInputElement;
    if (input) {
      saveSettingMutation.mutate({
        key: 'site_title',
        value: input.value
      });
    }
  };

  const handleRemoveFavicon = () => {
    removeFileMutation.mutate('favicon');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 animate-pulse rounded"></div>
                Carregando...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full h-20 bg-gray-200 animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuração do Favicon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Favicon (Ícone do Site)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {faviconSetting?.description || "Ícone que aparece na aba do navegador"}
              </div>

              {faviconSetting?.fileUrl && (
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <img 
                    src={faviconSetting.fileUrl} 
                    alt="Favicon atual" 
                    className="w-6 h-6"
                    data-testid="img-current-favicon"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Favicon atual</div>
                    <div className="text-xs text-gray-500">Clique em "Remover" para alterar</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFavicon}
                    disabled={removeFileMutation.isPending}
                    data-testid="button-remove-favicon"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="favicon-upload">
                  {faviconSetting?.fileUrl ? "Alterar Favicon" : "Enviar Favicon"}
                </Label>
                <Input
                  id="favicon-upload"
                  type="file"
                  accept=".ico,.png"
                  onChange={handleFaviconUpload}
                  disabled={isUploading || saveSettingMutation.isPending}
                  ref={faviconFileRef}
                  data-testid="input-favicon-upload"
                />
                <div className="text-xs text-gray-500">
                  Formatos aceitos: ICO, PNG. Tamanho máximo: 2MB<br/>
                  Recomendado: 16x16, 32x32 ou 64x64 pixels
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => faviconFileRef.current?.click()}
                disabled={isUploading || saveSettingMutation.isPending}
                data-testid="button-select-favicon"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Enviando..." : "Selecionar Arquivo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuração do Título do Site */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Título do Site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {siteTitleSetting?.description || "Título que aparece na aba do navegador"}
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-title-input">Título</Label>
                <Input
                  id="site-title-input"
                  type="text"
                  defaultValue={siteTitleSetting?.value || ""}
                  placeholder="Ex: PingPong Pro - Gestão de Tênis de Mesa"
                  data-testid="input-site-title"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSiteTitleSave}
                disabled={saveSettingMutation.isPending}
                data-testid="button-save-site-title"
              >
                {saveSettingMutation.isPending ? "Salvando..." : "Salvar Título"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Sistema */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Total de Configurações</div>
              <div className="text-lg font-semibold" data-testid="text-total-settings">
                {settings.length}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Última Atualização</div>
              <div className="text-lg font-semibold" data-testid="text-last-update">
                {settings.length > 0 
                  ? new Date(Math.max(...settings.map(s => new Date(s.updatedAt!).getTime()))).toLocaleDateString('pt-BR')
                  : "Nunca"
                }
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-600 dark:text-gray-400">Status</div>
              <div className="text-lg font-semibold text-green-600" data-testid="text-system-status">
                Ativo
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
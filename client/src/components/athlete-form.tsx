import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AthleteFormProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
}

export default function AthleteForm({ onSubmit, onCancel }: AthleteFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    birthDate: "",
    gender: "male",
    city: "",
    state: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro de Atleta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit">Salvar</Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
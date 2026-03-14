import React, { useState } from 'react';
import { base44 } from '@/api/supabaseClient';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

const KPI_OPTIONS = [
  { id: 'producaoDia', label: 'Produção do Dia', default: true },
  { id: 'totalProduzido', label: 'Total Produzido', default: true },
  { id: 'emProducao', label: 'Em Produção', default: true },
  { id: 'alertasRecentes', label: 'Alertas (24h)', default: true },
  { id: 'lotesNaoFinalizados', label: 'Lotes Não Finalizados', default: true },
  { id: 'gargalos', label: 'Gargalos', default: true },
  { id: 'topClientes', label: 'Top Clientes', default: true },
  { id: 'sequencias', label: 'Sequências', default: true },
];

export default function UserKPIPreferences() {
  const [open, setOpen] = useState(false);
  const [kpisVisiveis, setKpisVisiveis] = useState(() => {
    const saved = localStorage.getItem('userKPIPreferences');
    if (saved) {
      return JSON.parse(saved);
    }
    return KPI_OPTIONS.reduce((acc, kpi) => {
      acc[kpi.id] = kpi.default;
      return acc;
    }, {});
  });

  const handleToggle = (kpiId) => {
    setKpisVisiveis(prev => ({
      ...prev,
      [kpiId]: !prev[kpiId]
    }));
  };

  const handleSave = async () => {
    localStorage.setItem('userKPIPreferences', JSON.stringify(kpisVisiveis));
    
    // Salvar nas preferências do usuário no banco
    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.auth.updateMe({
          kpiPreferences: kpisVisiveis
        });
      }
    } catch (error) {
      console.log('Salvar no perfil (opcional):', error);
    }

    setOpen(false);
    toast.success('Preferências de KPIs salvas!');
  };

  const handleReset = () => {
    const defaults = KPI_OPTIONS.reduce((acc, kpi) => {
      acc[kpi.id] = kpi.default;
      return acc;
    }, {});
    setKpisVisiveis(defaults);
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-9 w-9"
        title="Customizar KPIs"
      >
        <Settings className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customizar KPIs do Dashboard</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto py-4">
            {KPI_OPTIONS.map(kpi => (
              <div key={kpi.id} className="flex items-center space-x-2">
                <Checkbox
                  id={kpi.id}
                  checked={kpisVisiveis[kpi.id] || false}
                  onCheckedChange={() => handleToggle(kpi.id)}
                />
                <Label htmlFor={kpi.id} className="font-normal cursor-pointer flex-1">
                  {kpi.label}
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
            >
              Restaurar Padrão
            </Button>
            <Button
              onClick={handleSave}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
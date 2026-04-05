import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, BookmarkPlus, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportPresets({ currentFilters, onLoadPreset }) {
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('reportPresets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar presets:', e);
      }
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) {
      toast.error('Nome do preset é obrigatório');
      return;
    }

    const newPreset = {
      id: Date.now(),
      name: presetName,
      filters: { ...currentFilters },
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('reportPresets', JSON.stringify(updated));
    setPresetName('');
    setOpenDialog(false);
    toast.success('Preset salvo com sucesso!');
  };

  const deletePreset = (id) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('reportPresets', JSON.stringify(updated));
    toast.success('Preset removido');
  };

  const loadPreset = (preset) => {
    onLoadPreset(preset.filters);
    toast.success(`Preset "${preset.name}" carregado`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Salvar Preset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar Configuração de Relatório</DialogTitle>
              <DialogDescription>
                Nomeie este preset para reutilizá-lo later
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Ex: Relatório Mensal - Célula A"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && savePreset()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={savePreset} className="bg-blue-600 hover:bg-blue-700">
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {presets.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Presets Salvos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {presets.map(preset => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{preset.name}</p>
                    <p className="text-xs text-slate-500">{preset.createdAt}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadPreset(preset)}
                      className="px-2"
                    >
                      Carregar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePreset(preset.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
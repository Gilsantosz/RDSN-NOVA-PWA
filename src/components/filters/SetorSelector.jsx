import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Factory, Lock } from 'lucide-react';
import { useSetor } from '@/components/context/SetorContext';
import { toast } from 'sonner';

export default function SetorSelector() {
  const { setorAtivo, setSetorAtivo, setoresPermitidos, isAdmin } = useSetor();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [setorPendente, setSetorPendente] = useState(null);

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => rdsn.entities.Setor.list()
  });

  // Admin vê todos os setores, outros usuários apenas seus setores permitidos
  const setoresDisponiveis = isAdmin
    ? (setores || []).filter(s => s.ativo)
    : (setores || []).filter(s => s.ativo && (setoresPermitidos || []).includes(s.id));

  // Não esconde o componente se for Admin, mesmo que a lista de setores ainda não tenha carregado
  if (!isAdmin && setoresDisponiveis.length === 0) {
    return null;
  }

  const handleSetorChange = (novoSetorId) => {
    // "Todos os Setores" não exige senha — apenas visualização
    if (novoSetorId === 'ALL') {
      setSetorAtivo('ALL');
      return;
    }
    // Trocar para um setor específico exige senha
    if (setorAtivo !== novoSetorId) {
      setSetorPendente(novoSetorId);
      setShowPasswordDialog(true);
    }
  };

  const handleConfirmarSenha = () => {
    // Verificar senha do setor específico ou senha padrão
    const setorDestino = setores.find(s => s.id === setorPendente);
    const senhaEsperada = setorDestino?.senha_troca || 'consultaporsetor';

    if (senhaDigitada === senhaEsperada) {
      setSetorAtivo(setorPendente);
      setShowPasswordDialog(false);
      setSenhaDigitada('');
      setSetorPendente(null);
      toast.success('Setor alterado com sucesso!');
    } else {
      toast.error('Senha incorreta!');
      setSenhaDigitada('');
    }
  };

  const handleCancelar = () => {
    setShowPasswordDialog(false);
    setSenhaDigitada('');
    setSetorPendente(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
        <Factory className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        <Select value={setorAtivo || ''} onValueChange={handleSetorChange}>
          <SelectTrigger className="w-[200px] border-0 focus:ring-0 dark:bg-transparent dark:text-slate-100">
            <SelectValue placeholder="Selecione o setor" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
            {isAdmin && (
              <SelectItem value="ALL">
                <span className="font-semibold">Todos os Setores</span>
              </SelectItem>
            )}
            {setoresDisponiveis.map(setor => (
              <SelectItem key={setor.id} value={setor.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: setor.cor || '#3b82f6' }}
                  />
                  {setor.nome} ({setor.codigo})
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="dark:bg-slate-950 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
                <Lock className="w-5 h-5 text-amber-600" />
                Senha de Administração
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Digite a senha de administração para trocar de setor produtivo:
              </p>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Senha</Label>
                <Input
                  type="password"
                  value={senhaDigitada}
                  onChange={(e) => setSenhaDigitada(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmarSenha();
                    }
                  }}
                  placeholder="Digite a senha"
                  autoFocus
                  className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelar}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarSenha}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
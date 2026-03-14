import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rdsn } from '@/api/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Trash2, Share2, Lock, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TemplatesPDFManager({ onSelecionarTemplate }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-pdf'],
    queryFn: () => rdsn.entities.TemplatePDF.list('-created_at')
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => rdsn.entities.TemplatePDF.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-pdf'] });
      toast.success('Template excluído!');
    }
  });

  const compartilharMutation = useMutation({
    mutationFn: ({ id, compartilhado }) => 
      rdsn.entities.TemplatePDF.update(id, { compartilhado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-pdf'] });
      toast.success('Template atualizado!');
    }
  });

  const handleSelecionar = (template) => {
    onSelecionarTemplate(template);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Templates ({templates.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Templates de PDF Salvos</DialogTitle>
        </DialogHeader>

        {templates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600">Nenhum template salvo</p>
            <p className="text-sm text-slate-500 mt-1">
              Configure um PDF e salve como template para reutilização
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {template.nome}
                        {template.compartilhado ? (
                          <Badge variant="outline" className="text-xs">
                            <Share2 className="w-3 h-3 mr-1" />
                            Compartilhado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Privado
                          </Badge>
                        )}
                      </CardTitle>
                      {template.descricao && (
                        <p className="text-sm text-slate-600 mt-1">{template.descricao}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => compartilharMutation.mutate({ 
                            id: template.id, 
                            compartilhado: !template.compartilhado 
                          })}
                        >
                          {template.compartilhado ? (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Tornar Privado
                            </>
                          ) : (
                            <>
                              <Share2 className="w-4 h-4 mr-2" />
                              Compartilhar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deletarMutation.mutate(template.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge>{template.tipo_relatorio}</Badge>
                    <Badge variant="outline">{template.orientacao === 'portrait' ? 'Retrato' : 'Paisagem'}</Badge>
                    <Badge variant="outline">{template.colunas_selecionadas?.length || 0} colunas</Badge>
                    {template.incluir_resumo && <Badge variant="outline">Com resumo</Badge>}
                  </div>
                  <Button 
                    onClick={() => handleSelecionar(template)}
                    size="sm"
                    className="w-full bg-slate-900 hover:bg-slate-800"
                  >
                    Usar este Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
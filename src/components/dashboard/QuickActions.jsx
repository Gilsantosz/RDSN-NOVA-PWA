import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Factory, Package, FileText, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: 'Nova Reserva',
      description: 'Criar reserva de lote',
      color: 'from-blue-500 to-blue-600',
      page: 'Reservas',
      onClick: () => navigate(createPageUrl('Reservas'))
    },
    {
      icon: Factory,
      label: 'Registrar Produção',
      description: 'Baixar produção',
      color: 'from-green-500 to-green-600',
      page: 'Producao',
      onClick: () => navigate(createPageUrl('Producao'))
    },
    {
      icon: Package,
      label: 'Estoque',
      description: 'Ver movimentações',
      color: 'from-purple-500 to-purple-600',
      page: 'Estoque',
      onClick: () => navigate(createPageUrl('Estoque'))
    },
    {
      icon: FileText,
      label: 'Relatórios',
      description: 'Gerar relatórios',
      color: 'from-orange-500 to-orange-600',
      page: 'Relatorios',
      onClick: () => navigate(createPageUrl('Relatorios'))
    }
  ];

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                className="w-full h-auto p-4 flex flex-col items-center gap-3 hover:shadow-lg transition-all border-2 hover:border-slate-300"
                onClick={action.onClick}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{action.description}</p>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
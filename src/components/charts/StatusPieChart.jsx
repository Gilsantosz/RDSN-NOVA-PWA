import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  RESERVADO: '#3b82f6',
  EM_PRODUCAO: '#f59e0b',
  BAIXADO: '#8b5cf6',
  PRODUZIDO: '#10b981',
  CANCELADO: '#ef4444',
  LIBERADO: '#64748b'
};

const LABELS = {
  RESERVADO: 'Reservado',
  EM_PRODUCAO: 'Em Produção',
  BAIXADO: 'Baixado',
  PRODUZIDO: 'Produzido',
  CANCELADO: 'Cancelado',
  LIBERADO: 'Liberado'
};

export default function StatusPieChart({ data, title = "Status dos Lotes" }) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: LABELS[key] || key,
    value: value,
    color: COLORS[key] || '#64748b'
  })).filter(item => item.value > 0);

  return (
    <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 p-4 sm:p-6 duration-300">
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tw-slate-900, #0f172a)',
                  borderColor: 'var(--tw-slate-800, #1e293b)',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  borderWidth: '1px'
                }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(value) => [value.toLocaleString(), 'Quantidade']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProducaoChart({ data, title = "Produção vs Reservado" }) {
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
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-10" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#cbd5e1' }}
                className="dark:text-slate-500"
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => value.toLocaleString()}
                className="dark:text-slate-500"
              />
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
                formatter={(value) => [value.toLocaleString(), '']}
              />
              <Legend />
              <Bar dataKey="reservado" name="Reservado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="produzido" name="Produzido" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
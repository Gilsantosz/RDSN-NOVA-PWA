import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';

export default function ProducaoChart({ data, title = "Produção vs Reservado", icon = TrendingUp }) {
  return (
    <PremiumCard title={title} icon={icon}>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="opacity-10" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
              }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              formatter={(value) => [value?.toLocaleString() || '-', '']}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
            <Bar dataKey="reservado" name="Reservado" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
            <Bar dataKey="produzido" name="Produzido" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </PremiumCard>
  );
}
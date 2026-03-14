import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'];

export default function MonthlyProductionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity={1} />
            <stop offset="100%" stopColor="#334155" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="mes" 
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
        />
        <YAxis 
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#cbd5e1' }}
          label={{ value: 'Unidades', angle: -90, position: 'insideLeft', fill: '#64748b' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
          labelStyle={{ color: '#0f172a', fontWeight: 600 }}
          itemStyle={{ color: '#475569' }}
        />
        <Bar 
          dataKey="quantidade" 
          fill="url(#barGradient)" 
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
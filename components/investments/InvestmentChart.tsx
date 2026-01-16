
import React, { useMemo } from 'react';
import { Card } from '../ui';
import { BarChart3 } from 'lucide-react';
import { StockSnapshot } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InvestmentChartProps {
  snapshots: StockSnapshot[];
}

export const InvestmentChart: React.FC<InvestmentChartProps> = ({ snapshots }) => {
  const chartData = useMemo(() => {
      return snapshots.map(s => ({
          date: s.date.substring(5), // MM-DD
          fullDate: s.date,
          value: s.totalMarketValue,
          pl: s.totalUnrealizedPL
      })).slice(-30); // Last 30 points
  }, [snapshots]);

  return (
    <Card className="h-[350px] flex flex-col w-full">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400"/> 庫存市值歷史趨勢
        </h3>
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/10000}w`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#colorValue)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </Card>
  );
};

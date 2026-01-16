
import React from 'react';
import { Card } from '../ui';
import { DollarSign, Activity } from 'lucide-react';
import { StockSnapshot } from '../../types';

interface InvestmentStatsProps {
  currentSnapshot: StockSnapshot | null;
}

export const InvestmentStats: React.FC<InvestmentStatsProps> = ({ currentSnapshot }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-violet-500/10 to-slate-800 border-violet-500/20 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl"></div>
            <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1 relative z-10">
                <DollarSign size={14}/> 證券總市值 (Market Value)
            </div>
            <div className="text-4xl font-bold text-white font-mono tracking-tight relative z-10">
                ${currentSnapshot?.totalMarketValue.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-slate-500 mt-2 relative z-10 flex items-center gap-1">
                最後更新：<span className="text-slate-400">{currentSnapshot?.date || '尚無資料'}</span>
            </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
            <div className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1 relative z-10">
                <Activity size={14}/> 未實現損益 (Unrealized P/L)
            </div>
            <div className={`text-4xl font-bold font-mono tracking-tight relative z-10 ${(currentSnapshot?.totalUnrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(currentSnapshot?.totalUnrealizedPL || 0) > 0 ? '+' : ''}
                ${currentSnapshot?.totalUnrealizedPL.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-slate-500 mt-2 relative z-10">
                帳面預估獲利
            </div>
        </Card>
    </div>
  );
};

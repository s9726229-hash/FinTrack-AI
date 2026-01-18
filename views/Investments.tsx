
import React from 'react';
import { StockSnapshot } from '../types';
import { TrendingUp } from 'lucide-react';

// New Components
import { InvestmentStats } from '../components/investments/InvestmentStats';
import { InvestmentChart } from '../components/investments/InvestmentChart';
import { StockInventoryList } from '../components/investments/StockInventoryList';

interface InvestmentsProps {
  snapshots: StockSnapshot[];
}

export const Investments: React.FC<InvestmentsProps> = ({ 
  snapshots, 
}) => {
  const currentSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-violet-400"/> 股票投資概況
            </h2>
            <p className="text-xs text-slate-400 mt-1">追蹤庫存市值、未實現損益與股利政策</p>
         </div>
         <div className="flex gap-2">
             {/* 按鈕已移除 */}
         </div>
       </div>

       {/* Components */}
       <InvestmentStats currentSnapshot={currentSnapshot} />
       <InvestmentChart snapshots={snapshots} />
       <StockInventoryList currentSnapshot={currentSnapshot} />
    </div>
  );
};

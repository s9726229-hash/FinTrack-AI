import React, { useMemo } from 'react';
import { StockTransaction } from '../../types';
import { TransactionHistoryList } from './TransactionHistoryList';
import { Card } from '../ui';
import { BadgePercent, ArrowRightLeft, Repeat, Calculator } from 'lucide-react';

interface TransactionAnalysisViewProps {
    transactions: StockTransaction[];
    stockNameMap: Record<string, string>;
}

const StatCard = ({ title, value, icon: Icon, colorClass, isCurrency = true, unit = '' }: { title: string, value: number, icon: any, colorClass:string, isCurrency?: boolean, unit?: string }) => (
    <Card className={`p-4 bg-slate-800/50 border-slate-700`}>
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase">{title}</span>
            <Icon size={16} className={colorClass} />
        </div>
        <div className={`text-2xl font-bold font-mono ${!isCurrency || value >= 0 ? 'text-white' : 'text-red-400'}`}>
            {isCurrency ? (
                <>
                    {value > 0 ? '+' : value < 0 ? '-' : ''}
                    {`$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </>
            ) : (
                <>
                    {value.toLocaleString()}
                    {unit && <span className="text-sm ml-1">{unit}</span>}
                </>
            )}
        </div>
    </Card>
);

export const TransactionAnalysisView: React.FC<TransactionAnalysisViewProps> = ({
    transactions,
    stockNameMap,
}) => {
    
    const stats = useMemo(() => {
        const realizedProfit = transactions
            .filter(tx => tx.side === 'SELL' && tx.realizedProfit)
            .reduce((sum, tx) => sum + (tx.realizedProfit || 0), 0);

        const totalFees = transactions.reduce((sum, tx) => sum + tx.fees, 0);
        const netCashFlow = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const tradeCount = transactions.length;

        return {
            realizedProfit,
            netCashFlow,
            totalFees,
            tradeCount
        };
    }, [transactions]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="區間實現總盈虧" value={stats.realizedProfit} icon={BadgePercent} colorClass={stats.realizedProfit >= 0 ? 'text-rose-400' : 'text-emerald-400'} />
                <StatCard title="區間淨現金流" value={stats.netCashFlow} icon={ArrowRightLeft} colorClass={stats.netCashFlow >= 0 ? 'text-sky-400' : 'text-orange-400'} />
                <StatCard title="成本損耗 (費用+稅)" value={stats.totalFees * -1} icon={Calculator} colorClass="text-slate-500" />
                <StatCard title="總交易次數" value={stats.tradeCount} icon={Repeat} isCurrency={false} colorClass="text-slate-400" unit="筆"/>
            </div>

            <TransactionHistoryList transactions={transactions} stockNameMap={stockNameMap} />
        </div>
    );
};
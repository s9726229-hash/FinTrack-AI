import React from 'react';
import { StockTransaction } from '../../types';
import { ReceiptText } from 'lucide-react';

interface TransactionHistoryListProps {
    transactions: StockTransaction[];
    stockNameMap: Record<string, string>;
}

export const TransactionHistoryList: React.FC<TransactionHistoryListProps> = ({ transactions, stockNameMap }) => {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden h-full flex flex-col animate-fade-in">
            <h3 className="text-sm font-bold text-slate-300 p-4 border-b border-slate-700 flex items-center gap-2">
                <ReceiptText size={16} className="text-amber-400" />
                歷史交易明細 (由新到舊)
            </h3>
            <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="p-3 font-medium">成交日期</th>
                            <th className="p-3 font-medium">代號/名稱</th>
                            <th className="p-3 font-medium text-center">買賣</th>
                            <th className="p-3 font-medium text-right">成交價</th>
                            <th className="p-3 font-medium text-right">股數</th>
                            <th className="p-3 font-medium text-right">應收付金額</th>
                            <th className="p-3 font-medium text-right">已實現損益</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-sm">
                        {transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors group">
                                <td className="p-3 font-mono text-slate-300">{tx.date}</td>
                                <td className="p-3">
                                    <div className="font-bold text-white">{stockNameMap[tx.symbol] || tx.symbol}</div>
                                    <div className="text-xs text-slate-500 font-mono">{tx.symbol}</div>
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                        tx.side === 'BUY' 
                                        ? 'bg-red-500/10 text-rose-400 border-red-500/20' 
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                        {tx.side === 'BUY' ? '買入' : '賣出'}
                                    </span>
                                </td>
                                <td className="p-3 text-right font-mono text-slate-200">{tx.price.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-slate-200">{tx.shares.toLocaleString()}</td>
                                <td className="p-3 text-right font-mono text-slate-300">
                                    {tx.amount.toLocaleString(undefined, { signDisplay: 'always' })}
                                </td>
                                <td className="p-3 text-right font-mono">
                                    {tx.side === 'SELL' ? (
                                        <span className={tx.realizedProfit && tx.realizedProfit >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                            {tx.realizedProfit?.toLocaleString(undefined, { signDisplay: 'always' })}
                                        </span>
                                    ) : (
                                        <span className="text-slate-500">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {transactions.length === 0 && (
                    <div className="text-center py-16 text-slate-500 text-sm">
                        尚無任何交易紀錄
                        <p className="text-xs mt-1">請使用「匯入交易紀錄」功能新增</p>
                    </div>
                )}
            </div>
        </div>
    );
};

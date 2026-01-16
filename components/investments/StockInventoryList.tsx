
import React from 'react';
import { StockSnapshot } from '../../types';
import { PieChart as PieIcon, Camera, Landmark } from 'lucide-react';

interface StockInventoryListProps {
  currentSnapshot: StockSnapshot | null;
}

export const StockInventoryList: React.FC<StockInventoryListProps> = ({ currentSnapshot }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex justify-between items-center backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PieIcon size={20} className="text-violet-400"/> 當前持股明細
            </h3>
            <span className="text-xs font-normal text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                共 {currentSnapshot?.positions.length || 0} 檔
            </span>
        </div>
        
        {!currentSnapshot ? (
            <div className="py-20 text-center flex flex-col items-center justify-center text-slate-500">
                <Camera size={48} className="mb-4 opacity-20"/>
                <p className="text-sm">尚無庫存資料</p>
                <p className="text-xs opacity-60 mt-1">請點擊上方「更新庫存」按鈕上傳截圖</p>
            </div>
        ) : (
            <>
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4 rounded-tl-lg">股名 / 代號</th>
                                <th className="p-4 text-right">股數</th>
                                <th className="p-4 text-right">現價</th>
                                <th className="p-4 text-right">成本</th>
                                <th className="p-4 text-right">庫存市值</th>
                                <th className="p-4 text-right">未實現損益</th>
                                <th className="p-4 text-center">股利政策</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {currentSnapshot.positions.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-700/20 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-200">{p.name}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{p.symbol}</div>
                                    </td>
                                    <td className="p-4 text-right font-mono text-slate-300">{p.shares.toLocaleString()}</td>
                                    <td className="p-4 text-right font-mono text-slate-300">${p.currentPrice}</td>
                                    <td className="p-4 text-right font-mono text-slate-500">${p.cost}</td>
                                    <td className="p-4 text-right font-mono font-bold text-white">${p.marketValue.toLocaleString()}</td>
                                    <td className={`p-4 text-right font-mono font-bold ${(p.unrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <div className="flex flex-col items-end">
                                            <span>{(p.unrealizedPL || 0) > 0 ? '+' : ''}{p.unrealizedPL.toLocaleString()}</span>
                                            <span className={`text-[10px] px-1.5 rounded ${
                                                (p.unrealizedPL || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                                {p.returnRate ? `${p.returnRate}%` : (
                                                    `${((p.unrealizedPL / (p.marketValue - p.unrealizedPL)) * 100).toFixed(2)}%`
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {p.dividendYield ? (
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                                    {p.dividendYield}%
                                                </span>
                                                <span className="text-[10px] text-slate-500 mt-1">{p.dividendFrequency}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 text-xs">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Compact List */}
                <div className="md:hidden divide-y divide-slate-700/50">
                    {currentSnapshot.positions.map((p, i) => (
                        <div key={i} className="p-4 hover:bg-slate-700/20 active:bg-slate-700/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-base">{p.name}</span>
                                    <span className="text-xs text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded font-mono">{p.symbol}</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-white text-base">${p.marketValue.toLocaleString()}</div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <div className="text-xs text-slate-400 flex items-center gap-2">
                                        <span className="bg-slate-700/50 px-1.5 rounded text-[10px]">股數 {p.shares.toLocaleString()}</span>
                                        <span className="bg-slate-700/50 px-1.5 rounded text-[10px]">現價 ${p.currentPrice}</span>
                                    </div>
                                    {p.dividendYield && (
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <Landmark size={10} className="text-amber-500"/>
                                            <span className="text-[10px] text-amber-400 font-medium">
                                                {p.dividendYield}% ({p.dividendFrequency})
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className={`text-right ${(p.unrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    <div className="font-mono font-bold text-sm">
                                        {(p.unrealizedPL || 0) > 0 ? '+' : ''}{p.unrealizedPL.toLocaleString()}
                                    </div>
                                    <div className={`text-[10px] font-bold mt-0.5 inline-block px-1.5 rounded ${
                                        (p.unrealizedPL || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                                    }`}>
                                            {p.returnRate ? `${p.returnRate}%` : (
                                            `${((p.unrealizedPL / (p.marketValue - p.unrealizedPL)) * 100).toFixed(2)}%`
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}
    </div>
  );
};

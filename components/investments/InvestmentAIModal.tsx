
import React from 'react';
import { Modal, Button } from '../ui';
import { Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Transaction } from '../../types';

interface InvestmentAIModalProps {
  uploadResult: any;
  onClose: () => void;
  onConfirmInventory: () => void;
  onConfirmTransactions: () => void;
}

export const InvestmentAIModal: React.FC<InvestmentAIModalProps> = ({ 
  uploadResult, onClose, onConfirmInventory, onConfirmTransactions 
}) => {
  if (!uploadResult) return null;

  return (
    <Modal isOpen={!!uploadResult} onClose={onClose} title="AI 分析結果確認">
        {uploadResult?.type === 'INVENTORY' && (
            <div className="space-y-4">
                <div className="bg-violet-500/10 p-4 rounded-xl border border-violet-500/20 text-center">
                    <p className="text-xs text-violet-300 uppercase font-bold">辨識到的總市值</p>
                    <p className="text-3xl font-bold text-white font-mono">${uploadResult.summary.totalVal.toLocaleString()}</p>
                    <p className={`text-sm mt-1 ${(uploadResult.summary.totalPL) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        未實現損益: ${uploadResult.summary.totalPL.toLocaleString()}
                    </p>
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-lg custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 sticky top-0">
                            <tr>
                                <th className="p-2">股名</th>
                                <th className="p-2 text-right">股數</th>
                                <th className="p-2 text-center">股利</th>
                                <th className="p-2 text-right">市值</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uploadResult.data.map((p: any, i: number) => (
                                <tr key={i} className="border-b border-slate-700/50">
                                    <td className="p-2">{p.name} <br/><span className="text-slate-500">{p.symbol}</span></td>
                                    <td className="p-2 text-right font-mono">{p.shares}</td>
                                    <td className="p-2 text-center">
                                        {p.dividendYield ? (
                                            <span className="text-amber-400 block">{p.dividendYield}%</span>
                                        ) : <span className="text-slate-600">-</span>}
                                    </td>
                                    <td className="p-2 text-right font-mono text-white">${p.marketValue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <Search size={16} className="text-amber-400 shrink-0 mt-0.5"/>
                        <p className="text-[10px] text-slate-400">
                           已透過 Google Search 自動補充股利資訊（殖利率與配息頻率），僅供參考，實際配息請以券商公告為準。
                        </p>
                    </div>
                    <div className="flex items-start gap-2 bg-violet-500/10 p-3 rounded-lg border border-violet-500/20">
                         <RefreshCw size={16} className="text-violet-400 shrink-0 mt-0.5"/>
                         <p className="text-[10px] text-slate-400">
                            確認後將建立歷史快照，並<b>自動同步更新「資產管理」中的股票資產總額</b>。
                         </p>
                    </div>
                </div>
                
                <Button onClick={onConfirmInventory} className="w-full">確認更新資產</Button>
            </div>
        )}

        {uploadResult?.type === 'PL' && (
            <div className="space-y-4">
                 <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400"/> 
                        AI 辨識到 {uploadResult.data.length} 筆紀錄
                    </h4>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {uploadResult.data.map((t: Transaction, i: number) => (
                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-800 rounded border border-slate-700/50">
                                <div>
                                    <div className="text-slate-200">{t.item}</div>
                                    <div className="text-slate-500">{t.date} • {t.category}</div>
                                </div>
                                <div className={`font-mono font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {t.type === 'INCOME' ? '+' : '-'}${t.amount.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
                 <div className="text-[10px] text-slate-500 text-center">
                    系統將自動過濾「買進」交易，僅記錄「已實現損益」。
                 </div>
                 <Button onClick={onConfirmTransactions} className="w-full">確認匯入收支簿</Button>
            </div>
        )}
    </Modal>
  );
};

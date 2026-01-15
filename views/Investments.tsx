
import React, { useState, useRef, useMemo } from 'react';
import { Card, Button, Modal } from '../components/ui';
import { StockSnapshot, StockPosition, Asset, AssetType, Transaction, Currency } from '../types';
import { analyzeStockInventory, analyzeStockRealizedPL, enrichStockDataWithDividends } from '../services/gemini';
import { getApiKey } from '../services/storage';
import { 
  TrendingUp, TrendingDown, Camera, Upload, PieChart as PieIcon, 
  DollarSign, Activity, AlertCircle, CheckCircle2, Info, ArrowRight,
  Landmark, Search, RefreshCw, BarChart3, ChevronRight, Coins
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface InvestmentsProps {
  snapshots: StockSnapshot[];
  onAddSnapshot: (snapshot: StockSnapshot) => void;
  onUpdateAssetValue: (amount: number) => void; // Callback to update "Stock Asset" in Assets view
  onBulkAddTransactions: (ts: Transaction[]) => void;
}

export const Investments: React.FC<InvestmentsProps> = ({ 
  snapshots, 
  onAddSnapshot, 
  onUpdateAssetValue,
  onBulkAddTransactions 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [modalType, setModalType] = useState<'INVENTORY' | 'PL' | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const hasApiKey = !!getApiKey();

  // Chart Data Preparation
  const chartData = useMemo(() => {
      return snapshots.map(s => ({
          date: s.date.substring(5), // MM-DD
          fullDate: s.date,
          value: s.totalMarketValue,
          pl: s.totalUnrealizedPL
      })).slice(-30); // Last 30 points
  }, [snapshots]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // API Key check is now handled by the disabled button state
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsProcessing(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
          const base64Raw = event.target?.result as string;
          // Remove "data:image/png;base64," prefix
          const base64Data = base64Raw.split(',')[1];

          try {
              if (modalType === 'INVENTORY') {
                  setLoadingStep('正在分析截圖中的持股...');
                  const positions = await analyzeStockInventory(base64Data);
                  
                  if (positions.length > 0) {
                      setLoadingStep('正在聯網搜尋股利政策 (Google Search)...');
                      // Enrich with dividends
                      const enrichedPositions = await enrichStockDataWithDividends(positions);
                      
                      const totalVal = enrichedPositions.reduce((sum, p) => sum + p.marketValue, 0);
                      const totalPL = enrichedPositions.reduce((sum, p) => sum + p.unrealizedPL, 0);
                      
                      setUploadResult({
                          type: 'INVENTORY',
                          data: enrichedPositions,
                          summary: { totalVal, totalPL }
                      });
                  } else {
                      alert("無法辨識庫存資料，請確認截圖清晰度。");
                      setModalType(null);
                  }
              } else if (modalType === 'PL') {
                  setLoadingStep('正在分析交易明細...');
                  const transactions = await analyzeStockRealizedPL(base64Data);
                  if (transactions.length > 0) {
                      setUploadResult({
                          type: 'PL',
                          data: transactions
                      });
                  } else {
                      alert("無法辨識交易明細或無已實現損益。");
                      setModalType(null);
                  }
              }
          } catch (err) {
              console.error(err);
              alert("AI 分析發生錯誤");
          } finally {
              setIsProcessing(false);
              setLoadingStep('');
          }
      };
      
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = '';
  };

  const confirmInventory = () => {
      if (!uploadResult || uploadResult.type !== 'INVENTORY') return;
      
      const newSnapshot: StockSnapshot = {
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          totalMarketValue: uploadResult.summary.totalVal,
          totalUnrealizedPL: uploadResult.summary.totalPL,
          positions: uploadResult.data
      };

      onAddSnapshot(newSnapshot);
      // Automatically update the Asset in Asset Management
      onUpdateAssetValue(newSnapshot.totalMarketValue);
      
      setUploadResult(null);
      setModalType(null);
  };

  const confirmTransactions = () => {
      if (!uploadResult || uploadResult.type !== 'PL') return;
      onBulkAddTransactions(uploadResult.data);
      setUploadResult(null);
      setModalType(null);
  };

  const triggerUpload = (type: 'INVENTORY' | 'PL') => {
      setModalType(type);
      setTimeout(() => fileInputRef.current?.click(), 100);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-violet-400"/> 股票投資副駕駛
            </h2>
            <p className="text-xs text-slate-400 mt-1">AI 視覺辨識庫存與損益 • 自動搜尋股利</p>
         </div>
         <div className="flex gap-2">
             <button 
                onClick={() => triggerUpload('PL')}
                disabled={!hasApiKey}
                title={!hasApiKey ? "請先至設定頁面輸入 API Key 以啟用功能" : ""}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800 transition-all active:scale-95"
             >
                <Activity size={16} className={hasApiKey ? "text-cyan-400" : "text-slate-500"}/> 
                <span className="hidden md:inline">匯入已實現損益</span>
             </button>
             <button 
                onClick={() => triggerUpload('INVENTORY')}
                disabled={!hasApiKey}
                title={!hasApiKey ? "請先至設定頁面輸入 API Key 以啟用功能" : ""}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-violet-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:shadow-none disabled:text-slate-400 transition-all active:scale-95"
             >
                <Camera size={16}/> 更新庫存
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
         </div>
       </div>

       {/* Summary Cards */}
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

       {/* Chart - Full Width */}
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

       {/* Holdings Section - Replaced Grid with Responsive Table/List */}
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

       {/* Processing Modal */}
       <Modal isOpen={!!uploadResult} onClose={() => setUploadResult(null)} title="AI 分析結果確認">
            {/* Modal content unchanged */}
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
                    
                    <Button onClick={confirmInventory} className="w-full">確認更新資產</Button>
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
                     <Button onClick={confirmTransactions} className="w-full">確認匯入收支簿</Button>
                </div>
            )}
       </Modal>
       
       {isProcessing && (
           <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
               <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4"></div>
               <p className="text-violet-300 font-bold animate-pulse">Gemini AI 運算中...</p>
               <p className="text-xs text-slate-500 mt-2">{loadingStep || '正在處理數據'}</p>
           </div>
       )}
    </div>
  );
};

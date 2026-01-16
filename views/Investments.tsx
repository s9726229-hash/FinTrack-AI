
import React, { useState, useRef } from 'react';
import { StockSnapshot, Transaction } from '../types';
import { analyzeStockInventory, analyzeStockRealizedPL, enrichStockDataWithDividends } from '../services/gemini';
import { getApiKey } from '../services/storage';
import { TrendingUp, Camera, Activity } from 'lucide-react';

// New Components
import { InvestmentStats } from '../components/investments/InvestmentStats';
import { InvestmentChart } from '../components/investments/InvestmentChart';
import { StockInventoryList } from '../components/investments/StockInventoryList';
import { InvestmentAIModal } from '../components/investments/InvestmentAIModal';

interface InvestmentsProps {
  snapshots: StockSnapshot[];
  onAddSnapshot: (snapshot: StockSnapshot) => void;
  onUpdateAssetValue: (amount: number) => void; 
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsProcessing(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
          const base64Raw = event.target?.result as string;
          const base64Data = base64Raw.split(',')[1];

          try {
              if (modalType === 'INVENTORY') {
                  setLoadingStep('正在分析截圖中的持股...');
                  const positions = await analyzeStockInventory(base64Data);
                  
                  if (positions.length > 0) {
                      setLoadingStep('正在聯網搜尋股利政策 (Google Search)...');
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

       {/* Components */}
       <InvestmentStats currentSnapshot={currentSnapshot} />
       <InvestmentChart snapshots={snapshots} />
       <StockInventoryList currentSnapshot={currentSnapshot} />

       {/* Modals & Loading */}
       <InvestmentAIModal 
          uploadResult={uploadResult} 
          onClose={() => setUploadResult(null)} 
          onConfirmInventory={confirmInventory} 
          onConfirmTransactions={confirmTransactions}
       />
       
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

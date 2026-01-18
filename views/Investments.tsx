
import React, { useState, useRef, useEffect } from 'react';
import { StockSnapshot, StockPosition } from '../types';
import { TrendingUp, Camera, FileCheck2, Loader2, AlertTriangle, Pencil, HelpCircle } from 'lucide-react';
import { parseStockScreenshot } from '../services/gemini';
import { Button, Modal, Input } from '../components/ui';

// New Components
import { InvestmentStats } from '../components/investments/InvestmentStats';
import { InvestmentChart } from '../components/investments/InvestmentChart';
import { StockInventoryList } from '../components/investments/StockInventoryList';

interface InvestmentsProps {
  snapshots: StockSnapshot[];
  onAddSnapshot: (snapshot: StockSnapshot) => void;
}

type ParsedPosition = Partial<StockPosition> & { id: string };

export const Investments: React.FC<InvestmentsProps> = ({ snapshots, onAddSnapshot }) => {
  const currentSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedPositions, setParsedPositions] = useState<ParsedPosition[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StockPosition>>({});
  const [importError, setImportError] = useState<string | null>(null);

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleAiImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setIsImportModalOpen(true);
    setParsedPositions([]);
    setImportError(null);

    try {
        const base64Image = await toBase64(file);
        const results = await parseStockScreenshot(base64Image);
        
        setParsedPositions(results.map(r => ({ ...r, id: crypto.randomUUID() })));
        if (results.length === 0) {
            setImportError("AI 未能辨識出任何持股資料。請確認截圖是否清晰且完整，或稍後再試。");
        }
    } catch (e: any) {
        console.error("Error parsing stock screenshot:", e);
        setImportError("AI 辨識時發生未知錯誤，請稍後再試。");
    } finally {
        setIsParsing(false);
        event.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    const finalPositions = parsedPositions.map(p => {
        const cost = p.cost || 0;
        const currentPrice = p.currentPrice || 0;
        const shares = p.shares || 0;
        const marketValue = currentPrice * shares;
        const unrealizedPL = (currentPrice - cost) * shares;
        const returnRate = cost > 0 ? (unrealizedPL / (cost * shares)) * 100 : 0;

        return {
            symbol: p.symbol || '',
            name: p.name || 'N/A',
            shares,
            cost,
            currentPrice,
            marketValue,
            unrealizedPL,
            returnRate
        };
    });

    const totalMarketValue = finalPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalUnrealizedPL = finalPositions.reduce((sum, p) => sum + p.unrealizedPL, 0);

    const newSnapshot: StockSnapshot = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        totalMarketValue,
        totalUnrealizedPL,
        positions: finalPositions,
    };
    
    onAddSnapshot(newSnapshot);
    setIsImportModalOpen(false);
  };
  
  const handleStartEdit = (pos: ParsedPosition) => {
    setEditingPositionId(pos.id);
    setEditFormData({ ...pos });
  };
  
  const handleCancelEdit = () => {
    setEditingPositionId(null);
    setEditFormData({});
  };
  
  const handleSaveEdit = () => {
    if (!editingPositionId) return;
    const updatedPositions = parsedPositions.map(p => 
      p.id === editingPositionId ? { ...p, ...editFormData } : p
    );
    setParsedPositions(updatedPositions);
    handleCancelEdit();
  };
  
  const handleModalClose = () => {
      setIsImportModalOpen(false);
      setImportError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-violet-400"/> 股票投資概況
            </h2>
            <p className="text-xs text-slate-400 mt-1">追蹤庫存市值、未實現損益與股利政策</p>
         </div>
         <div className="flex flex-col items-end">
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
             <Button
                variant="primary"
                onClick={handleAiImportClick}
                disabled={isParsing}
                className="bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/20"
             >
                {isParsing ? <Loader2 size={16} className="animate-spin"/> : <Camera size={16}/>}
                <span className="hidden md:inline">{isParsing ? '辨識中...' : 'AI 截圖匯入'}</span>
             </Button>
         </div>
       </div>

       <InvestmentStats currentSnapshot={currentSnapshot} />
       <InvestmentChart snapshots={snapshots} />
       <StockInventoryList currentSnapshot={currentSnapshot} />
       
       <Modal isOpen={isImportModalOpen} onClose={handleModalClose} title="AI 庫存匯入預覽">
          <div className="space-y-4">
              {isParsing ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
                      <Loader2 size={32} className="animate-spin mb-4 text-primary"/>
                      <p className="font-bold text-lg text-white">Gemini AI 辨識中...</p>
                      <p className="text-xs">正在為您解析庫存圖片，請稍候。</p>
                  </div>
              ) : (
                <>
                  <h4 className="text-sm font-bold text-slate-300 pt-2">AI 辨識結果 (共 {parsedPositions.length} 筆)：</h4>
                  <p className="text-xs text-slate-500 -mt-2">請核對並修改辨識結果，特別是股票代號。</p>
                  
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                      {parsedPositions.map(p => (
                          editingPositionId === p.id ? (
                            <div key={p.id} className="bg-slate-700/80 p-3 rounded-lg space-y-3 border border-primary/50 shadow-lg">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-slate-400">名稱</label>
                                        <Input value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="h-8 text-sm"/>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">代號</label>
                                        <Input value={editFormData.symbol} onChange={e => setEditFormData({...editFormData, symbol: e.target.value})} className="h-8 text-sm"/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-xs text-slate-400">股數</label>
                                        <Input type="number" value={editFormData.shares} onChange={e => setEditFormData({...editFormData, shares: Number(e.target.value)})} className="h-8 text-sm font-mono"/>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">成本</label>
                                        <Input type="number" value={editFormData.cost} onChange={e => setEditFormData({...editFormData, cost: Number(e.target.value)})} className="h-8 text-sm font-mono"/>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">現價</label>
                                        <Input type="number" value={editFormData.currentPrice} onChange={e => setEditFormData({...editFormData, currentPrice: Number(e.target.value)})} className="h-8 text-sm font-mono"/>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button onClick={handleCancelEdit} variant="secondary" className="px-2 py-1 text-xs">取消</Button>
                                    <Button onClick={handleSaveEdit} className="px-2 py-1 text-xs">儲存</Button>
                                </div>
                            </div>
                          ) : (
                            <div key={p.id} className="bg-slate-800 p-2 rounded-lg flex justify-between items-center text-sm group hover:bg-slate-700/50">
                                <div>
                                    <p className="font-bold text-white">{p.name} <span className="text-xs text-slate-400 font-mono">{p.symbol}</span></p>
                                    <p className="text-xs text-slate-400">股數: {p.shares} • 成本: ${p.cost} • 現價: ${p.currentPrice}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleStartEdit(p)} className="p-1.5 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Pencil size={12}/>
                                    </button>
                                </div>
                            </div>
                          )
                      ))}
                      {parsedPositions.length === 0 && !isParsing && (
                        <div className="text-center py-10 text-slate-500 text-sm">
                            <AlertTriangle size={32} className="mx-auto mb-2 text-amber-500/50"/>
                            <p className="font-bold text-amber-400">辨識失敗</p>
                            <p className="text-xs mt-1 whitespace-pre-line">{importError || "AI 未能辨識出任何持股資料。\n請確認截圖是否清晰且完整。"}</p>
                        </div>
                      )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-700">
                      <Button variant="secondary" onClick={handleModalClose} className="flex-1">取消</Button>
                      <Button onClick={handleConfirmImport} disabled={parsedPositions.length === 0} className="flex-1">
                          <FileCheck2 size={16} className="mr-2"/> 確認匯入
                      </Button>
                  </div>
                </>
              )}
          </div>
      </Modal>

    </div>
  );
};

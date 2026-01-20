import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Assets } from './views/Assets';
import { Transactions } from './views/Transactions';
import { Recurring } from './views/Recurring';
import { Settings } from './views/Settings';
import { HistoryView } from './views/History';
import { GuideView } from './views/Guide';
import { Budget } from './views/Budget';
import { Investments } from './views/Investments';
import { ViewState, Asset, Transaction, RecurringItem, AssetType, BudgetConfig, ApiKeyStatus, StockSnapshot, StockTransaction, Currency } from './types';
import * as storage from './services/storage';
import { verifyApiKey } from './services/gemini';
import { calculateLoanBalance } from './services/finance';
import { enrichStockData } from './services/stock';
import { CheckCircle2, X } from 'lucide-react';
import { VoiceInputFab } from './components/VoiceInputFab';

// Helper function to normalize stock symbols for comparison
const toNumericString = (s: string | undefined): string => {
    if (!s) return '';
    // Converts "0050", "50.0", "50" to "50" for consistent matching.
    const num = parseInt(s, 10);
    return isNaN(num) ? s.trim().toUpperCase() : String(num); // Keep non-numeric symbols as is
};


export default function App() {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  
  // App State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [recurringExecuted, setRecurringExecuted] = useState<Record<string, string[]>>({});
  const [budgets, setBudgets] = useState<BudgetConfig[]>([]);
  const [stockHistory, setStockHistory] = useState<StockSnapshot[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('unchecked');
  
  const [toast, setToast] = useState<{message: string, count: number} | null>(null);

  // V5.9.17 Background Task State
  const [isEnrichingInBackground, setIsEnrichingInBackground] = useState(false);
  const [backgroundEnrichTask, setBackgroundEnrichTask] = useState<{ current: number; total: number; enrichingIds: string[] } | null>(null);

  const refreshData = useCallback(async () => {
    setAssets(storage.getAssets());
    setTransactions(storage.getTransactions());
    setRecurring(storage.getRecurring());
    setRecurringExecuted(storage.getRecurringExecuted());
    setBudgets(storage.getBudgets());
    setStockHistory(storage.getStockHistory());
    setStockTransactions(storage.getStockTransactions());
    
    const key = storage.getApiKey();
    setApiKey(key);
    if (key) {
      setApiKeyStatus('verifying');
      const isValid = await verifyApiKey(key);
      setApiKeyStatus(isValid ? 'valid' : 'invalid');
    } else {
      setApiKeyStatus('unchecked');
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // --- Auto-Update Debt Balances ---
  useEffect(() => {
    if (assets.length === 0) return;
    
    let updatedCount = 0;
    const newAssets = assets.map(asset => {
        if (asset.type === AssetType.DEBT && asset.startDate && asset.originalAmount) {
            const calculatedBalance = calculateLoanBalance(asset);
            if (Math.abs(calculatedBalance - asset.amount) > 1) {
                updatedCount++;
                return { ...asset, amount: calculatedBalance, lastUpdated: Date.now() };
            }
        }
        return asset;
    });

    if (updatedCount > 0) {
        setAssets(newAssets);
        storage.saveAssets(newAssets);
        setToast({ message: `已自動更新 ${updatedCount} 筆貸款的本月剩餘本金`, count: updatedCount });
        setTimeout(() => setToast(null), 5000);
    }
  }, [assets]); 

  // --- Auto-Execute Recurring Items ---
  useEffect(() => {
    if (recurring.length === 0) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentMonthKey = today.toISOString().substring(0, 7);

    let newTransactions: Transaction[] = [];
    let newLog = { ...recurringExecuted };
    let executedCount = 0;

    recurring.forEach(item => {
        const itemLogs = newLog[item.id] || [];
        if (itemLogs.includes(currentMonthKey)) return;

        let shouldExecute = false;
        let targetDate = '';

        if (item.frequency === 'MONTHLY') {
            if (currentDay >= item.dayOfMonth) {
                shouldExecute = true;
                targetDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(item.dayOfMonth).padStart(2, '0')}`;
            }
        } else if (item.frequency === 'YEARLY') {
            const targetMonth = item.monthOfYear || 1;
            if (currentMonth > targetMonth || (currentMonth === targetMonth && currentDay >= item.dayOfMonth)) {
                 shouldExecute = true;
                 targetDate = `${currentYear}-${String(targetMonth).padStart(2, '0')}-${String(item.dayOfMonth).padStart(2, '0')}`;
            }
        }

        if (shouldExecute) {
            const t: Transaction = {
                id: crypto.randomUUID(),
                date: targetDate, 
                amount: item.amount,
                category: item.category,
                item: `[固定] ${item.name}`,
                type: item.type,
                note: '系統自動入帳 (Auto-Executed)',
                source: 'MANUAL' 
            };
            newTransactions.push(t);
            if (!newLog[item.id]) newLog[item.id] = [];
            newLog[item.id].push(currentMonthKey);
            executedCount++;
        }
    });

    if (executedCount > 0) {
        const latestTransactions = storage.getTransactions(); 
        const finalTransactions = [...latestTransactions, ...newTransactions];
        setTransactions(finalTransactions);
        setRecurringExecuted(newLog);
        storage.saveTransactions(finalTransactions);
        storage.saveRecurringExecuted(newLog);
        setToast({ message: `已自動為您補入 ${executedCount} 筆本月到期的固定帳務`, count: executedCount });
        setTimeout(() => setToast(null), 5000);
    }
  }, [recurring, recurringExecuted]);

  // --- Snapshot Logic (Portfolio & Stock) ---
  const takePortfolioSnapshot = useCallback((currentAssets: Asset[]) => {
     let assetsVal = 0;
     let liabilitiesVal = 0;
     const distribution: any = {};
     currentAssets.forEach(a => {
        const val = a.amount; 
        if (a.type === AssetType.DEBT) liabilitiesVal += val;
        else assetsVal += val;
        distribution[a.type] = (distribution[a.type] || 0) + val;
     });
     const snapshot = {
        date: new Date().toISOString().split('T')[0],
        totalAssets: assetsVal,
        totalLiabilities: liabilitiesVal,
        netWorth: assetsVal - liabilitiesVal,
        assetDistribution: distribution
     };
     const history = storage.getHistory();
     const today = new Date().toISOString().split('T')[0];
     const filteredHistory = history.filter(h => h.date !== today);
     filteredHistory.push(snapshot);
     if (filteredHistory.length > 365) filteredHistory.shift();
     storage.saveHistory(filteredHistory);
  }, []);

  const takeStockSnapshot = useCallback((currentAssets: Asset[]) => {
      const stocks = currentAssets.filter(a => a.type === AssetType.STOCK);
      if (stocks.length === 0) {
          // If no stocks, ensure today's snapshot doesn't exist or is 0
          const history = storage.getStockHistory();
          const today = new Date().toISOString().split('T')[0];
          if (history.some(h => h.date === today && h.totalMarketValue !== 0)) {
              const snapshot = { date: today, totalMarketValue: 0 };
              const filteredHistory = history.filter(h => h.date !== today);
              filteredHistory.push(snapshot);
              storage.saveStockHistory(filteredHistory);
              setStockHistory(filteredHistory);
          }
          return;
      }
      
      const totalMarketValue = stocks.reduce((sum, s) => sum + (s.currentPrice && s.shares ? s.currentPrice * s.shares : s.amount), 0);
      const snapshot = { date: new Date().toISOString().split('T')[0], totalMarketValue };
      const history = storage.getStockHistory();
      const today = snapshot.date;
      const filteredHistory = history.filter(h => h.date !== today);
      filteredHistory.push(snapshot);
      if (filteredHistory.length > 365) filteredHistory.shift();
      storage.saveStockHistory(filteredHistory);
      setStockHistory(filteredHistory);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const portfolioHistory = storage.getHistory();
    const stockHistoryData = storage.getStockHistory();
    
    if (assets.length > 0) {
        if (!portfolioHistory.some(h => h.date === today)) {
            takePortfolioSnapshot(assets);
        }
        if (!stockHistoryData.some(h => h.date === today)) {
            takeStockSnapshot(assets);
        }
    }
  }, [assets, takePortfolioSnapshot, takeStockSnapshot]);


  // Asset Handlers - UPDATED TO USE FUNCTIONAL UPDATES
  const addAsset = (asset: Asset) => {
    setAssets(prev => {
        const updated = [...prev, asset];
        storage.saveAssets(updated);
        return updated;
    });
  };

  const updateAsset = (asset: Asset) => {
    setAssets(prev => {
        const updated = prev.map(a => a.id === asset.id ? asset : a);
        storage.saveAssets(updated);
        return updated;
    });
  };

  const deleteAsset = (id: string) => {
    setAssets(prev => {
        const updated = prev.filter(a => a.id !== id);
        storage.saveAssets(updated);
        return updated;
    });
  };

  // Transaction Handlers
  const addTransaction = (t: Transaction) => {
    addBatchTransactions([t]);
  };
  
  const addBatchTransactions = (ts: Transaction[]) => {
    if (ts.length === 0) return;
    const latest = storage.getTransactions();
    const updated = [...latest, ...ts];
    setTransactions(updated);
    storage.saveTransactions(updated);

    if (ts.length === 1) {
        setToast({ message: `記帳成功！${ts[0].item} $${ts[0].amount}`, count: 1 });
    } else {
        setToast({ message: `已成功分析並記錄 ${ts.length} 筆交易`, count: ts.length });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const updateTransaction = (t: Transaction) => {
    const updated = transactions.map(txn => txn.id === t.id ? t : txn);
    setTransactions(updated);
    storage.saveTransactions(updated);
    setToast({ message: `更新成功！${t.item}`, count: 1 });
    setTimeout(() => setToast(null), 3000);
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    storage.saveTransactions(updated);
  };

  // Recurring Handlers
  const addRecurring = (item: RecurringItem) => {
    const updated = [...recurring, item];
    setRecurring(updated);
    storage.saveRecurring(updated);
  };

  const deleteRecurring = (id: string) => {
    const updated = recurring.filter(r => r.id !== id);
    setRecurring(updated);
    storage.saveRecurring(updated);
  };

  // Budget Handlers
  const updateBudgets = (newBudgets: BudgetConfig[]) => {
      setBudgets(newBudgets);
      storage.saveBudgets(newBudgets);
      setToast({ message: '預算設定已更新', count: 1 });
      setTimeout(() => setToast(null), 3000);
  };
  
  // V6.3.0: Refactored to not modify assets, only add transactions
  const handleImportTransactions = (newlyParsedTxs: StockTransaction[]) => {
      const currentTxs = storage.getStockTransactions();
      const existingTxSignatures = new Set(currentTxs.map(tx => 
          `${tx.date}-${tx.symbol}-${tx.shares}-${tx.price}-${tx.side}`
      ));

      const newUniqueTxs = newlyParsedTxs.filter(newTx => {
          const signature = `${newTx.date}-${newTx.symbol}-${newTx.shares}-${newTx.price}-${newTx.side}`;
          return !existingTxSignatures.has(signature);
      });

      if (newUniqueTxs.length > 0) {
          const updatedTxs = [...currentTxs, ...newUniqueTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setStockTransactions(updatedTxs);
          storage.saveStockTransactions(updatedTxs);
          setToast({ message: `成功匯入 ${newUniqueTxs.length} 筆新交易紀錄`, count: newUniqueTxs.length });
          setTimeout(() => setToast(null), 5000);
      } else {
          setToast({ message: '沒有新的交易紀錄可供匯入', count: 0 });
          setTimeout(() => setToast(null), 3000);
      }
  };
  
  const handleImportInventory = (parsedAssets: Partial<Asset>[]) => {
    const currentAssets = storage.getAssets();
    const stockMap = new Map<string, Asset>(
        currentAssets
            .filter(a => a.type === AssetType.STOCK && a.symbol)
            .map(a => [toNumericString(a.symbol), a])
    );

    let newAssetsCount = 0;
    let updatedAssetsCount = 0;

    parsedAssets.forEach(parsed => {
        const normalizedSymbol = toNumericString(parsed.symbol);
        if (!normalizedSymbol) return;

        const existing = stockMap.get(normalizedSymbol);

        if (existing) {
            const newShares = parsed.shares !== undefined ? parsed.shares : existing.shares;
            const newCurrentPrice = parsed.currentPrice !== undefined ? parsed.currentPrice : existing.currentPrice;
            const newAmount = (newShares || 0) * (newCurrentPrice || 0);
            
            const updatedAsset: Asset = {
                ...existing,
                name: parsed.name !== undefined ? parsed.name : existing.name,
                shares: newShares,
                avgCost: parsed.avgCost !== undefined ? parsed.avgCost : existing.avgCost,
                currentPrice: newCurrentPrice,
                amount: newAmount,
                lastUpdated: Date.now(),
            };
            stockMap.set(normalizedSymbol, updatedAsset);
            updatedAssetsCount++;
        } else {
            const newShares = parsed.shares !== undefined ? parsed.shares : 0;
            const newCurrentPrice = parsed.currentPrice !== undefined ? parsed.currentPrice : 0;
            const newAmount = newShares * newCurrentPrice;

            const newAsset: Asset = {
                id: crypto.randomUUID(),
                type: AssetType.STOCK,
                currency: Currency.TWD,
                exchangeRate: 1,
                name: parsed.name || parsed.symbol || '',
                symbol: parsed.symbol,
                shares: newShares,
                avgCost: parsed.avgCost !== undefined ? parsed.avgCost : 0,
                currentPrice: newCurrentPrice,
                amount: newAmount,
                lastUpdated: Date.now(),
            };
            stockMap.set(normalizedSymbol, newAsset);
            newAssetsCount++;
        }
    });

    const nonStockAssets = currentAssets.filter(a => a.type !== AssetType.STOCK);
    const finalAssets = [...nonStockAssets, ...Array.from(stockMap.values())];

    setAssets(finalAssets);
    storage.saveAssets(finalAssets);
    
    setToast({ message: `庫存同步完成：新增 ${newAssetsCount} 筆，更新 ${updatedAssetsCount} 筆`, count: newAssetsCount + updatedAssetsCount });
    setTimeout(() => setToast(null), 5000);
  };

  // V6.2.1: Refactored with try...catch...finally for stability
  const handleEnrichData = async (idsToEnrich: string[] | null = null) => {
    if (isEnrichingInBackground) return;
    const currentAssets = storage.getAssets();
    const inventory = currentAssets.filter(a => a.type === AssetType.STOCK);
    const STALE_THRESHOLD = 14 * 24 * 60 * 60 * 1000; // 14 days
    let stocksToEnrich: Asset[];

    if (idsToEnrich) {
        stocksToEnrich = inventory.filter(s => idsToEnrich.includes(s.id));
    } else {
        if (inventory.length === 0) {
            setToast({ message: `庫存中沒有持股可供更新`, count: 1 });
            setTimeout(() => setToast(null), 3000);
            return;
        }
        const priorityStocks = inventory.filter(s => 
            !s.name || s.name === s.symbol || !s.currentPrice || !s.stockCategory ||
            !s.lastUpdated || (Date.now() - (s.lastUpdated || 0)) > STALE_THRESHOLD
        );
        stocksToEnrich = priorityStocks.length > 0 ? priorityStocks : inventory;
    }

    if (stocksToEnrich.length === 0) return;

    setIsEnrichingInBackground(true);
    setToast({ message: `背景任務：已開始更新 ${stocksToEnrich.length} 筆持股數據...`, count: stocksToEnrich.length });
    setTimeout(() => setToast(null), 3000);

    const totalToFetch = stocksToEnrich.length;
    setBackgroundEnrichTask({ current: 0, total: totalToFetch, enrichingIds: stocksToEnrich.map(s => s.id) });

    const newAssetsState = [...currentAssets];
    let hasError = false;

    try {
        let currentCount = 0;
        for (const stock of stocksToEnrich) {
            currentCount++;
            if (!stock.symbol) continue;

            const enrichedData = await enrichStockData(stock.symbol);
            const assetIndex = newAssetsState.findIndex(a => a.id === stock.id);

            if (assetIndex !== -1 && enrichedData) {
                const updatedAsset = { 
                    ...newAssetsState[assetIndex], 
                    ...enrichedData,
                    amount: (Number(stock.shares) || 0) * (Number(enrichedData.currentPrice) || 0),
                    lastUpdated: Date.now()
                } as Asset;
                newAssetsState[assetIndex] = updatedAsset;
            }

            setBackgroundEnrichTask(prev => ({ 
                ...prev!, 
                current: currentCount, 
                enrichingIds: prev!.enrichingIds.filter(id => id !== stock.id) 
            }));
        }
    } catch (error) {
        console.error("Batch enrichment failed:", error);
        hasError = true;
    } finally {
        storage.saveAssets(newAssetsState);
        takeStockSnapshot(newAssetsState);
        takePortfolioSnapshot(newAssetsState);
        setAssets(newAssetsState);

        if (hasError) {
            setToast({ message: '部分數據更新失敗，請檢查網路或 API Key', count: 1 });
        } else {
            setToast({ message: `背景任務：${totalToFetch} 筆持股數據更新完成！`, count: totalToFetch });
        }
        setTimeout(() => setToast(null), 3000);

        setIsEnrichingInBackground(false);
        setBackgroundEnrichTask(null);
    }
  };

  return (
    <Layout 
      currentView={view} 
      onChangeView={setView} 
      apiKeyStatus={apiKeyStatus}
      isEnrichingInBackground={isEnrichingInBackground}
    >
      {view === 'DASHBOARD' && <Dashboard assets={assets} transactions={transactions} recurring={recurring} />}
      {view === 'ASSETS' && <Assets assets={assets} onAdd={addAsset} onUpdate={updateAsset} onDelete={deleteAsset} />}
      {view === 'INVESTMENTS' && <Investments assets={assets} stockHistory={stockHistory} stockTransactions={stockTransactions} onAdd={addAsset} onUpdate={updateAsset} onDelete={deleteAsset} onEnrichData={handleEnrichData} backgroundEnrichTask={backgroundEnrichTask} onImportTransactions={handleImportTransactions} onImportInventory={handleImportInventory} />}
      {view === 'TRANSACTIONS' && <Transactions transactions={transactions} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} />}
      {view === 'BUDGET' && <Budget transactions={transactions} budgets={budgets} onUpdateBudgets={updateBudgets} />}
      {view === 'RECURRING' && <Recurring items={recurring} executedLog={recurringExecuted} onAdd={addRecurring} onDelete={deleteRecurring} onExecute={() => {}} />}
      {view === 'GUIDE' && <GuideView />}
      {view === 'HISTORY' && <HistoryView />}
      {view === 'SETTINGS' && <Settings onDataChange={refreshData} apiKeyStatus={apiKeyStatus} />}

      <VoiceInputFab onAddBatchTransactions={addBatchTransactions} hasApiKey={!!apiKey} />

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[60] animate-fade-in">
           <div className="bg-white/20 p-1 rounded-full">
              <CheckCircle2 size={20} />
           </div>
           <span className="font-medium text-sm">{toast.message}</span>
           <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">
              <X size={16} />
           </button>
        </div>
      )}
    </Layout>
  );
}
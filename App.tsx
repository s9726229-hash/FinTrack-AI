
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { Assets } from './views/Assets';
import { Transactions } from './views/Transactions';
import { Recurring } from './views/Recurring';
import { Settings } from './views/Settings';
import { HistoryView } from './views/History';
import { Investments } from './views/Investments';
import { Budget } from './views/Budget'; // Import new view
import { ViewState, Asset, Transaction, RecurringItem, AssetType, StockSnapshot, Currency, BudgetConfig } from './types';
import * as storage from './services/storage';
import { calculateLoanBalance } from './services/finance'; // Centralized function
import { CheckCircle2, X } from 'lucide-react';
import { VoiceInputFab } from './components/VoiceInputFab'; // New Import

export default function App() {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  
  // App State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [recurringExecuted, setRecurringExecuted] = useState<Record<string, string[]>>({});
  const [stockSnapshots, setStockSnapshots] = useState<StockSnapshot[]>([]);
  const [budgets, setBudgets] = useState<BudgetConfig[]>([]); // New State
  const [apiKey, setApiKey] = useState<string>(''); // Track API key for voice button
  
  // Global Toast State
  const [toast, setToast] = useState<{message: string, count: number} | null>(null);

  // Load Data Function (Soft Refresh)
  const refreshData = () => {
    setAssets(storage.getAssets());
    setTransactions(storage.getTransactions());
    setRecurring(storage.getRecurring());
    setRecurringExecuted(storage.getRecurringExecuted());
    setStockSnapshots(storage.getStockSnapshots());
    setBudgets(storage.getBudgets()); // Load Budgets
    setApiKey(storage.getApiKey()); // Check key
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- Auto-Update Debt Balances (New V5.2) ---
  useEffect(() => {
    if (assets.length === 0) return;
    
    let updatedCount = 0;
    const newAssets = assets.map(asset => {
        if (asset.type === AssetType.DEBT && asset.startDate && asset.originalAmount) {
            const calculatedBalance = calculateLoanBalance(asset);
            // Check if update is significant to avoid unnecessary re-renders
            if (Math.abs(calculatedBalance - asset.amount) > 1) { // Loosened to 1 for small monthly changes
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
  // BUG FIX: Changed dependency from [assets.length] to [assets]
  // This ensures updates trigger on asset EDIT, not just add/delete.
  }, [assets]); 

  // --- Auto-Execute Logic (Check on Load & Data Change) ---
  useEffect(() => {
    if (recurring.length === 0) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();
    const currentMonthKey = today.toISOString().substring(0, 7); // YYYY-MM

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring]);

  // --- Snapshot Logic ---
  const checkAndTakeSnapshot = () => {
    const currentAssets = storage.getAssets();
    if (currentAssets.length === 0) return;

    const history = storage.getHistory();
    const today = new Date().toISOString().split('T')[0];
    const lastSnapshot = history.length > 0 ? history[history.length - 1] : null;

    if (!lastSnapshot || lastSnapshot.date !== today) {
       takeSnapshot(currentAssets);
    }
  }

  useEffect(() => {
     checkAndTakeSnapshot();
  }, [assets]); 

  const takeSnapshot = (currentAssets: Asset[]) => {
     let assetsVal = 0;
     let liabilitiesVal = 0;
     const distribution: any = {};

     currentAssets.forEach(a => {
        const val = a.amount; 
        if (a.type === AssetType.DEBT) {
           liabilitiesVal += val;
        } else {
           assetsVal += val;
        }
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
  };

  // Asset Handlers
  const addAsset = (asset: Asset) => {
    const updated = [...assets, asset];
    setAssets(updated);
    storage.saveAssets(updated);
  };

  const updateAsset = (asset: Asset) => {
    const updated = assets.map(a => a.id === asset.id ? asset : a);
    setAssets(updated);
    storage.saveAssets(updated);
  };

  const deleteAsset = (id: string) => {
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated);
    storage.saveAssets(updated);
  };

  // Transaction Handlers
  const addTransaction = (t: Transaction) => {
    // Get latest to avoid race condition if possible (though state is fast enough here)
    const latest = storage.getTransactions();
    const updated = [...latest, t];
    setTransactions(updated);
    storage.saveTransactions(updated);
    setToast({ message: `記帳成功！${t.item} $${t.amount}`, count: 1 });
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

  const executeRecurring = (item: RecurringItem, date: string) => {
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date: date,
      amount: item.amount,
      category: item.category,
      item: `[手動] ${item.name}`,
      type: item.type,
      note: '系統手動入帳 (Manual Execution)',
      source: 'MANUAL',
    };
    addTransaction(newTransaction);
    setToast({ message: `已手動執行固定項目: ${item.name}`, count: 1 });
    setTimeout(() => setToast(null), 3000);
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

  return (
    <Layout currentView={view} onChangeView={setView}>
      {view === 'DASHBOARD' && <Dashboard assets={assets} transactions={transactions} stockSnapshots={stockSnapshots} recurring={recurring} />}
      {view === 'ASSETS' && <Assets assets={assets} onAdd={addAsset} onUpdate={updateAsset} onDelete={deleteAsset} />}
      {view === 'TRANSACTIONS' && <Transactions transactions={transactions} onAdd={addTransaction} onDelete={deleteTransaction} />}
      {view === 'BUDGET' && <Budget transactions={transactions} budgets={budgets} onUpdateBudgets={updateBudgets} />}
      {view === 'RECURRING' && <Recurring items={recurring} executedLog={recurringExecuted} onAdd={addRecurring} onExecute={executeRecurring} onDelete={deleteRecurring} />}
      {view === 'INVESTMENTS' && <Investments snapshots={stockSnapshots} />}
      {view === 'HISTORY' && <HistoryView />}
      {view === 'SETTINGS' && <Settings onDataChange={refreshData} />}

      {/* Global Voice Input Button (Always visible) */}
      <VoiceInputFab onAddTransaction={addTransaction} hasApiKey={!!apiKey} />

      {/* Global Toast Notification */}
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

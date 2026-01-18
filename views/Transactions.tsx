
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  ScrollText, Plus, ChevronDown, ChevronUp, PieChart
} from 'lucide-react';
import { getApiKey } from '../services/storage';

// Import New Refactored Components
import { TransactionStats } from '../components/transactions/TransactionStats';
import { TransactionFilters, TimeRange } from '../components/transactions/TransactionFilters';
import { TransactionCharts } from '../components/transactions/TransactionCharts';
import { TransactionList } from '../components/transactions/TransactionList';
import { AddTransactionModal } from '../components/transactions/TransactionModals';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onDelete }) => {
  const [filter, setFilter] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('THIS_MONTH');
  const [showCharts, setShowCharts] = useState(false);
  
  // Custom Date Range State
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const hasApiKey = !!getApiKey();

  // --- Unified Data Processing ---
  const { filteredTransactions, rangeStats, dailyTrendData, expenseStructure, dateRangeLabel } = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    const formatDate = (d: Date) => `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;

    if (timeRange === 'THIS_WEEK') {
        const day = now.getDay() || 7; 
        if (day !== 1) startDate.setDate(now.getDate() - day + 1);
        const endOfWeek = new Date(startDate);
        endOfWeek.setDate(startDate.getDate() + 6);
        endDate = endOfWeek;
    } 
    else if (timeRange === 'THIS_MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } 
    else if (timeRange === 'LAST_90_DAYS') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 90);
        endDate = new Date();
    } 
    else if (timeRange === 'CUSTOM') {
        startDate = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1); 
        endDate = customEnd ? new Date(customEnd) : new Date(); 
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const dateRangeLabel = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;

    const processedTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const tDate = new Date(t.date);
        const tDateMidnight = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
        if (tDateMidnight < startDate || tDateMidnight > endDate) return false;
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            return t.item.toLowerCase().includes(lowerFilter) || t.category.toLowerCase().includes(lowerFilter);
        }
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};
    const dailyMap: Record<string, { income: number, expense: number }> = {};

    processedTransactions.forEach(t => {
        if (t.type === 'INCOME') income += t.amount;
        else {
            expense += t.amount;
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        }

        // Daily Trend Logic
        if (!dailyMap[t.date]) dailyMap[t.date] = { income: 0, expense: 0 };
        if (t.type === 'INCOME') dailyMap[t.date].income += t.amount;
        else dailyMap[t.date].expense += t.amount;
    });

    // Format Trend Data (Sorted by Date Ascending)
    const dailyTrendData = Object.keys(dailyMap).sort().map(date => ({
        day: date.substring(5), // MM-DD
        income: dailyMap[date].income,
        expense: dailyMap[date].expense
    }));

    // Format Expense Structure (Sorted by Value Descending)
    const expenseStructure = Object.keys(catMap).map(cat => ({
        name: cat,
        value: catMap[cat],
        percent: expense > 0 ? (catMap[cat] / expense) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    return {
        filteredTransactions: processedTransactions,
        rangeStats: { income, expense, balance: income - expense },
        dailyTrendData,
        expenseStructure,
        dateRangeLabel
    };
  }, [transactions, timeRange, customStart, customEnd, filter]); 

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ScrollText className="text-amber-400" size={24}/> 收支記帳
            </h2>
            <p className="text-xs text-slate-400 mt-1">記錄每日開銷、收入與發票管理</p>
         </div>
         <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
                <Plus size={20}/> 
                <span className="hidden md:inline font-bold text-sm">新增紀錄</span>
            </button>
         </div>
      </div>

      {/* Stats & Filters */}
      <div>
          <TransactionStats 
            income={rangeStats.income} 
            expense={rangeStats.expense} 
            balance={rangeStats.balance} 
          />

          <TransactionFilters
            filter={filter} setFilter={setFilter}
            timeRange={timeRange} setTimeRange={setTimeRange}
            dateRangeLabel={dateRangeLabel}
            customStart={customStart} setCustomStart={setCustomStart}
            customEnd={customEnd} setCustomEnd={setCustomEnd}
          />
      </div>

      <div className="mt-4 mb-4">
          <button 
             onClick={() => setShowCharts(!showCharts)}
             className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-all"
          >
             {showCharts ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
             {showCharts ? '隱藏分析圖表' : '展開圖表分析 (趨勢與支出結構)'}
             {!showCharts && <PieChart size={14} className="ml-1 opacity-50"/>}
          </button>
      </div>

      {showCharts && (
          <TransactionCharts 
            dailyTrendData={dailyTrendData} 
            expenseStructure={expenseStructure} 
            hasExpense={rangeStats.expense > 0} 
          />
      )}

      <TransactionList 
        transactions={filteredTransactions} 
        onDelete={onDelete} 
      />

      <AddTransactionModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={onAdd}
        hasApiKey={hasApiKey}
      />
    </div>
  );
};

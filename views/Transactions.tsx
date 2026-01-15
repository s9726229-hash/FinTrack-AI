
import React, { useState, useMemo, useRef } from 'react';
import { Card, Input, Button, Modal, Select } from '../components/ui';
import { Transaction } from '../types';
import { 
  Search, ArrowDownCircle, ArrowUpCircle, Wand2, Plus, 
  TrendingUp, TrendingDown, DollarSign, CalendarDays,
  Utensils, Bus, ShoppingBag, Home, FileText, Stethoscope, GraduationCap, LineChart, MoreHorizontal,
  Wallet, Upload, CheckCircle2, AlertCircle, Info, Sparkles, Pencil, ScrollText
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { batchAnalyzeInvoiceCategories, parseTransactionInput } from '../services/gemini';
import { getApiKey } from '../services/storage';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onBulkAdd?: (ts: Transaction[]) => void;
}

type TimeRange = 'WEEK' | 'MONTH' | 'QUARTER';
type ModalTab = 'AI' | 'MANUAL';

const CATEGORY_STYLE: Record<string, { color: string, icon: any }> = {
  '餐飲': { color: 'bg-rose-500', icon: Utensils },
  '交通': { color: 'bg-blue-500', icon: Bus },
  '購物': { color: 'bg-amber-500', icon: ShoppingBag },
  '居住': { color: 'bg-cyan-500', icon: Home },
  '帳單': { color: 'bg-slate-500', icon: FileText },
  '醫療': { color: 'bg-emerald-500', icon: Stethoscope },
  '教育': { color: 'bg-indigo-500', icon: GraduationCap },
  '投資': { color: 'bg-violet-500', icon: LineChart },
  'default': { color: 'bg-slate-600', icon: MoreHorizontal }
};

export const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onDelete, onBulkAdd }) => {
  const [filter, setFilter] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('QUARTER');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('AI');
  const [aiInputText, setAiInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hasApiKey = !!getApiKey();

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
      success: number, 
      totalAmount: number, 
      skipped: Transaction[]
  } | null>(null);
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
      category: '餐飲'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { rangeStats, dailyTrendData, expenseStructure } = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === 'WEEK') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'MONTH') startDate.setDate(now.getDate() - 30);
    else if (timeRange === 'QUARTER') startDate.setDate(now.getDate() - 90);

    const rangeTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d >= startDate && d <= now;
    });

    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};
    const dailyMap: Record<string, { income: number, expense: number }> = {};

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dailyMap[dateKey] = { income: 0, expense: 0 };
    }

    rangeTransactions.forEach(t => {
        if (t.type === 'INCOME') {
            income += t.amount;
            if (dailyMap[t.date]) dailyMap[t.date].income += t.amount;
        } else {
            expense += t.amount;
            if (dailyMap[t.date]) dailyMap[t.date].expense += t.amount;
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        }
    });

    const trend = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
            day: date.substring(5), // MM-DD
            income: vals.income,
            expense: vals.expense
        }));

    const structure = Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({
            name,
            value,
            percent: expense > 0 ? (value / expense) * 100 : 0
        }));
    
    const topStructure = structure.slice(0, 4);
    const otherValue = structure.slice(4).reduce((acc, curr) => acc + curr.value, 0);
    if (otherValue > 0) {
        topStructure.push({ name: '其他', value: otherValue, percent: (otherValue / expense) * 100 });
    }

    return {
        rangeStats: { income, expense, balance: income - expense },
        dailyTrendData: trend,
        expenseStructure: topStructure
    };
  }, [transactions, timeRange]);

  const filteredTransactions = transactions
    .filter(t => t.item.toLowerCase().includes(filter.toLowerCase()) || t.category.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        
        const rawImported: Transaction[] = [];
        let lastM: any = null;
        const itemsToAnalyze: string[] = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const parts = line.split('|');
            if (parts[0] === 'M') {
                const rawDate = parts[3]; 
                const formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
                const storeName = parts[5];
                const invoiceId = parts[6];
                const amount = parseFloat(parts[7]);

                lastM = {
                    id: crypto.randomUUID(),
                    date: formattedDate,
                    amount: amount,
                    item: storeName,
                    invoiceId: invoiceId,
                    type: 'EXPENSE',
                    source: 'CSV',
                    details: []
                };
                rawImported.push(lastM);
            } else if (parts[0] === 'D' && lastM) {
                const detailName = parts[3];
                lastM.details.push(detailName);
                const uniqueItemKey = `${lastM.item}/${detailName}`;
                if (!itemsToAnalyze.includes(uniqueItemKey)) {
                    itemsToAnalyze.push(uniqueItemKey);
                }
            }
        }

        // Check if user has API key to run categorization, else default or simple mapping
        // In real app we might fallback to simple rules. Here we assume key needed for better results.
        let categories: Record<string, string> = {};
        if (hasApiKey) {
            categories = await batchAnalyzeInvoiceCategories(itemsToAnalyze.slice(0, 50));
        }
        
        const finalToAdd: Transaction[] = [];
        const skippedItems: Transaction[] = [];
        let totalAmount = 0;

        for (const t of rawImported) {
            const isDuplicate = transactions.some(existing => 
                (t.invoiceId && existing.invoiceId === t.invoiceId) || 
                (existing.date === t.date && existing.amount === t.amount && existing.item === t.item)
            );

            if (isDuplicate) {
                skippedItems.push(t);
                continue;
            }

            const detailKey = `${t.item}/${(t as any).details[0] || ''}`;
            t.category = categories[detailKey] || '購物'; // Default if no AI or API key
            if ((t as any).details.length > 0) {
                t.item = `${t.item} (${(t as any).details[0]})`;
            }
            delete (t as any).details;
            finalToAdd.push(t);
            totalAmount += t.amount;
        }

        if (onBulkAdd && finalToAdd.length > 0) {
            onBulkAdd(finalToAdd);
        } else if (finalToAdd.length > 0) {
            finalToAdd.forEach(onAdd);
        }

        setImportResult({
            success: finalToAdd.length,
            totalAmount: totalAmount,
            skipped: skippedItems
        });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const openAddModal = () => {
      setFormData({
          type: 'EXPENSE',
          date: new Date().toISOString().split('T')[0],
          category: '餐飲',
          item: '',
          amount: undefined
      });
      setAiInputText('');
      setActiveTab('AI'); 
      setIsAddModalOpen(true);
  };

  const handleAIAnalyze = async () => {
      if(!aiInputText.trim()) return;
      setIsAnalyzing(true);
      const result = await parseTransactionInput(aiInputText);
      if (result) {
          setFormData({
              ...formData,
              ...result,
              date: result.date || new Date().toISOString().split('T')[0]
          });
          setActiveTab('MANUAL'); 
      } else {
          alert("AI 無法辨識內容，請嘗試輸入更完整的句子。");
      }
      setIsAnalyzing(false);
  };

  const handleSubmit = () => {
    if (!formData.amount || !formData.item) return;
    onAdd({
        id: crypto.randomUUID(),
        date: formData.date || new Date().toISOString().split('T')[0],
        amount: Number(formData.amount),
        category: formData.category || '其他',
        item: formData.item,
        type: formData.type as 'EXPENSE' | 'INCOME',
        source: 'MANUAL'
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      
      {/* 1. Optimized Header */}
      <div className="flex items-center justify-between mb-6">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ScrollText className="text-amber-400"/> 收支記帳
            </h2>
            <p className="text-xs text-slate-400 mt-1">紀錄每日開銷與收入 • 支援 CSV 匯入</p>
         </div>
         
         <div className="flex items-center gap-3">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCsvImport} 
                accept=".csv" 
                className="hidden" 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                title="匯入發票 (CSV)"
            >
                {isImporting ? <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span> : <Upload size={16}/>}
                <span className="hidden md:inline">匯入發票 (CSV)</span>
            </button>

            <button 
                onClick={openAddModal}
                className="px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium shadow-lg shadow-primary/20 flex items-center gap-2 transition-all active:scale-95"
            >
                <Plus size={16}/> 
                <span className="hidden md:inline">新增紀錄</span>
            </button>
         </div>
      </div>

      {/* 2. Toolbar (Search + Filter) - New Row */}
      <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={16}/>
                <Input 
                   placeholder="搜尋近期交易..." 
                   className="pl-9 h-10 bg-slate-800 border-slate-700 text-sm focus:bg-slate-900 transition-colors rounded-lg w-full"
                   value={filter}
                   onChange={e => setFilter(e.target.value)}
                />
          </div>
          
          <div className="flex justify-end">
            <div className="inline-flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-sm w-full md:w-auto">
                {(['WEEK', 'MONTH', 'QUARTER'] as TimeRange[]).map((r) => (
                    <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                            timeRange === r 
                            ? 'bg-primary text-white shadow-md' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {r === 'WEEK' ? '本週' : r === 'MONTH' ? '本月' : '本季 (90天)'}
                    </button>
                ))}
            </div>
          </div>
      </div>

      {/* 3. Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
             <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">區間結餘 (Balance)</p>
                <h3 className={`text-2xl font-bold font-mono ${rangeStats.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                   ${rangeStats.balance.toLocaleString()}
                </h3>
             </div>
             <div className={`p-3 rounded-xl bg-slate-700/50 ${rangeStats.balance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                <Wallet size={24}/>
             </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
             <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">區間收入 (Income)</p>
                <h3 className="text-2xl font-bold font-mono text-emerald-400">
                   +${rangeStats.income.toLocaleString()}
                </h3>
             </div>
             <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp size={24}/>
             </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
             <div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">區間支出 (Expense)</p>
                <h3 className="text-2xl font-bold font-mono text-rose-400">
                   -${rangeStats.expense.toLocaleString()}
                </h3>
             </div>
             <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                <TrendingDown size={24}/>
             </div>
          </div>
      </div>

      {/* 4. Trend & Structure Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 h-[320px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <CalendarDays size={16} className="text-cyan-400"/> 收支總覽趨勢
                 </h3>
                 <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 收入</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> 支出</div>
                 </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5}/>
                        <XAxis 
                            dataKey="day" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            minTickGap={timeRange === 'QUARTER' ? 30 : 15} 
                        />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
          </Card>

          <Card className="h-[320px] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                 <DollarSign size={16} className="text-amber-400"/> 支出結構分析
              </h3>
              
              {rangeStats.expense > 0 ? (
                <div className="space-y-6">
                    <div className="h-4 w-full bg-slate-700/50 rounded-full flex overflow-hidden">
                        {expenseStructure.map((item, index) => {
                            const style = CATEGORY_STYLE[item.name] || CATEGORY_STYLE['default'];
                            return (
                                <div 
                                    key={index}
                                    className={`${style.color} h-full transition-all duration-500 hover:brightness-110`}
                                    style={{ width: `${item.percent}%` }}
                                    title={`${item.name} (${item.percent.toFixed(1)}%)`}
                                ></div>
                            )
                        })}
                    </div>

                    <div className="space-y-3">
                        {expenseStructure.map((item, index) => {
                            const style = CATEGORY_STYLE[item.name] || CATEGORY_STYLE['default'];
                            const Icon = style.icon;
                            return (
                                <div key={index} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg ${style.color} bg-opacity-20 flex items-center justify-center text-white/90`}>
                                            <Icon size={14} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-200">{item.name}</div>
                                            <div className="text-[10px] text-slate-500">{item.percent.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-sm font-bold text-slate-300">
                                        ${item.value.toLocaleString()}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 pb-10">
                    <Wallet size={32} className="opacity-20"/>
                    <p className="text-xs">區間內尚無支出紀錄</p>
                </div>
              )}
          </Card>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-400 mb-2 pl-1 mt-4">近期交易紀錄</h3>
        {filteredTransactions.map(t => (
        <div key={t.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between group hover:border-slate-600 transition-all shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {t.type === 'INCOME' ? <ArrowUpCircle size={20}/> : <ArrowDownCircle size={20}/>}
                </div>
                <div>
                    <div className="font-bold text-white text-base flex items-center gap-2">
                        {t.item}
                        {t.invoiceId && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={10}/> 發票</span>}
                    </div>
                    <div className="text-xs text-slate-400 flex gap-2">
                        <span>{t.date}</span> • <span className="bg-slate-700 px-1.5 rounded text-[10px]">{t.category}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`font-mono text-lg font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'}`}>
                {t.type === 'INCOME' ? '+' : '-'}${t.amount.toLocaleString()}
                </span>
                <button onClick={() => onDelete(t.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <span className="text-xs">刪除</span>
                </button>
            </div>
        </div>
        ))}
        {filteredTransactions.length === 0 && <div className="text-center text-slate-500 py-12 border-2 border-dashed border-slate-800 rounded-xl">找不到相關交易紀錄。</div>}
      </div>

      <Modal isOpen={!!importResult} onClose={() => setImportResult(null)} title="發票匯入完成報告">
          {/* Modal content unchanged */}
          {importResult && (
              <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">成功匯入</p>
                          <p className="text-2xl font-bold text-white">{importResult.success} 筆</p>
                          <p className="text-xs text-emerald-500/70 mt-1">+${importResult.totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                          <p className="text-[10px] text-amber-400 font-bold uppercase mb-1">自動跳過</p>
                          <p className="text-2xl font-bold text-white">{importResult.skipped.length} 筆</p>
                          <p className="text-xs text-amber-500/70 mt-1">偵測到重複發票</p>
                      </div>
                  </div>
                  {importResult.skipped.length > 0 && (
                      <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                             <AlertCircle size={14}/> 重複項目細節
                          </h4>
                          <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-2">
                              {importResult.skipped.map((s, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-slate-700/50 text-[10px]">
                                      <div className="flex flex-col">
                                          <span className="text-slate-200 font-medium">{s.item}</span>
                                          <span className="text-slate-500">{s.date} • {s.invoiceId}</span>
                                      </div>
                                      <span className="text-slate-400 font-mono">${s.amount}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3 border border-slate-700/30">
                      <Info size={16} className="text-cyan-400 shrink-0 mt-0.5"/>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                          系統已根據發票號碼、日期與金額自動進行精準去重。
                      </p>
                  </div>
                  <Button className="w-full" onClick={() => setImportResult(null)}>確認並關閉</Button>
              </div>
          )}
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="新增收支">
          <div className="space-y-6">
             <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-700/50">
                 <button 
                     onClick={() => setActiveTab('AI')}
                     className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                         activeTab === 'AI' 
                         ? 'bg-primary text-white shadow-md' 
                         : 'text-slate-400 hover:text-white'
                     }`}
                 >
                     <Sparkles size={16} className={activeTab === 'AI' ? 'text-white' : 'text-cyan-400'}/>
                     AI 智慧輸入
                 </button>
                 <button 
                     onClick={() => setActiveTab('MANUAL')}
                     className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                         activeTab === 'MANUAL' 
                         ? 'bg-slate-700 text-white shadow-md' 
                         : 'text-slate-400 hover:text-white'
                     }`}
                 >
                     <Pencil size={16}/>
                     手動輸入
                 </button>
             </div>

             {activeTab === 'AI' ? (
                 <div className="space-y-4 animate-fade-in">
                     <div className="relative">
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-cyan-500/5 rounded-xl pointer-events-none"></div>
                         <textarea
                             value={aiInputText}
                             onChange={(e) => setAiInputText(e.target.value)}
                             placeholder="試著輸入：昨天跟朋友吃火鍋花了 1200 元..."
                             className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                         />
                     </div>
                     <p className="text-xs text-slate-500 flex items-center gap-1.5">
                         <Info size={12}/> AI 將自動分析日期、金額、分類與項目名稱。
                     </p>
                     <Button 
                        onClick={handleAIAnalyze} 
                        disabled={isAnalyzing || !aiInputText.trim() || !hasApiKey}
                        className="w-full py-3 bg-gradient-to-r from-primary to-cyan-600 hover:from-primary-hover hover:to-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                     >
                        {isAnalyzing ? '分析中...' : (hasApiKey ? '立即分析並帶入' : '請先設定 API Key')} <Wand2 size={16} className="ml-1"/>
                     </Button>
                 </div>
             ) : (
                 <div className="space-y-4 animate-fade-in">
                     <div className="grid grid-cols-2 gap-4">
                         <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                            <button 
                                onClick={() => setFormData({...formData, type: 'EXPENSE', category: '餐飲'})}
                                className={`flex-1 py-1.5 text-sm rounded font-medium transition-all ${formData.type === 'EXPENSE' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                支出
                            </button>
                            <button 
                                onClick={() => setFormData({...formData, type: 'INCOME', category: '薪資'})}
                                className={`flex-1 py-1.5 text-sm rounded font-medium transition-all ${formData.type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >
                                收入
                            </button>
                         </div>
                         <Input 
                            type="date" 
                            value={formData.date} 
                            onChange={e => setFormData({...formData, date: e.target.value})} 
                            className="bg-slate-900 text-center"
                         />
                     </div>

                     <div>
                        <label className="block text-xs text-slate-400 mb-1">項目名稱</label>
                        <Input 
                            placeholder="例如：午餐、薪水" 
                            value={formData.item || ''} 
                            onChange={e => setFormData({...formData, item: e.target.value})} 
                            className="h-11 bg-slate-900"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs text-slate-400 mb-1">分類</label>
                           <Select 
                              value={formData.category} 
                              onChange={e => setFormData({...formData, category: e.target.value})}
                              className="h-11 bg-slate-900"
                           >
                              {(formData.type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                                  <option key={c} value={c}>{c}</option>
                              ))}
                           </Select>
                        </div>
                        <div>
                           <label className="block text-xs text-slate-400 mb-1">金額</label>
                           <Input 
                                type="number" 
                                placeholder="0" 
                                className="text-lg font-mono h-11 bg-slate-900"
                                value={formData.amount || ''} 
                                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                           />
                        </div>
                     </div>
                     
                     <div className="pt-2">
                        <Button className="w-full py-3" onClick={handleSubmit}>確認新增</Button>
                     </div>
                 </div>
             )}
          </div>
      </Modal>
    </div>
  );
};

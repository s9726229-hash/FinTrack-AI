
import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Input, Select } from '../components/ui';
import { Asset, AssetType, Currency } from '../types';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '../constants';
import { getHistory } from '../services/storage';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  Plus, Edit2, Trash2, AlertCircle, Coins, Wallet, TrendingUp, 
  CreditCard, PieChart as PieIcon, BarChart3, Landmark, Bitcoin, Home, Calendar, Calculator
} from 'lucide-react';

interface AssetsProps {
  assets: Asset[];
  onAdd: (asset: Asset) => void;
  onUpdate: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

const TYPE_CONFIG: Record<AssetType, { icon: any, label: string, colorClass: string }> = {
  [AssetType.CASH]: { icon: Wallet, label: '現金/存款', colorClass: 'text-emerald-400' },
  [AssetType.STOCK]: { icon: TrendingUp, label: '股票投資', colorClass: 'text-violet-400' },
  [AssetType.FUND]: { icon: Landmark, label: '共同基金', colorClass: 'text-pink-400' },
  [AssetType.CRYPTO]: { icon: Bitcoin, label: '加密貨幣', colorClass: 'text-amber-400' },
  [AssetType.REAL_ESTATE]: { icon: Home, label: '房地產', colorClass: 'text-cyan-400' },
  [AssetType.DEBT]: { icon: CreditCard, label: '負債/貸款', colorClass: 'text-red-400' },
  [AssetType.OTHER]: { icon: Coins, label: '其他資產', colorClass: 'text-slate-400' },
};

type FilterType = 'ALL' | 'INVEST' | 'CASH' | 'DEBT';

// Duplicate local calc for immediate UI feedback
const calculateCurrentBalance = (formData: Partial<Asset>): number | null => {
    if (!formData.startDate || !formData.originalAmount) return null;

    const principal = formData.originalAmount;
    const annualRate = formData.interestRate || 2;
    const totalYears = formData.termYears || 20;
    const graceYears = formData.interestOnlyPeriod || 0;
    
    const now = new Date();
    const start = new Date(formData.startDate);
    const monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

    if (monthsPassed < 0) return principal;

    const graceMonths = graceYears * 12;
    if (monthsPassed <= graceMonths) return principal;

    const monthlyRate = (annualRate / 100) / 12;
    const totalAmortizationMonths = (totalYears * 12) - graceMonths;
    const paymentsMade = monthsPassed - graceMonths;

    if (paymentsMade >= totalAmortizationMonths) return 0;
    if (monthlyRate === 0) return principal * (1 - (paymentsMade / totalAmortizationMonths));

    const factorN = Math.pow(1 + monthlyRate, totalAmortizationMonths);
    const factorP = Math.pow(1 + monthlyRate, paymentsMade);

    const remaining = principal * (factorN - factorP) / (factorN - 1);
    return Math.round(remaining);
};

export const Assets: React.FC<AssetsProps> = ({ assets, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Asset>>({});
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('ALL');

  useEffect(() => {
    const history = getHistory();
    const dailyMap = new Map<string, any>();

    history.forEach(h => {
        const dist = h.assetDistribution || {};
        const debt = dist[AssetType.DEBT] || 0;
        let totalAssets = h.totalAssets;
        
        if (totalAssets === 0 && h.netWorth !== 0) {
             const cash = (dist[AssetType.CASH] || 0) + (dist[AssetType.OTHER] || 0);
             const invest = (dist[AssetType.STOCK] || 0) + 
                         (dist[AssetType.FUND] || 0) + 
                         (dist[AssetType.CRYPTO] || 0) + 
                         (dist[AssetType.REAL_ESTATE] || 0);
             totalAssets = cash + invest;
        }

        dailyMap.set(h.date, {
            date: h.date.substring(5), // MM-DD
            fullDate: h.date,
            totalAssets: Math.round(totalAssets),
            totalDebt: Math.round(debt),
            netWorth: Math.round(h.netWorth)
        });
    });

    let processed = Array.from(dailyMap.values())
        .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
        .slice(-180);

    if (processed.length === 1) {
        const first = processed[0];
        const yesterdayDate = new Date(first.fullDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const mm = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterdayDate.getDate()).padStart(2, '0');

        processed.unshift({
            date: `${mm}-${dd}`,
            fullDate: yesterdayDate.toISOString().split('T')[0],
            totalAssets: 0,
            totalDebt: 0,
            netWorth: 0
        });
    }

    setHistoryData(processed);
  }, [assets]);

  const totalAssetsVal = assets.reduce((acc, a) => a.type !== AssetType.DEBT ? acc + a.amount : acc, 0);
  
  const dataByType = Object.values(AssetType).map(type => {
    if (type === AssetType.DEBT) return { name: ASSET_TYPE_LABELS[type], typeCode: type, value: 0 };
    const value = assets
      .filter(a => a.type === type)
      .reduce((sum, a) => sum + a.amount, 0);
    return { name: ASSET_TYPE_LABELS[type] || type, typeCode: type, value };
  }).filter(d => d.value > 0);

  const filteredAssets = assets.filter(asset => {
    if (filterType === 'ALL') return true;
    if (filterType === 'CASH') return asset.type === AssetType.CASH || asset.type === AssetType.OTHER;
    if (filterType === 'DEBT') return asset.type === AssetType.DEBT;
    if (filterType === 'INVEST') {
      return [AssetType.STOCK, AssetType.FUND, AssetType.CRYPTO, AssetType.REAL_ESTATE].includes(asset.type);
    }
    return true;
  });

  const handleEdit = (asset: Asset) => {
    setFormData(asset);
    setEditingId(asset.id);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setFormData({
      type: AssetType.CASH,
      currency: Currency.TWD,
      exchangeRate: 1,
      amount: 0,
      originalAmount: 0,
      name: '',
      lastUpdated: Date.now()
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleAmountChange = (key: 'originalAmount' | 'exchangeRate', value: number) => {
      const newData = { ...formData, [key]: value };
      const safeVal = isNaN(value) ? 0 : value;
      newData[key] = safeVal;

      if (newData.currency !== Currency.TWD) {
          const org = newData.originalAmount || 0;
          const rate = newData.exchangeRate || 1;
          newData.amount = Math.round(org * rate);
      } else if (key === 'originalAmount') {
          // If Debt, just set originalAmount. The 'amount' will be calculated on save.
          // If not Debt, amount = originalAmount (for TWD)
          if (formData.type !== AssetType.DEBT) {
              newData.amount = safeVal;
          }
      }
      setFormData(newData);
  }

  const handleSubmit = () => {
    if (!formData.name || formData.originalAmount === undefined) return;
    
    // Auto-calculate remaining balance for DEBT if details are present
    let finalAmount = Number(formData.amount);
    if (formData.type === AssetType.DEBT) {
        const calculated = calculateCurrentBalance(formData);
        if (calculated !== null) {
            finalAmount = calculated;
        } else {
             // Fallback if not enough info: use original amount
             finalAmount = Number(formData.originalAmount);
        }
    } else if (formData.currency === Currency.TWD) {
        finalAmount = Number(formData.originalAmount);
    }

    const asset: Asset = {
      id: editingId || crypto.randomUUID(),
      name: formData.name,
      type: formData.type || AssetType.CASH,
      amount: finalAmount,
      originalAmount: Number(formData.originalAmount),
      currency: formData.currency || Currency.TWD,
      exchangeRate: Number(formData.exchangeRate || 1),
      lastUpdated: Date.now(),
      startDate: formData.startDate,
      interestRate: formData.interestRate ? Number(formData.interestRate) : undefined,
      termYears: formData.termYears ? Number(formData.termYears) : undefined,
      interestOnlyPeriod: formData.interestOnlyPeriod ? Number(formData.interestOnlyPeriod) : 0,
    };

    if (editingId) onUpdate(asset);
    else onAdd(asset);
    setIsModalOpen(false);
  };

  const calculateDaysSinceUpdate = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const calculatedPreview = formData.type === AssetType.DEBT ? calculateCurrentBalance(formData) : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Optimized Header */}
      <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-emerald-400"/> 資產管理
            </h2>
            <p className="text-xs text-slate-400 mt-1">追蹤現金、房產與各類資產淨值總覽</p>
         </div>
         <button 
             onClick={handleAdd} 
             className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
         >
             <Plus size={16}/> 
             <span className="hidden md:inline">新增資產</span>
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Pie Chart */}
        <Card className="lg:col-span-1 h-[340px] flex flex-col relative overflow-hidden bg-slate-800/80 border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                <PieIcon size={16} className="text-primary"/> 資產配置佔比
            </h3>
            <div className="w-full h-full relative -mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                        data={dataByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {dataByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ASSET_TYPE_COLORS[entry.typeCode] || '#94a3b8'} stroke="rgba(0,0,0,0)" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                        formatter={(value: number) => `NT$ ${value.toLocaleString()}`}
                      />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center flex-wrap gap-3 px-4 pointer-events-none">
                   {dataByType.slice(0, 4).map(d => (
                       <div key={d.typeCode} className="flex items-center gap-1.5">
                           <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_TYPE_COLORS[d.typeCode] }}></span>
                           <span className="text-xs text-slate-300 font-medium">{d.name}</span>
                       </div>
                   ))}
                </div>
                {totalAssetsVal === 0 && (
                   <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-2xl z-10">
                      <span className="text-slate-400 text-sm">無資產數據</span>
                   </div>
                )}
            </div>
        </Card>

        {/* Trend Area Chart */}
        <Card className="lg:col-span-2 h-[340px] flex flex-col bg-slate-800/80 border-slate-700">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <BarChart3 size={16} className="text-cyan-400"/> 總資產與負債趨勢
                </h3>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 總資產</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> 總負債</div>
                </div>
             </div>
             <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickCount={6} 
                            dy={10}
                        />
                        <YAxis 
                            stroke="#64748b" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => `${(val/10000).toFixed(0)}萬`} 
                            width={40}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px', padding: 0 }}
                            formatter={(val: number) => `NT$ ${val.toLocaleString()}`}
                        />
                        <Area type="monotone" dataKey="totalAssets" name="總資產" stroke="#10b981" fill="url(#colorAssets)" strokeWidth={2} />
                        <Area type="monotone" dataKey="totalDebt" name="總負債" stroke="#ef4444" fill="url(#colorDebt)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
        </Card>
      </div>

      {/* Asset Table Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
         <div className="flex items-center gap-2 p-4 border-b border-slate-700 bg-slate-800/50 overflow-x-auto">
             {[
                 { id: 'ALL', label: '全部' },
                 { id: 'INVEST', label: '股票/基金' },
                 { id: 'CASH', label: '現金/存款' },
                 { id: 'DEBT', label: '負債/貸款' },
             ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id as FilterType)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        filterType === tab.id 
                        ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                 >
                    {tab.label}
                 </button>
             ))}
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-medium">資產名稱</th>
                        <th className="p-4 font-medium">類別</th>
                        <th className="p-4 font-medium text-right">
                           {filterType === 'DEBT' ? '剩餘本金 (TWD)' : '當前價值 (TWD)'}
                        </th>
                        <th className="p-4 font-medium text-center">月變動</th>
                        <th className="p-4 font-medium text-right">上次更新</th>
                        <th className="p-4 font-medium text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                    {filteredAssets.map(asset => {
                        const daysOld = calculateDaysSinceUpdate(asset.lastUpdated);
                        const isStale = daysOld > 14;
                        return (
                            <tr key={asset.id} className="hover:bg-slate-700/30 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-8 rounded-full`} style={{ backgroundColor: ASSET_TYPE_COLORS[asset.type] }}></div>
                                        <div>
                                            <div className="font-bold text-white text-sm flex items-center gap-2">
                                                {asset.name}
                                                {isStale && asset.type !== AssetType.DEBT && <span title="資料過期"><AlertCircle size={14} className="text-amber-500 animate-pulse" /></span>}
                                            </div>
                                            {asset.currency !== Currency.TWD && (
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                    {asset.currency} {asset.originalAmount?.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-medium">
                                        {ASSET_TYPE_LABELS[asset.type]}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className={`font-mono font-bold ${asset.type === AssetType.DEBT ? 'text-red-400' : 'text-emerald-400'}`}>
                                        ${asset.amount.toLocaleString()}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-slate-600 text-sm">--</span>
                                </td>
                                <td className="p-4 text-right">
                                    <span className="text-xs text-slate-500">{new Date(asset.lastUpdated).toLocaleDateString()}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(asset)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="編輯">
                                            <Edit2 size={16}/>
                                        </button>
                                        <button onClick={() => onDelete(asset.id)} className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400" title="刪除">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
         </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "編輯資產" : "新增資產"}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2 font-medium">資產名稱 (Name)</label>
            <Input 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="例如：薪轉戶、台積電 (2330)、富邦房貸..."
                className="text-lg bg-slate-900 border-slate-700 focus:border-primary"
            />
          </div>

          <div>
             <label className="block text-sm text-slate-400 mb-2 font-medium">資產類別 (Type)</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    AssetType.CASH, AssetType.STOCK, AssetType.FUND,
                    AssetType.CRYPTO, AssetType.REAL_ESTATE, AssetType.DEBT
                ].map((type) => {
                    const config = TYPE_CONFIG[type];
                    const isSelected = formData.type === type;
                    const isDebt = type === AssetType.DEBT;
                    let bgClass = "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600";
                    if (isSelected) {
                        if (isDebt) bgClass = "bg-red-500/20 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]";
                        else bgClass = "bg-primary/20 border-primary text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]";
                    }

                    return (
                        <button
                            key={type}
                            onClick={() => setFormData({...formData, type: type})}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 group ${bgClass}`}
                        >
                            <config.icon size={24} className={`mb-2 ${isSelected ? 'text-white' : config.colorClass} group-hover:scale-110 transition-transform`} />
                            <span className="text-xs font-bold">{config.label}</span>
                        </button>
                    )
                })}
             </div>
          </div>

          <div className="relative border border-slate-700 rounded-xl p-4 bg-slate-900/30">
             <div className="absolute -top-3 left-3 bg-slate-800 px-2 text-xs font-bold text-amber-400 flex items-center gap-1">
                <Coins size={12}/> {formData.type === AssetType.DEBT ? '貸款原始金額' : '金額與幣別'}
             </div>
             <div className="flex gap-4">
                 <div className="w-1/3">
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase">幣別</label>
                    <Select value={formData.currency} onChange={e => {
                        setFormData({...formData, currency: e.target.value as Currency});
                        if(e.target.value === Currency.TWD) handleAmountChange('exchangeRate', 1);
                    }} className="bg-slate-900 h-12">
                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                 </div>
                 <div className="flex-1">
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase">
                        {formData.type === AssetType.DEBT ? '原始貸款總額 (Original)' : `金額 (${formData.currency})`}
                    </label>
                    <Input 
                        type="number" 
                        value={formData.originalAmount || ''} 
                        onChange={e => handleAmountChange('originalAmount', parseFloat(e.target.value))}
                        className="font-mono text-xl h-12 bg-slate-900 border-slate-700 focus:border-primary"
                        placeholder="0.00"
                    />
                 </div>
             </div>
             {formData.currency !== Currency.TWD && (
                 <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">匯率</span>
                        <Input 
                            type="number" 
                            value={formData.exchangeRate || ''} 
                            onChange={e => handleAmountChange('exchangeRate', parseFloat(e.target.value))}
                            className="font-mono text-sm w-20 py-1 px-2 h-auto"
                        />
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-500 mr-2">折合台幣</span>
                        <span className="text-base font-bold text-emerald-400 font-mono">NT$ {formData.amount?.toLocaleString()}</span>
                    </div>
                 </div>
             )}
             
             {formData.type === AssetType.DEBT && formData.startDate && (
                 <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between animate-fade-in">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Calculator size={12}/> 系統試算當前剩餘本金
                    </div>
                    <div className="text-right">
                        <span className="text-base font-bold text-red-400 font-mono">
                            ${calculatedPreview !== null ? calculatedPreview.toLocaleString() : '-'}
                        </span>
                    </div>
                 </div>
             )}
          </div>

          {formData.type === AssetType.DEBT && (
             <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20 space-y-4 animate-fade-in">
                <h4 className="text-sm font-bold text-red-300 flex items-center gap-2">
                    <CreditCard size={16}/> 貸款詳細資訊
                </h4>
                <div>
                     <label className="block text-xs text-red-400/70 mb-1 flex items-center gap-1">
                         <Calendar size={12}/> 貸款起始日 (Start Date)
                     </label>
                     <Input 
                        type="date"
                        className="border-red-500/30 focus:border-red-500 bg-red-500/5 text-red-100"
                        value={formData.startDate || ''}
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                     />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-red-400/70 mb-1">年利率 (%)</label>
                      <Input 
                        className="border-red-500/30 focus:border-red-500 bg-red-500/5 text-red-100 placeholder-red-800" 
                        type="number" 
                        value={formData.interestRate || ''} 
                        onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-red-400/70 mb-1">總年期 (年)</label>
                      <Input 
                        className="border-red-500/30 focus:border-red-500 bg-red-500/5 text-red-100 placeholder-red-800" 
                        type="number" 
                        value={formData.termYears || ''} 
                        onChange={e => setFormData({...formData, termYears: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-red-400/70 mb-1">寬限期 (年)</label>
                      <Input 
                        className="border-red-500/30 focus:border-red-500 bg-red-500/5 text-red-100 placeholder-red-800" 
                        type="number" 
                        placeholder="0"
                        value={formData.interestOnlyPeriod || ''} 
                        onChange={e => setFormData({...formData, interestOnlyPeriod: parseFloat(e.target.value)})}
                      />
                    </div>
                </div>
                <p className="text-[10px] text-red-400/50">
                    * 系統將依據起始日自動攤提本金，您無需手動更新餘額。
                </p>
             </div>
          )}

          <div className="pt-2">
            <Button className="w-full py-3.5 text-lg font-bold shadow-xl shadow-primary/20" onClick={handleSubmit}>
                {editingId ? '儲存變更' : '確認新增資產'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

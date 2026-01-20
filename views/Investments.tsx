import React, { useState, useMemo, useRef } from 'react';
import { Asset, AssetType, StockSnapshot, StockTransaction } from '../types';
import { TrendingUp, PlusCircle, BrainCircuit, List, Wallet, UploadCloud, ClipboardList } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { InvestmentStats } from '../components/investments/InvestmentStats';
import { InvestmentChart, ChartType } from '../components/investments/InvestmentChart';
import { StockInventoryList } from '../components/investments/StockInventoryList';
import { InvestmentInputModal } from '../components/investments/InvestmentInputModal';
import { calculateStockPerformance, parseStockTransactionCSV, parseStockInventoryCSV } from '../services/stock';
import { getApiKey } from '../services/storage';
import { TransactionAnalysisView } from '../components/investments/TransactionAnalysisView';
import { TransactionFilters, TimeRange } from '../components/transactions/TransactionFilters';

interface InvestmentsProps {
    assets: Asset[];
    stockHistory: StockSnapshot[];
    stockTransactions: StockTransaction[];
    onAdd: (asset: Asset) => void;
    onUpdate: (asset: Asset) => void;
    onDelete: (id: string) => void;
    onEnrichData: (idsToEnrich?: string[] | null) => void;
    backgroundEnrichTask: { current: number; total: number; enrichingIds: string[] } | null;
    onImportTransactions: (transactions: StockTransaction[]) => void;
    onImportInventory: (assets: Partial<Asset>[]) => void;
}

type ActiveTab = 'OVERVIEW' | 'HISTORY';

// --- Skeleton Components ---
const InvestmentChartSkeleton = () => (
    <Card className="h-[350px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <div className="h-5 bg-slate-700 rounded w-1/4 animate-pulse"></div>
            <div className="h-8 bg-slate-700 rounded-lg w-1/5 animate-pulse"></div>
        </div>
        <div className="flex-1 w-full bg-slate-700 rounded-lg animate-pulse"></div>
    </Card>
);

const InvestmentStatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div className="h-4 bg-slate-700 rounded w-1/3 animate-pulse"></div>
                    <Wallet size={16} className="text-slate-600"/>
                </div>
                <div className="h-8 bg-slate-700 rounded w-3/4 animate-pulse"></div>
            </Card>
        ))}
    </div>
);

const StockInventoryListSkeleton = () => (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <h3 className="text-sm font-bold text-slate-300 p-4 border-b border-slate-700 flex items-center gap-2">
            <List size={16} className="text-violet-400" />
            庫存明細 (AI 更新中...)
        </h3>
        <div className="p-3 space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-3 w-1/4">
                        <div className="w-10 h-10 bg-slate-700 rounded animate-pulse"></div>
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-slate-700 rounded w-full animate-pulse"></div>
                            <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="h-4 bg-slate-700 rounded w-1/5 animate-pulse"></div>
                    <div className="h-4 bg-slate-700 rounded w-1/5 animate-pulse"></div>
                    <div className="h-4 bg-slate-700 rounded w-1/5 animate-pulse"></div>
                </div>
            ))}
        </div>
    </div>
);


export const Investments: React.FC<InvestmentsProps> = ({ assets, stockHistory, stockTransactions, onAdd, onUpdate, onDelete, onEnrichData, backgroundEnrichTask, onImportTransactions, onImportInventory }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [chartType, setChartType] = useState<ChartType>('TREND');
    const [activeTab, setActiveTab] = useState<ActiveTab>('OVERVIEW');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inventoryFileInputRef = useRef<HTMLInputElement>(null);
    const hasApiKey = !!getApiKey();
    
    // V6.5.0: Date filter state for transaction history
    const [filter, setFilter] = useState('');
    const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const inventory = useMemo(() => assets.filter(a => a.type === AssetType.STOCK), [assets]);

    const STALE_THRESHOLD = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

    const isAnyStockStale = useMemo(() => {
        return inventory.some(stock => !stock.lastUpdated || (Date.now() - stock.lastUpdated) > STALE_THRESHOLD);
    }, [inventory]);

    const { stats, allocationData } = useMemo(() => {
        let totalMarketValue = 0;
        let totalCost = 0;
        const allocation: { name: string; value: number; roi: number; }[] = [];

        inventory.forEach(stock => {
            const performance = calculateStockPerformance(stock);
            totalMarketValue += performance.marketValue;
            totalCost += performance.totalCost;
            allocation.push({ 
                name: stock.symbol || 'N/A', 
                value: performance.marketValue,
                roi: performance.roi
            });
        });

        const totalPL = totalMarketValue - totalCost;
        const statsData = {
            totalMarketValue,
            totalPL,
            totalPLPercent: totalCost > 0 ? (totalPL / totalCost) * 100 : 0
        };

        return { stats: statsData, allocationData: allocation };
    }, [inventory]);
    
    // FIX: Moved stockNameMap declaration before its usage to resolve block-scoped variable error.
    const stockNameMap = useMemo(() => {
        return inventory.reduce((acc, asset) => {
            if (asset.symbol) {
                acc[asset.symbol] = asset.name || asset.symbol;
            }
            return acc;
        }, {} as Record<string, string>);
    }, [inventory]);

    const { filteredStockTransactions, dateRangeLabel } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date(now);

        const formatDate = (d: Date) => `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;

        switch (timeRange) {
            case 'MONTH':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'QUARTER':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                break;
            case 'HALF_YEAR':
                const half = Math.floor(now.getMonth() / 6);
                startDate = new Date(now.getFullYear(), half * 6, 1);
                endDate = new Date(now.getFullYear(), half * 6 + 6, 0);
                break;
            case 'YEAR':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'CUSTOM':
                startDate = customStart ? new Date(customStart) : new Date(0);
                endDate = customEnd ? new Date(customEnd) : new Date();
                break;
            case 'ALL':
                startDate = new Date(0);
                endDate = new Date();
                break;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const label = timeRange === 'ALL' ? '所有紀錄' : `${formatDate(startDate)} ~ ${formatDate(endDate)}`;

        const processed = stockTransactions.filter(t => {
            if (!t.date) return false;
            
            const tDate = new Date(t.date);
            if (tDate < startDate || tDate > endDate) return false;

            if (filter) {
                const lowerFilter = filter.toLowerCase();
                const stockName = stockNameMap[t.symbol]?.toLowerCase() || '';
                return t.symbol.toLowerCase().includes(lowerFilter) || stockName.includes(lowerFilter);
            }
            return true;
        });
        
        return { filteredStockTransactions: processed, dateRangeLabel: label };
    }, [stockTransactions, timeRange, customStart, customEnd, filter, stockNameMap]);

    const enrichingIds = backgroundEnrichTask?.enrichingIds || [];
    const enrichProgress = backgroundEnrichTask ? { current: backgroundEnrichTask.current, total: backgroundEnrichTask.total } : null;
    const isEnriching = !!backgroundEnrichTask;

    const handleOpenModal = (asset: Asset | null = null) => {
        setEditingAsset(asset);
        setIsModalOpen(true);
    };

    const handleSaveAsset = (asset: Asset) => {
        if (editingAsset) onUpdate(asset);
        else onAdd(asset);
        setIsModalOpen(false);
        setEditingAsset(null);
    };

    const handleTransactionFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const { transactions: parsedTransactions, error } = parseStockTransactionCSV(text);
            
            if (error) {
                alert(`CSV 解析失敗：\n${error}\n\n提示：請確認檔案為券商匯出的原始 CSV。若持續失敗，可嘗試用文字編輯器將檔案另存為 UTF-8 編碼後再匯入。`);
                return;
            }
            
            if (parsedTransactions.length > 0) {
                onImportTransactions(parsedTransactions);
            } else {
                alert('CSV 中找不到有效的交易紀錄，請檢查檔案內容與格式。');
            }
        };
        reader.readAsText(file, 'big5'); // Attempt to read as Big5, common for Taiwanese brokerages
        event.target.value = ''; // Reset file input
    };

    const handleInventoryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const { assets: parsedAssets, error } = parseStockInventoryCSV(text);
            if (error) {
                alert(`庫存 CSV 解析失敗：\n${error}`);
                return;
            }
            if (parsedAssets.length > 0) {
                onImportInventory(parsedAssets);
            } else {
                alert('CSV 中找不到有效的庫存資料。');
            }
        };
        reader.readAsText(file, 'big5');
        event.target.value = '';
    };
    

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-violet-400"/> 股票投資
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">追蹤庫存市值、未實現損益與歷史趨勢</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="file" ref={inventoryFileInputRef} onChange={handleInventoryFileChange} accept=".csv" className="hidden" />
                    <Button variant="secondary" onClick={() => inventoryFileInputRef.current?.click()}>
                        <ClipboardList size={16}/> 匯入股票庫存
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleTransactionFileChange} accept=".csv" className="hidden" />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud size={16}/> 匯入交易紀錄
                    </Button>
                    <Button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-violet-600 to-primary shadow-lg shadow-violet-500/20">
                        <PlusCircle size={16}/> 新增持股
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('OVERVIEW')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'OVERVIEW' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}>庫存總覽</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'HISTORY' ? 'text-white border-primary' : 'text-slate-400 border-transparent hover:text-white'}`}>交易紀錄與分析</button>
                </div>
                <div className="relative">
                    <Button onClick={() => onEnrichData()} variant="secondary" disabled={isEnriching || !hasApiKey} loading={isEnriching} className="h-8 text-xs">
                        <BrainCircuit size={14}/> 
                        {enrichProgress ? `AI 查詢中... (${enrichProgress.current}/${enrichProgress.total})` : 'AI 更新庫存'}
                    </Button>
                    {isAnyStockStale && !isEnriching && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </div>
            </div>

            {activeTab === 'OVERVIEW' ? (
                <div className="space-y-6">
                    {isEnriching ? <InvestmentChartSkeleton /> : (
                        <InvestmentChart 
                            history={stockHistory} 
                            allocationData={allocationData} 
                            chartType={chartType}
                            onSetChartType={setChartType}
                        />
                    )}
                    
                    {isEnriching ? <InvestmentStatsSkeleton /> : (
                        <InvestmentStats stats={stats} isDataStale={isAnyStockStale} />
                    )}
                    
                    {isEnriching ? <StockInventoryListSkeleton /> : (
                        <StockInventoryList 
                            inventory={inventory}
                            totalMarketValue={stats.totalMarketValue}
                            onEdit={handleOpenModal}
                            onDelete={onDelete}
                            enrichingIds={enrichingIds}
                            onEnrichSingle={(id) => onEnrichData([id])}
                        />
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <TransactionFilters
                        filter={filter}
                        setFilter={setFilter}
                        timeRange={timeRange}
                        setTimeRange={setTimeRange}
                        dateRangeLabel={dateRangeLabel}
                        customStart={customStart}
                        setCustomStart={setCustomStart}
                        customEnd={customEnd}
                        setCustomEnd={setCustomEnd}
                    />
                    <TransactionAnalysisView 
                        transactions={filteredStockTransactions}
                        stockNameMap={stockNameMap}
                    />
                </div>
            )}

            <InvestmentInputModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingAsset(null); }}
                onSave={handleSaveAsset}
                editingAsset={editingAsset}
            />
        </div>
    );
};
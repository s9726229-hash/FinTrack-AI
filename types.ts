
export enum Currency {
  TWD = 'TWD',
  USD = 'USD',
  JPY = 'JPY',
  CNY = 'CNY',
  EUR = 'EUR',
  AUD = 'AUD',
}

export enum AssetType {
  CASH = 'CASH',
  STOCK = 'STOCK',
  FUND = 'FUND',
  REAL_ESTATE = 'REAL_ESTATE',
  CRYPTO = 'CRYPTO',
  DEBT = 'DEBT',
  OTHER = 'OTHER',
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  amount: number; // TWD Equivalent Value
  originalAmount?: number; // Value in original currency
  currency: Currency;
  exchangeRate: number; // To TWD
  lastUpdated: number; // Timestamp
  // Debt specific
  startDate?: string; // YYYY-MM-DD (New V5.2)
  interestRate?: number;
  termYears?: number;
  paidYears?: number; // Deprecated in favor of startDate calculation, but kept for compatibility
  interestOnlyPeriod?: number; // Grace period in years (New V5.2)
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  item: string;
  note?: string;
  type: 'EXPENSE' | 'INCOME';
  invoiceId?: string; // 電子發票號碼
  source?: 'MANUAL' | 'CSV' | 'AI_STOCK'; // 資料來源
}

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: 'EXPENSE' | 'INCOME';
  frequency: 'MONTHLY' | 'YEARLY';
  dayOfMonth: number; // 1-31
  monthOfYear?: number; // 1-12, for YEARLY
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetDistribution: Record<AssetType, number>;
}

// --- V5.0 New Types ---
export interface StockPosition {
  symbol: string;     // e.g., 2330
  name: string;       // e.g., 台積電
  shares: number;     // 股數
  cost: number;       // 平均成本
  currentPrice: number; // 現價
  marketValue: number;  // 市值
  unrealizedPL: number; // 未實現損益
  returnRate: number;   // 報酬率 %
  // V5.1 Dividend Info
  dividendYield?: number;
  dividendAmount?: number;
  dividendFrequency?: string;
}

export interface StockSnapshot {
  id: string;
  date: string;       // YYYY-MM-DD
  timestamp: number;
  totalMarketValue: number;
  totalUnrealizedPL: number;
  positions: StockPosition[];
}
// ---------------------

// --- V5.2 AI Report Types ---
export interface AIReportData {
  healthScore: number;
  // healthComment: string; // Removed per user request, merged into summary
  cashFlowForecast: {
    yearLabel: string; // e.g., "2025 (目前)", "2028 (寬限期後)"
    monthlyFixedCost: number; // 預估每月固定支出
    monthlyIncome: number; // 預估總收入
    debtToIncomeRatio: number; // (支出/收入) * 100
    isGracePeriodEnded: boolean;
  }[];
  debtAnalysis: {
    name: string;
    status: string; // e.g. "寬限期中 - 剩餘 18 個月"
    suggestion: string;
  }[];
  investmentSuggestions: {
    action: 'KEEP' | 'SELL' | 'BUY';
    target: string; // Stock name
    reason: string;
  }[];
  summary: string;
}
// ---------------------------

export interface LocalStorageData {
  ft_assets: Asset[];
  ft_transactions: Transaction[];
  ft_recurring: RecurringItem[];
  ft_recurring_executed: Record<string, string[]>; // itemId -> [YYYY-MM, ...]
  ft_portfolio_history: PortfolioSnapshot[];
  ft_stock_snapshots: StockSnapshot[]; // New in V5.0
  ft_api_key: string; // Restored in V5.1
}

export type ViewState = 'DASHBOARD' | 'ASSETS' | 'TRANSACTIONS' | 'RECURRING' | 'INVESTMENTS' | 'HISTORY' | 'SETTINGS';


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
  source?: 'MANUAL' | 'AI_VOICE'; // 資料來源 (Removed unused CSV/AI_STOCK)
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

// --- V5.2 Budget Feature ---
export interface BudgetConfig {
  category: string;
  limit: number;
}
// --------------------------

export interface PurchaseAssessment {
  score: number; // 0-100 (100 is safe)
  status: 'SAFE' | 'WARNING' | 'DANGER';
  analysis: string;
  impactOnCashFlow: string;
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetDistribution: Record<AssetType, number>;
}

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

export interface AIReportData {
  healthScore: number;
  cashFlowForecast: {
    yearLabel: string;
    monthlyFixedCost: number;
    monthlyIncome: number;
    debtToIncomeRatio: number;
    isGracePeriodEnded: boolean;
  }[];
  debtAnalysis: {
    name: string;
    status: string;
    suggestion: string;
  }[];
  investmentSuggestions: {
    action: 'KEEP' | 'SELL' | 'BUY';
    target: string;
    reason: string;
  }[];
  summary: string;
}

export interface GoogleSyncConfig {
    clientId: string;
    lastSynced?: number;
}

export interface LocalStorageData {
  ft_assets: Asset[];
  ft_transactions: Transaction[];
  ft_recurring: RecurringItem[];
  ft_recurring_executed: Record<string, string[]>;
  ft_portfolio_history: PortfolioSnapshot[];
  ft_stock_snapshots: StockSnapshot[];
  ft_budgets: BudgetConfig[]; // New V5.2
  ft_api_key: string;
  ft_google_client_id: string; // New Cloud Sync
}

export type ViewState = 'DASHBOARD' | 'ASSETS' | 'TRANSACTIONS' | 'RECURRING' | 'INVESTMENTS' | 'BUDGET' | 'HISTORY' | 'SETTINGS';

// --- Web Speech API Types ---
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

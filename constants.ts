
export const STORAGE_KEYS = {
  ASSETS: 'ft_assets',
  TRANSACTIONS: 'ft_transactions',
  RECURRING: 'ft_recurring',
  RECURRING_EXECUTED: 'ft_recurring_executed',
  HISTORY: 'ft_portfolio_history',
  STOCK_SNAPSHOTS: 'ft_stock_snapshots',
  BUDGETS: 'ft_budgets', // New V5.2
};

export const EXCHANGE_RATES_DEFAULT = {
  TWD: 1,
  USD: 32.5,
  JPY: 0.21,
};

export const EXPENSE_CATEGORIES = [
  '餐飲', '交通', '娛樂', '購物', '居住', '帳單', '醫療', '教育', '家庭', '投資', '其他'
];

export const INCOME_CATEGORIES = [
  '薪資', '獎金', '股息', '兼職', '投資', '其他'
];

export const ASSET_TYPE_COLORS: Record<string, string> = {
  CASH: '#10b981', // Emerald
  STOCK: '#8b5cf6', // Violet
  FUND: '#ec4899', // Pink
  REAL_ESTATE: '#06b6d4', // Cyan
  CRYPTO: '#f59e0b', // Amber
  DEBT: '#ef4444', // Red
  OTHER: '#64748b', // Slate
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  CASH: '現金',
  STOCK: '股票',
  FUND: '基金',
  REAL_ESTATE: '房地產',
  CRYPTO: '加密貨幣',
  DEBT: '負債',
  OTHER: '其他',
};

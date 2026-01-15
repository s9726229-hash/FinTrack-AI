
import { STORAGE_KEYS } from '../constants';
import { Asset, Transaction, RecurringItem, PortfolioSnapshot, StockSnapshot } from '../types';

export const getAssets = (): Asset[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
  return data ? JSON.parse(data) : [];
};

export const saveAssets = (assets: Asset[]) => {
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const getRecurring = (): RecurringItem[] => {
  const data = localStorage.getItem(STORAGE_KEYS.RECURRING);
  return data ? JSON.parse(data) : [];
};

export const saveRecurring = (items: RecurringItem[]) => {
  localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(items));
};

export const getRecurringExecuted = (): Record<string, string[]> => {
  const data = localStorage.getItem(STORAGE_KEYS.RECURRING_EXECUTED);
  return data ? JSON.parse(data) : {};
};

export const saveRecurringExecuted = (data: Record<string, string[]>) => {
  localStorage.setItem(STORAGE_KEYS.RECURRING_EXECUTED, JSON.stringify(data));
};

export const getHistory = (): PortfolioSnapshot[] => {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
};

export const saveHistory = (history: PortfolioSnapshot[]) => {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

// --- V5.0 Stock Snapshots ---
export const getStockSnapshots = (): StockSnapshot[] => {
  const data = localStorage.getItem(STORAGE_KEYS.STOCK_SNAPSHOTS);
  return data ? JSON.parse(data) : [];
};

export const saveStockSnapshots = (snapshots: StockSnapshot[]) => {
  localStorage.setItem(STORAGE_KEYS.STOCK_SNAPSHOTS, JSON.stringify(snapshots));
};
// ---------------------------

// --- V5.1 API Key Management ---
export const getApiKey = (): string => {
    return localStorage.getItem('ft_api_key') || '';
};

export const saveApiKey = (key: string) => {
    localStorage.setItem('ft_api_key', key);
};
// ---------------------------

export const exportData = () => {
  const data = {
    [STORAGE_KEYS.ASSETS]: getAssets(),
    [STORAGE_KEYS.TRANSACTIONS]: getTransactions(),
    [STORAGE_KEYS.RECURRING]: getRecurring(),
    [STORAGE_KEYS.RECURRING_EXECUTED]: getRecurringExecuted(),
    [STORAGE_KEYS.HISTORY]: getHistory(),
    [STORAGE_KEYS.STOCK_SNAPSHOTS]: getStockSnapshots(),
    'ft_api_key': getApiKey(), // Include API Key in backup for convenience
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fintrack_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
};

export const importData = (jsonData: string) => {
  try {
    const data = JSON.parse(jsonData);
    if (data[STORAGE_KEYS.ASSETS]) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(data[STORAGE_KEYS.ASSETS]));
    if (data[STORAGE_KEYS.TRANSACTIONS]) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data[STORAGE_KEYS.TRANSACTIONS]));
    if (data[STORAGE_KEYS.RECURRING]) localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(data[STORAGE_KEYS.RECURRING]));
    if (data[STORAGE_KEYS.RECURRING_EXECUTED]) localStorage.setItem(STORAGE_KEYS.RECURRING_EXECUTED, JSON.stringify(data[STORAGE_KEYS.RECURRING_EXECUTED]));
    if (data[STORAGE_KEYS.HISTORY]) localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data[STORAGE_KEYS.HISTORY]));
    if (data[STORAGE_KEYS.STOCK_SNAPSHOTS]) localStorage.setItem(STORAGE_KEYS.STOCK_SNAPSHOTS, JSON.stringify(data[STORAGE_KEYS.STOCK_SNAPSHOTS]));
    if (data['ft_api_key']) localStorage.setItem('ft_api_key', data['ft_api_key']);
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};

export const clearAllData = () => {
  localStorage.clear();
};

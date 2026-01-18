
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, StockPosition, RecurringItem, AssetType, AIReportData, Asset, StockSnapshot, PurchaseAssessment, BudgetConfig } from "../types";
import { getApiKey } from "./storage";
import { EXPENSE_CATEGORIES } from '../constants';

// Helper to get AI instance dynamically with the latest key
const getAI = () => {
    // Vite exposes env variables via import.meta.env
    const key = import.meta.env.VITE_API_KEY || getApiKey();
    if (!key) {
        console.warn("API Key is missing. You can set it in Settings or via a VITE_API_KEY environment variable for local development.");
    }
    // Prevent crash if key is missing during initialization
    return new GoogleGenAI({ apiKey: key || 'dummy_key_to_prevent_crash' });
};

/**
 * Verifies if a given Gemini API key is valid by making a small test request.
 * @param key The API key to verify.
 * @returns A boolean indicating if the key is valid.
 */
export const verifyApiKey = async (key: string): Promise<boolean> => {
  if (!key) return false;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    // Use a simple, fast, and cheap model for the verification request.
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'test',
    });
    return true;
  } catch (error) {
    console.error("API Key verification failed:", error);
    return false;
  }
};


// Helper: Clean JSON string (remove markdown code blocks)
const cleanJsonString = (text: string | undefined | null): string => {
    if (!text) return "[]";
    // Remove ```json and ``` wrapping if present
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Occasionally models output "Here is the JSON:" prefix, try to find the first [ or {
    const firstBracket = cleaned.indexOf('[');
    const firstBrace = cleaned.indexOf('{');
    
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        cleaned = cleaned.substring(firstBracket);
        const lastBracket = cleaned.lastIndexOf(']');
        if (lastBracket !== -1) cleaned = cleaned.substring(0, lastBracket + 1);
    } else if (firstBrace !== -1) {
        cleaned = cleaned.substring(firstBrace);
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace !== -1) cleaned = cleaned.substring(0, lastBrace + 1);
    }
    
    return cleaned;
};

/**
 * 分析語音或文字輸入的交易資訊
 */
export const parseTransactionInput = async (input: string): Promise<Partial<Transaction> | null> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Extract transaction details from this text into JSON.
        Current Date: ${new Date().toISOString().split('T')[0]}
        Text: "${input}"
        Fields: date (YYYY-MM-DD), amount (number), category (Traditional Chinese), item (Traditional Chinese), type (EXPENSE or INCOME).
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            item: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['EXPENSE', 'INCOME'] }
          },
          required: ['date', 'amount', 'category', 'item', 'type']
        }
      }
    });

    const cleaned = cleanJsonString(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

/**
 * Determines the most likely expense category for a transaction based on store name and items.
 */
export const categorizeExpense = async (storeName: string, items: string[]): Promise<string> => {
    const defaultCategory = '購物';
    try {
        const ai = getAI();
        const context = `${storeName} - ${items.slice(0, 3).join(', ')}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                Based on the store name and item description, determine the most appropriate expense category.
                Please choose ONLY ONE category from the following list: [${EXPENSE_CATEGORIES.join(', ')}].
                Return only the category name as a single string.

                Context: "${context}"
            `,
        });

        const category = response.text?.trim();

        if (category && EXPENSE_CATEGORIES.includes(category)) {
            return category;
        }
        
        return defaultCategory; 

    } catch (error) {
        console.error("Gemini Categorization Error:", error);
        return defaultCategory;
    }
};


/**
 * 財務壓力測試與建議報告
 */
export const generateFinancialReport = async (
  assets: Asset[],
  transactions: Transaction[],
  stocks: StockPosition[],
  recurring: RecurringItem[] = []
): Promise<AIReportData | null> => {
  try {
    const ai = getAI();
    
    // Prepare Data Context (Optimized size)
    const recentExpenses = transactions
        .filter(t => t.type === 'EXPENSE')
        .slice(0, 15)
        .map(t => ({ i: t.item, a: t.amount, c: t.category })); // Minify keys

    const context = {
      assetsSummary: {
          total: assets.reduce((sum, a) => a.type !== 'DEBT' ? sum + a.amount : sum, 0),
          debt: assets.reduce((sum, a) => a.type === 'DEBT' ? sum + a.amount : sum, 0),
          cash: assets.filter(a => a.type === 'CASH').reduce((sum, a) => sum + a.amount, 0)
      },
      holdings: stocks.slice(0, 8).map(s => ({ n: s.name, v: s.marketValue, pl: s.unrealizedPL })),
      debts: assets.filter(a => a.type === 'DEBT').map(a => ({ n: a.name, amt: a.amount })),
      recurring: recurring.map(r => ({ n: r.name, amt: r.amount, type: r.type, freq: r.frequency })),
      recentExpenses
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `身為財務精算師，請根據以下資料進行壓力測試(DTI/現金流)與理財建議：${JSON.stringify(context)}。`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER, description: "0-100 score" },
            cashFlowForecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                    yearLabel: { type: Type.STRING },
                    monthlyFixedCost: { type: Type.NUMBER },
                    monthlyIncome: { type: Type.NUMBER },
                    debtToIncomeRatio: { type: Type.NUMBER },
                    isGracePeriodEnded: { type: Type.BOOLEAN },
                },
                required: ['yearLabel', 'debtToIncomeRatio']
              }
            },
            debtAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                     name: { type: Type.STRING },
                     status: { type: Type.STRING },
                     suggestion: { type: Type.STRING },
                },
                required: ['name', 'status', 'suggestion']
              }
            },
            investmentSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                     action: { type: Type.STRING, enum: ['KEEP', 'SELL', 'BUY'] },
                     target: { type: Type.STRING },
                     reason: { type: Type.STRING },
                },
                required: ['action', 'target', 'reason']
              }
            },
            summary: { type: Type.STRING },
          },
          required: ['healthScore', 'cashFlowForecast', 'debtAnalysis', 'investmentSuggestions', 'summary']
        }
      }
    });

    const cleaned = cleanJsonString(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Report Error", error);
    return null;
  }
};

// 其他功能簡化調用
export const analyzeRecurringHealth = async (items: RecurringItem[]): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `分析這些固定收支的健康狀況並提供繁體中文建議：${JSON.stringify(items)}`
  });
  return response.text || "";
};

export const analyzeLargeExpenses = async (transactions: Transaction[]): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `分析大額支出並提供節流建議：${JSON.stringify(transactions)}`
  });
  return response.text || "";
};

export const evaluatePurchase = async (ctx: any, scenario: string): Promise<PurchaseAssessment | null> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `評估購買行為。情境：${scenario}。背景：${JSON.stringify(ctx)}`,
    config: { responseMimeType: "application/json" }
  });
  const cleaned = cleanJsonString(response.text);
  return JSON.parse(cleaned);
};

/**
 * 根據支出歷史、固定收支與目前預算建議月預算上限
 */
export const generateBudgetSuggestions = async (transactions: Transaction[], recurring: RecurringItem[], budgets: BudgetConfig[]): Promise<BudgetConfig[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `根據以下支出紀錄、固定收支以及現有預算設定，建議各類別的月預算上限。
        支出紀錄摘要: ${JSON.stringify(transactions.slice(-50))}
        固定收支: ${JSON.stringify(recurring)}
        目前預算: ${JSON.stringify(budgets)}
        請回傳 JSON 陣列，包含 category (繁體中文) 與 limit (數字)。`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        limit: { type: Type.NUMBER }
                    },
                    required: ['category', 'limit']
                }
            }
        }
    });
    const cleaned = cleanJsonString(response.text);
    return JSON.parse(cleaned);
};

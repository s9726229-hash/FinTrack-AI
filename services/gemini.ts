
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, StockPosition, RecurringItem, AssetType, AIReportData, Asset, StockSnapshot, PurchaseAssessment, BudgetConfig } from "../types";
import { getApiKey } from "./storage";

// Helper to get AI instance dynamically with the latest key
const getAI = () => {
    const key = process.env.API_KEY || getApiKey();
    if (!key) {
        console.warn("API Key is missing. Please set it in Settings.");
        // We still return an instance, but calls will fail if key is invalid
        // Handle this gracefully in UI
    }
    return new GoogleGenAI({ apiKey: key || 'dummy_key_to_prevent_crash' });
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

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

/**
 * 股票庫存截圖分析 (支援多券商通用佈局)
 */
export const analyzeStockInventory = async (base64Data: string, mimeType: string = 'image/png'): Promise<StockPosition[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "提取台灣股票庫存資料。輸出欄位：symbol(代號), name(名稱), shares(股數), cost(成本), currentPrice(現價), marketValue(市值), unrealizedPL(損益), returnRate(報酬率%)。請支援通用券商格式，若無法辨識請填 0。" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              shares: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              currentPrice: { type: Type.NUMBER },
              marketValue: { type: Type.NUMBER },
              unrealizedPL: { type: Type.NUMBER },
              returnRate: { type: Type.NUMBER }
            },
            required: ['symbol', 'name', 'shares', 'marketValue']
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Vision Error:", error);
    return [];
  }
};

/**
 * 聯網搜尋股利資訊
 */
export const enrichStockDataWithDividends = async (positions: StockPosition[]): Promise<StockPosition[]> => {
  if (positions.length === 0) return positions;
  try {
    const ai = getAI();
    const symbols = positions.map(p => `${p.symbol} ${p.name}`).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `搜尋並回傳 JSON 格式的台灣股票股利資訊：${symbols}。包含 symbol, dividendAmount, dividendYield(%), dividendFrequency。`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "[]";
    const dividendData = JSON.parse(text.match(/\[.*\]/s)?.[0] || "[]");

    return positions.map(p => {
      const info = dividendData.find((d: any) => d.symbol?.includes(p.symbol));
      return info ? { ...p, dividendAmount: info.dividendAmount, dividendYield: info.dividendYield, dividendFrequency: info.dividendFrequency } : p;
    });
  } catch (error) {
    return positions;
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
    const context = {
      assets: assets.map(a => ({ name: a.name, amount: a.amount, type: a.type })),
      recurring: recurring.map(r => ({ name: r.name, amount: r.amount, type: r.type, freq: r.frequency }))
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `身為財務精算師，請根據以下資料進行壓力測試與理財建議：${JSON.stringify(context)}。請嚴格遵守 JSON 回傳格式。`,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
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
  return JSON.parse(response.text || "null");
};

export const analyzeStockRealizedPL = async (base64Data: string, mimeType: string): Promise<Transaction[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: "識別截圖中的已實現損益。回傳 Transaction 陣列 JSON。" }
            ]
        },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
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
    return JSON.parse(response.text || "[]");
};


import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, StockPosition, RecurringItem, AssetType, AIReportData, Asset, StockSnapshot, PurchaseAssessment, BudgetConfig } from "../types";
import { getApiKey } from "./storage";
import { EXPENSE_CATEGORIES } from '../constants';

// Helper to get AI instance dynamically with the latest key
const getAI = () => {
    // For premium models like gemini-3-pro-image-preview, the key might come from window.aistudio
    // but process.env.API_KEY is the standard access method after selection.
    // The local storage key is a fallback for other models.
    const key = process.env.API_KEY || getApiKey();
    if (!key) {
        console.warn("API Key is missing. Please set it in Settings or via the premium model flow.");
    }
    // A dummy key is provided to prevent the SDK from crashing if no key is available at initialization.
    // The actual API call will fail later if the key is still missing, which is handled.
    return new GoogleGenAI({ apiKey: key || 'dummy_key_to_prevent_crash' });
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
 * New V5.7: Analyzes a stock portfolio screenshot.
 */
export const parseStockScreenshot = async (base64Image: string): Promise<Partial<StockPosition>[]> => {
    try {
        const ai = getAI();

        const imagePart = {
            inlineData: {
                mimeType: 'image/png',
                data: base64Image
            }
        };

        const textPart = {
            text: `你是一位頂尖的金融數據AI助理，專門從圖片中精準擷取台灣股市的持股資料。請分析這張券商庫存的截圖。

**任務指示：**

1.  **辨識持股區塊**：圖片中每一檔股票的資訊都由連續的 **兩列** 組成。
2.  **擷取關鍵欄位**：
    *   **股票名稱 (\`name\`)**：位於第一列的「名稱」欄位。
    *   **目前市價 (\`currentPrice\`)**：位於第一列的「市價/均價」欄位。
    *   **持有股數 (\`shares\`)**：位於第一列的「股數/可下單數」欄位。
    *   **平均成本 (\`cost\`)**：位於 **第二列** 的「市價/均價」欄位。
3.  **推斷股票代號 (\`symbol\`)**：
    *   根據股票名稱推斷其上市代號。這是 **非常重要** 的一步。
    *   範例：
        *   "元大台灣50" -> "0050"
        *   "元大高股息" -> "0056"
        *   "國泰永續高股息" -> "00878"
        *   "富邦科技" -> "0052"
        *   "聯電" -> "2303"
        *   "華城" -> "1519"
    *   如果真的無法推斷，請留空字串 \`""\`。
4.  **格式化輸出**：將擷取到的每一筆持股資料，轉換成一個 JSON 物件，最後將所有物件組成一個 JSON 陣列。

**輸出範例：**
對於「富邦科技」，你會在圖片中看到：
- 第一列：名稱="富邦科技", 市價=42.07, 股數=3,000
- 第二列：均價=35.52
擷取結果應為：
\`{ "name": "富邦科技", "symbol": "0052", "shares": 3000, "cost": 35.52, "currentPrice": 42.07 }\`

**最終要求：**
請 **只回傳** 最終的 JSON 陣列，不要包含任何 \`json\` 標籤、註解或其他非 JSON 格式的文字。
`
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [textPart, imagePart] },
            config: {
                temperature: 0.1
            }
        });
        
        const cleaned = cleanJsonString(response.text);
        return JSON.parse(cleaned);

    } catch (error) {
        console.error("Gemini Stock Screenshot Error:", error);
        return [];
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


import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, StockPosition, RecurringItem, AssetType, AIReportData, Asset, StockSnapshot, PurchaseAssessment, BudgetConfig } from "../types";
import { getApiKey } from "./storage";

// Helper to get AI instance dynamically with the latest key
const getAI = () => {
    const key = process.env.API_KEY || getApiKey();
    if (!key) {
        console.warn("API Key is missing. Please set it in Settings.");
    }
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

// Common Safety Settings to prevent OCR blocking
// 使用字串字面量而非 Enum，確保在所有環境 (含 GitHub Pages) 都能正確傳遞參數
const VISION_SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
] as any;

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
          { text: `
            分析這張台灣證券 App 的庫存截圖 (深色模式)。
            資料通常呈現列表狀，每一列包含：名稱(Name), 股數(Shares), 均價/成本(Cost), 市價(Current Price), 市值(Market Value), 損益(Unrealized P/L)。

            請提取並輸出 JSON 陣列，每個物件包含：
            - symbol: 股票代號 (若無顯示，請嘗試根據股名推測，例如 '台積電' -> '2330'，若無法推測則留空)
            - name: 股票名稱 (例如：元大台灣50、富邦科技)
            - shares: 股數 (數字，請移除逗號，例如 '2,616' -> 2616)
            - cost: 平均成本 (數字)
            - currentPrice: 現價 (數字)
            - marketValue: 市值 (數字，移除逗號)
            - unrealizedPL: 試算損益 (數字，移除逗號。注意：台灣股市中，紅色通常代表獲利/正值，綠色代表虧損/負值。若有負號也請保留)
            - returnRate: 報酬率 (數字，不含 % 符號)

            若欄位無法辨識，請填 0。請忽略匯總行 (如：總庫存、總市值)。
          ` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        safetySettings: VISION_SAFETY_SETTINGS,
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
            required: ['name', 'shares', 'marketValue']
          }
        }
      }
    });

    console.debug("Gemini Vision Response (Inventory):", response.text);
    const cleaned = cleanJsonString(response.text);
    return JSON.parse(cleaned);
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
    // 取前 5 檔股票搜尋即可，避免 Prompt 過長
    const symbols = positions.slice(0, 5).map(p => `${p.symbol} ${p.name}`).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `搜尋並回傳 JSON 格式的台灣股票股利資訊：${symbols}。包含 symbol, dividendAmount (現金股利), dividendYield (殖利率%), dividendFrequency (配息頻率，如：年配、季配)。`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "[]";
    const cleaned = cleanJsonString(text);
    
    let dividendData: any[] = [];
    try {
        dividendData = JSON.parse(cleaned);
        if (!Array.isArray(dividendData)) dividendData = [];
    } catch (e) {
        console.warn("Dividend parse failed");
    }

    return positions.map(p => {
      const info = dividendData.find((d: any) => (d.symbol && p.symbol && d.symbol.includes(p.symbol)) || (d.symbol && p.name && d.symbol.includes(p.name)));
      return info ? { ...p, dividendAmount: info.dividendAmount, dividendYield: info.dividendYield, dividendFrequency: info.dividendFrequency } : p;
    });
  } catch (error) {
    console.warn("Dividend enrichment failed, returning original data", error);
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

    const cleaned = cleanJsonString(response.text);
    return JSON.parse(cleaned);
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
  const cleaned = cleanJsonString(response.text);
  return JSON.parse(cleaned);
};

export const analyzeStockRealizedPL = async (base64Data: string, mimeType: string): Promise<Transaction[]> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: `
                        分析這張台灣股市 App 的「已實現損益」明細截圖。
                        
                        目標：提取每一筆有「損益金額」的交易。
                        邏輯規則：
                        1. 忽略單純「買進」但沒有已實現損益的紀錄 (該欄位可能顯示 --)。
                        2. 專注於「賣出」或「現沖」等產生損益的行為。
                        3. 台灣股市顏色慣例：紅色為獲利 (Profit/Positive)，綠色為虧損 (Loss/Negative)。
                        
                        請回傳 JSON 陣列 (Transaction Object)：
                        - date: 日期，格式 YYYY-MM-DD (截圖中可能是 2026/01/02，請照實提取)。
                        - item: 股票名稱 + 交易動作 (例如：台新永續高息中小 普通賣出)。
                        - category: 固定填入 "投資"。
                        - type: 若損益為獲利(紅字/正數)則填 "INCOME"，若為虧損(綠字/負數)則填 "EXPENSE"。
                        - amount: 取損益金額的「絕對值」 (數字，移除逗號)。

                        例如：看到 "普通賣出 ... -3,712 (綠字)"，應轉換為 { "amount": 3712, "type": "EXPENSE" }。
                        例如：看到 "普通賣出 ... 1,238 (紅字)"，應轉換為 { "amount": 1238, "type": "INCOME" }。
                    ` }
                ]
            },
            config: { 
                responseMimeType: "application/json",
                safetySettings: VISION_SAFETY_SETTINGS,
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
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
            }
        });
        
        console.debug("Gemini Vision Response (PL):", response.text);
        const cleaned = cleanJsonString(response.text);
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("Analyze PL Error", error);
        return [];
    }
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

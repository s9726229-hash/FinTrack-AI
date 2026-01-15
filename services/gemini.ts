
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Transaction, StockPosition, RecurringItem, AssetType, AIReportData, StockSnapshot } from "../types";
import { getApiKey } from "./storage";

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for image
const fileToGenerativePart = async (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
};

// Global Error Handler for Missing Key
const handleAIError = (error: any) => {
    console.error("AI Error:", error);
    if (error.message === "API_KEY_MISSING") {
        alert("⚠️ 未檢測到 API Key\n\n請前往「系統設定」頁面輸入您的 Google Gemini API Key 以啟用 AI 智慧分析功能。");
    }
    return null; // Return null to indicate failure
};

export const parseTransactionInput = async (input: string): Promise<Partial<Transaction> | null> => {
  try {
    const ai = getAI();
    const prompt = `
      Extract transaction details from this text into JSON.
      Current Date: ${new Date().toISOString().split('T')[0]}
      Text: "${input}"
      
      Fields required:
      - date (YYYY-MM-DD), default to today if not specified.
      - amount (number)
      - category (string) - infer from standard categories like Food(餐飲), Transport(交通), Bills(帳單), etc. Use Traditional Chinese for category.
      - item (string) - brief description in Traditional Chinese.
      - type (EXPENSE or INCOME)
      
      Return ONLY valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error: any) {
    return handleAIError(error);
  }
};

export const batchAnalyzeInvoiceCategories = async (items: string[]): Promise<Record<string, string>> => {
  try {
    const ai = getAI();
    const prompt = `
      你是一個財務專家。請分析以下消費項目列表，並為每個項目分配一個最合適的分類（類別必須從以下選取：餐飲、交通、娛樂、購物、居住、帳單、醫療、教育、投資、其他）。
      
      消費項目列表：
      ${items.join('\n')}
      
      請回傳 JSON 物件，Key 為消費項目名稱，Value 為分類名稱（繁體中文）。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    return JSON.parse(text || "{}");
  } catch (error) {
     // For batch operations, we might want to return empty object instead of null to prevent breaking map functions
     handleAIError(error); 
     return {};
  }
};

// --- V5.0 Investment Features ---

export const analyzeStockInventory = async (base64Image: string): Promise<StockPosition[]> => {
    try {
        const ai = getAI();
        const imagePart = await fileToGenerativePart(base64Image, 'image/png'); // Assuming PNG/JPEG handled by calling code
        const prompt = `
            Analyze this stock inventory screenshot (likely from a Taiwan brokerage app like Yuanta).
            Extract the following data for each stock row:
            - symbol (e.g., 2330, 0050)
            - name (Stock Name in Traditional Chinese)
            - shares (Inventory quantity / 股數)
            - cost (Average cost per share / 平均成本)
            - currentPrice (Current market price / 現價)
            - marketValue (Total market value / 市值)
            - unrealizedPL (Unrealized Profit/Loss / 未實現損益)
            - returnRate (Return rate % / 報酬率)

            Clean up numbers (remove commas, 'NT$', etc.).
            Return a JSON array of objects.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Use Pro for better vision analysis
            contents: {
                parts: [imagePart, { text: prompt }]
            },
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || "[]");
    } catch (e) {
        handleAIError(e);
        return [];
    }
};

export const enrichStockDataWithDividends = async (positions: StockPosition[]): Promise<StockPosition[]> => {
    if (positions.length === 0) return positions;
    
    try {
        const ai = getAI();
        // Create a summary list for the prompt to save tokens and be specific
        const symbols = positions.map(p => `${p.symbol} ${p.name}`).join(', ');
        
        const prompt = `
            Please search for the latest dividend information (2024-2025) for the following Taiwan stocks: ${symbols}.
            
            For each stock, find:
            1. Latest Cash Dividend Amount (現金股利)
            2. Dividend Yield % (殖利率, based on latest price)
            3. Dividend Frequency (配息頻率 e.g. 季配, 年配, 半年配)

            Return a JSON array of objects. Each object should have:
            - "symbol" (string, matching input)
            - "dividendAmount" (number, or null if not found)
            - "dividendYield" (number, percentage e.g. 4.5, or null)
            - "dividendFrequency" (string, e.g. "年配", "季配", or null)

            IMPORTANT: Wrap the JSON output in a code block like \`\`\`json ... \`\`\`.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Must use Pro for search tools
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "";
        
        // Extract JSON from markdown code block
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        let dividendData: any[] = [];
        
        if (jsonMatch) {
            try {
                dividendData = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.error("Failed to parse dividend JSON", e);
            }
        } else {
             // Fallback: Try to parse the whole text if it looks like JSON
             try {
                 dividendData = JSON.parse(text);
             } catch (e) {
                 console.error("Failed to parse dividend text directly", e);
             }
        }

        // Merge data back into positions
        return positions.map(p => {
            const info = dividendData.find((d: any) => d.symbol.includes(p.symbol) || p.symbol.includes(d.symbol));
            if (info) {
                return {
                    ...p,
                    dividendAmount: info.dividendAmount,
                    dividendYield: info.dividendYield,
                    dividendFrequency: info.dividendFrequency
                };
            }
            return p;
        });

    } catch (e) {
        handleAIError(e);
        // Return original positions if search fails (graceful degradation)
        return positions;
    }
};

export const analyzeStockRealizedPL = async (base64Image: string): Promise<Transaction[]> => {
    try {
        const ai = getAI();
        const imagePart = await fileToGenerativePart(base64Image, 'image/png');
        const prompt = `
            Analyze this stock transaction history screenshot.
            Identify only "SELL" (賣出) transactions where a profit or loss was realized.
            Do NOT include "BUY" (買進) transactions as expenses.
            
            For each realized gain/loss:
            - Create a Transaction object.
            - date: Transaction date (YYYY-MM-DD). If year is missing, assume ${new Date().getFullYear()}.
            - amount: The absolute value of the Realized Profit or Loss (損益金額).
            - type: 'INCOME' if profit > 0, 'EXPENSE' if profit < 0.
            - category: '投資'
            - item: "[股票損益] " + Stock Name + " (" + Symbol + ")"
            - note: "AI 自動辨識"

            Return a JSON array of Transaction objects.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [imagePart, { text: prompt }]
            },
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || "[]");
    } catch (e) {
        handleAIError(e);
        return [];
    }
};

// ---------------------------

export const generateFinancialReport = async (
  assets: Asset[], 
  transactions: Transaction[],
  stocks: StockPosition[],
  recurring: RecurringItem[] = [] // New Parameter V5.2
): Promise<AIReportData | null> => {
  try {
    const ai = getAI();
    
    // 1. Precise Pre-calculation (Prevent AI Hallucinations)
    let totalAssetsVal = 0;
    let totalLiabilitiesVal = 0;
    
    // Calculate Monthly Income Capability
    let monthlyFixedIncome = 0;
    recurring.forEach(r => {
        if (r.type === 'INCOME') {
            monthlyFixedIncome += (r.frequency === 'YEARLY' ? r.amount / 12 : r.amount);
        }
    });

    // Estimate variable income from transactions (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentIncome = transactions
        .filter(t => t.type === 'INCOME' && new Date(t.date) >= ninetyDaysAgo)
        .reduce((sum, t) => sum + t.amount, 0);
    
    // We don't want to double count if the user manually added recurring items as transactions
    // But for simplicity, let's assume 'transactions' are the source of truth for extra income if not tagged as 'Fixed'.
    // A simple average:
    const avgVariableIncome = Math.round(recentIncome / 3);
    
    // Total Estimated Monthly Capacity
    // If user has no recurring setup, rely solely on transaction history
    const totalEstimatedMonthlyIncome = Math.max(monthlyFixedIncome, avgVariableIncome, monthlyFixedIncome + (avgVariableIncome * 0.5)); 
    // Heuristic: Fixed + 50% of variable (to be conservative) or just max. Let's send both to AI.

    // Filter and map debt assets for the prompt
    const debtDetails = assets
        .filter(a => a.type === AssetType.DEBT)
        .map(a => {
            totalLiabilitiesVal += a.amount;
            return {
                name: a.name,
                amount: a.amount,
                startDate: a.startDate || "Unknown",
                termYears: a.termYears || 20,
                interestRate: a.interestRate || 2,
                gracePeriodYears: a.interestOnlyPeriod || 0
            };
        });

    const assetDetails = assets
        .filter(a => a.type !== AssetType.DEBT)
        .map(a => {
            const val = a.amount * (a.exchangeRate || 1);
            totalAssetsVal += val;
            return { name: a.name, type: a.type, value: val };
        });

    const netWorth = totalAssetsVal - totalLiabilitiesVal;
    
    const prompt = `
      You are an expert Financial Actuary (Traditional Chinese).
      
      **CRITICAL INSTRUCTION**: Use the provided calculated totals below. DO NOT recalculate Total Assets or Net Worth.
      - **Total Assets**: ${totalAssetsVal} TWD
      - **Total Debt**: ${totalLiabilitiesVal} TWD
      - **Net Worth**: ${netWorth} TWD
      
      **Income Profile**:
      - Estimated Monthly Income Capacity: ${totalEstimatedMonthlyIncome} TWD 
        (Based on Fixed: ${monthlyFixedIncome} + Variable Avg: ${avgVariableIncome})
      
      **Debt Data (Use to calculate Future Cash Flow Shocks)**:
      ${JSON.stringify(debtDetails)}
      
      **Stock Portfolio**:
      ${JSON.stringify(stocks.map(s => ({ symbol: s.symbol, name: s.name, marketVal: s.marketValue, pl: s.unrealizedPL, yield: s.dividendYield })))}

      **Task**:
      1. **Health Score**: 0-100 based on Debt Ratio and Asset quality.
      2. **Cash Flow Stress Test (DTI Analysis)**: 
         - Analyze the debt details (especially 'gracePeriodYears' and 'startDate').
         - Forecast the monthly payment jump when grace periods end.
         - Compare the forecasted payment against the 'Estimated Monthly Income Capacity'.
         - Output a forecast array with **Debt-to-Income Ratio (DTI)**.
      3. **Investment Strategy**:
         - Review the Stock Portfolio.
         - Suggest specific actions (KEEP/SELL/BUY) to optimize for the coming debt shocks.
      4. **Summary**: 
         - Integrate the explanation for the Health Score here.
         - Summarize the DTI risk (e.g., "In 2028, debt will consume 70% of your income").

      **Response Format (Strict JSON)**:
      {
        "healthScore": number,
        "healthComment": string (Empty string, merge content into summary),
        "cashFlowForecast": [
          { 
            "yearLabel": string (e.g. "2025 (寬限期)"), 
            "monthlyFixedCost": number (estimated payment), 
            "monthlyIncome": number (use the provided estimated income),
            "debtToIncomeRatio": number (percentage 0-100),
            "isGracePeriodEnded": boolean 
          }
        ],
        "debtAnalysis": [
          { "name": string, "status": string, "suggestion": string }
        ],
        "investmentSuggestions": [
          { "action": "KEEP" | "SELL" | "BUY", "target": string, "reason": string }
        ],
        "summary": string
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AIReportData;

  } catch (error: any) {
    handleAIError(error);
    return null;
  }
};

export const analyzeDeepScan = async (transactions: Transaction[]) => {
    try {
        const ai = getAI();
        const prompt = `
            Analyze these transactions and identify:
            1. The category with the highest total spending ("Money Monster"). Use Traditional Chinese.
            2. The single largest expense transaction.
            
            Transactions: ${JSON.stringify(transactions.slice(0, 100))}

            Return JSON.
        `;
         const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        highestCategory: { type: Type.STRING },
                        highestCategoryAmount: { type: Type.NUMBER },
                        largestTransactionItem: { type: Type.STRING },
                        largestTransactionAmount: { type: Type.NUMBER }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        handleAIError(e);
        return null;
    }
};

export const analyzeRecurringHealth = async (items: RecurringItem[]): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `
            Role: Personal Financial Analyst.
            Analyze these recurring expenses/incomes for the user:
            ${JSON.stringify(items)}

            Task: Provide a brief health check report (in Traditional Chinese) covering:
            1. **Monthly Fixed Cost Burden**: Comment on the ratio of fixed costs.
            2. **Subscription Fatigue**: Identify any potential unnecessary subscriptions (e.g. Netflix, Spotify, Gym).
            3. **Optimization Advice**: Suggest ways to reduce fixed costs.
            
            Format: Markdown. Keep it under 300 words.
        `;
        const response = await ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt
        });
        return response.text || "無法產生報告";
    } catch (e) {
        handleAIError(e);
        return "";
    }
};

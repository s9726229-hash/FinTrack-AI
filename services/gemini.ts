
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Transaction, StockPosition, RecurringItem, AssetType, AIReportData, StockSnapshot, PurchaseAssessment, BudgetConfig } from "../types";
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
      - category (string) - infer from standard categories like Food(餐飲), Transport(交通), Bills(帳單), Family(家庭), etc. Use Traditional Chinese for category.
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
      你是一個財務專家。請分析以下消費項目列表，並為每個項目分配一個最合適的分類（類別必須從以下選取：餐飲、交通、娛樂、購物、居住、帳單、醫療、教育、家庭、投資、其他）。
      注意：「家庭」類別適用於家用雜費、給家人的錢、孝親費等。
      
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
  recurring: RecurringItem[] = []
): Promise<AIReportData | null> => {
  try {
    const ai = getAI();
    
    // 1. Precise Pre-calculation
    let totalAssetsVal = 0;
    let totalLiabilitiesVal = 0;
    
    let monthlyFixedIncome = 0;
    recurring.forEach(r => {
        if (r.type === 'INCOME') {
            monthlyFixedIncome += (r.frequency === 'YEARLY' ? r.amount / 12 : r.amount);
        }
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentIncome = transactions
        .filter(t => t.type === 'INCOME' && new Date(t.date) >= ninetyDaysAgo)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const avgVariableIncome = Math.round(recentIncome / 3);
    const totalEstimatedMonthlyIncome = Math.max(monthlyFixedIncome, avgVariableIncome, monthlyFixedIncome + (avgVariableIncome * 0.5)); 

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

export const analyzeLargeExpenses = async (transactions: Transaction[]): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `
            你是個人的財務教練。請分析這份「大額支出」清單（金額較高或異常的消費）。
            
            清單：
            ${JSON.stringify(transactions.map(t => `${t.date} ${t.item} ($${t.amount}) [${t.category}]`))}
            
            請提供一段簡短的洞察（繁體中文，200字內）：
            1. 這些大額支出是「想要」還是「需要」？
            2. 它們對長期財務目標的潛在影響。
            3. 給出一句省錢建議。
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "";
    } catch (e) {
        handleAIError(e);
        return "";
    }
};

// --- V5.3 Smart Budgeting & Purchase Simulation ---

export const generateBudgetSuggestions = async (
    transactions: Transaction[],
    recurring: RecurringItem[],
    currentBudgets: BudgetConfig[]
): Promise<BudgetConfig[]> => {
    try {
        const ai = getAI();
        
        // Summarize last 3 months spending by category
        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        
        const categoryStats: Record<string, number> = {};
        transactions.forEach(t => {
            if (t.type === 'EXPENSE' && new Date(t.date) >= threeMonthsAgo) {
                categoryStats[t.category] = (categoryStats[t.category] || 0) + t.amount;
            }
        });

        // Calculate Monthly Average
        const monthlyAvg: Record<string, number> = {};
        Object.keys(categoryStats).forEach(cat => {
            monthlyAvg[cat] = Math.round(categoryStats[cat] / 3);
        });

        const prompt = `
            Act as a strict Financial Advisor.
            
            Based on the user's past 3-month Average Spending and Fixed Recurring Expenses, suggest a healthy monthly budget limit for each category.
            
            **Data**:
            - Monthly Average Spend (Variable): ${JSON.stringify(monthlyAvg)}
            - Fixed Recurring Expenses (Monthly): ${JSON.stringify(recurring.filter(r => r.type === 'EXPENSE').map(r => ({ name: r.name, category: r.category, amount: r.amount })))}
            - Current Set Budgets: ${JSON.stringify(currentBudgets)}
            
            **Strategy & Rules**:
            1. **Reference 50/30/20 Rule**: Needs (50%), Wants (30%), Savings (20%).
            2. **Benchmark**: Consider standard cost of living in Taiwan (e.g., Food around 8000-15000 TWD).
            3. **Challenge**: Suggest a limit that is slightly challenging to encourage saving (e.g., 5-10% lower than their average if it seems high), but keep Fixed Expenses fully covered.
            4. **Exclude Investment**: Do not suggest a budget limit for '投資' (Investment).
            
            Return a JSON array of objects: [{ "category": "餐飲", "limit": 12000 }, ...]
            Only return categories that have spending or recurring items.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text || "[]");
    } catch (e) {
        handleAIError(e);
        return [];
    }
};

export const evaluatePurchase = async (
    financialContext: {
        monthlyIncome: number;
        monthlyFixedExpenses: number;
        netWorth: number;
        currentCash: number;
    },
    scenario: string
): Promise<PurchaseAssessment | null> => {
    try {
        const ai = getAI();
        const prompt = `
            User wants to simulate a purchase scenario. Evaluate the financial safety.
            
            Scenario Input: "${scenario}"
            
            User Financial Context:
            - Estimated Monthly Income: ${financialContext.monthlyIncome}
            - Fixed Monthly Expenses (Before this purchase): ${financialContext.monthlyFixedExpenses}
            - Current Liquid Cash: ${financialContext.currentCash}
            - Net Worth: ${financialContext.netWorth}
            
            Task:
            1. Parse the Scenario: Identify total cost, payment method (one-time vs monthly installment), and any split payments (e.g., down payment + loan).
            2. Impact Analysis: Calculate impact on Cash (for down payment/one-time) and Monthly Cash Flow (for installments).
            3. Safety Score: 0-100 (100 = Very Safe).
            4. Status: SAFE, WARNING, or DANGER.
            5. Analysis (Traditional Chinese): Explain *why*. Be specific about risks (e.g., "Down payment consumes 80% of cash").
            
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
                        score: { type: Type.NUMBER },
                        status: { type: Type.STRING, enum: ['SAFE', 'WARNING', 'DANGER'] },
                        analysis: { type: Type.STRING },
                        impactOnCashFlow: { type: Type.STRING }
                    }
                }
            }
        });

        return JSON.parse(response.text || "null");
    } catch (e) {
        handleAIError(e);
        return null;
    }
};

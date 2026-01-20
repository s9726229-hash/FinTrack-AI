import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Currency, StockPerformanceResult, StockTransaction } from "../types";
import { getApiKey, getFeeDiscount } from "./storage";

const cleanJsonString = (text: string) => {
    if (!text) return "{}";
    // 移除 Markdown 標記 ```json 和 ```
    let clean = text.replace(/```json/g, "").replace(/```/g, "");
    return clean.trim();
};

const getAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("API Key is missing.");
    return new GoogleGenAI({ apiKey: key });
};

/**
 * Calculates detailed performance metrics for a single stock asset.
 * Follows precise Taiwanese stock market fee and tax rules.
 */
export const calculateStockPerformance = (stock: Asset): StockPerformanceResult => {
    // 確保數值至少為 0，避免出現 NaN 或 -100% 的慘劇
    const shares = Number(stock.shares) || 0;
    const avgCost = Number(stock.avgCost) || 0;
    const currentPrice = Number(stock.currentPrice) || 0;

    // 增加一個防護：如果沒有買入成本或股數，損益不應計算
    if (shares === 0 || avgCost === 0) {
        return { totalCost: 0, marketValue: 0, estimatedReturn: 0, netProfit: 0, roi: 0, buyFee: 0, sellFee: 0, tax: 0 };
    }
    
    const feeDiscount = getFeeDiscount();
    const feeRate = 0.001425;
    const minFee = 20;

    // Prefer the explicit boolean flag from AI, fallback to symbol check
    const isActuallyEtf = typeof stock.isEtf === 'boolean' ? stock.isEtf : (stock.symbol?.startsWith('00') || false);
    const taxRate = isActuallyEtf ? 0.001 : 0.003;

    // --- Calculation Logic ---
    const calculateFee = (price: number) => {
        const fee = Math.floor(price * shares * feeRate * feeDiscount);
        return fee < minFee ? minFee : fee;
    };

    const buyValue = avgCost * shares;
    const buyFee = calculateFee(avgCost);
    const totalCost = buyValue + buyFee;

    const marketValue = currentPrice * shares;
    const sellFee = calculateFee(currentPrice);
    const tax = Math.floor(marketValue * taxRate);

    const estimatedReturn = marketValue - sellFee - tax;
    const netProfit = estimatedReturn - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    
    return {
        totalCost,
        marketValue,
        estimatedReturn,
        netProfit,
        roi,
        buyFee,
        sellFee,
        tax,
    };
};

/**
 * Enriches a stock symbol with detailed information using the Gemini API.
 * Uses Google Search Grounding to get real-time data.
 */
export const enrichStockData = async (symbol: string): Promise<Partial<Asset> | null> => {
    try {
        const ai = getAI();
        // 使用 Google Search 工具來獲取即時資訊
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are an expert financial data analyst. Your task is to use Google Search to find the most accurate, real-time market data for the Taiwan stock symbol: "${symbol}". The current date is ${new Date().toLocaleDateString('sv-SE')}.

CRITICAL INSTRUCTIONS:
1.  **PRIORITIZE ACCURACY**: You MUST find today's trading price. This could be the current live price if the market is open, or today's closing price if the market is closed. Do not use prices from old news articles or delayed data sources.
2.  **SOURCE HIERARCHY**: Prefer data from official sources like the Taiwan Stock Exchange (TWSE), or reputable financial portals like Yahoo Finance or Google Finance.
3.  **DATA FORMAT**: Ensure the price is in TWD (New Taiwan Dollar) and is a number, not a string. If it's an ETF (e.g., symbols starting with '00'), set 'is_etf' to true.

Return a JSON object with:
- 'name': The official Traditional Chinese name.
- 'current_price': The real-time price in TWD (number).
- 'is_etf': Boolean.
- 'stock_category': The industry category (e.g. '半導體', '金融', 'ETF').
- 'yield': The estimated annual dividend yield percentage (number).`,
            config: {
                tools: [{ googleSearch: {} }], // Enable Google Search
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        current_price: { type: Type.NUMBER },
                        is_etf: { type: Type.BOOLEAN },
                        stock_category: { type: Type.STRING },
                        yield: { type: Type.NUMBER }
                    },
                    required: ["name", "current_price", "is_etf", "stock_category", "yield"]
                }
            }
        });

        const result = JSON.parse(cleanJsonString(response.text));

        return {
            name: result.name || symbol,
            currentPrice: Number(result.current_price ?? result.currentPrice ?? 0),
            isEtf: !!(result.is_etf ?? result.isEtf),
            stockCategory: result.stock_category || result.stockCategory || '其他',
            yield: Number(result.yield ?? 0),
        };
    } catch (error) {
        console.error(`Gemini enrichment error for symbol ${symbol}:`, error);
        return null;
    }
};

/**
 * Parses free-text stock input into structured data using Gemini.
 * Example input: "2330 1張 600", "00878 5000股 22.5"
 */
export const parseStockInput = async (input: string): Promise<Partial<Asset>[] | null> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest', // Use Flash for speed
            contents: `
                Parse the following stock inventory text into a JSON array.
                Each line represents a stock position.
                Extract: symbol (string), shares (number, convert '張' to 1000 shares), avgCost (number).
                
                Input Text:
                "${input}"
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            symbol: { type: Type.STRING },
                            shares: { type: Type.NUMBER },
                            avgCost: { type: Type.NUMBER }
                        },
                        required: ["symbol", "shares", "avgCost"]
                    }
                }
            }
        });

        let text = cleanJsonString(response.text);
        if (text === "{}") text = "[]"; // Handle empty default
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini parseStockInput error:", error);
        return null;
    }
};

/**
 * Parses a CSV string of Taiwanese stock brokerage transaction history.
 * This function is designed to be robust against different column orders and encodings.
 * @param csvText The raw CSV text content.
 * @returns An object containing parsed transactions or an error message.
 */
export const parseStockTransactionCSV = (csvText: string): { transactions: StockTransaction[], error: string | null } => {
  const transactions: StockTransaction[] = [];
  
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length < 2) {
    return { transactions: [], error: "CSV 檔案是空的或缺少標題列 (Header)。" };
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const findColumnIndex = (keywords: string[]): number => {
    for (const keyword of keywords) {
      const index = headers.findIndex(header => header.includes(keyword));
      if (index !== -1) return index;
    }
    return -1;
  };

  const columnMap = {
    date: findColumnIndex(['成交日期']),
    symbol: findColumnIndex(['股票代號']),
    side: findColumnIndex(['買賣別', '買賣']),
    shares: findColumnIndex(['成交數量', '股數', '成交股數']),
    price: findColumnIndex(['成交價', '成交單價', '成交價格']),
    amount: findColumnIndex(['應收付帳款', '收付金額', '發生金額']),
    realizedProfit: findColumnIndex(['損益']),
    fee: findColumnIndex(['手續費']),
    tax: findColumnIndex(['交易稅']),
  };

  console.log('CSV Column Mapping:', columnMap);

  const requiredFields: { key: keyof typeof columnMap; name: string }[] = [
    { key: 'date', name: '成交日期' },
    { key: 'symbol', name: '股票代號' },
    { key: 'side', name: '買賣別' },
    { key: 'shares', name: '成交數量' },
    { key: 'price', name: '成交價' },
    { key: 'amount', name: '應收付帳款' },
  ];

  const missingColumns = requiredFields.filter(field => columnMap[field.key] === -1);
  
  if (missingColumns.length > 0) {
    const missingNames = missingColumns.map(field => field.name);
    return { transactions: [], error: `CSV 檔案缺少必要的欄位，請檢查是否包含：${missingNames.join('、')}` };
  }

  const cleanNumber = (str: string | undefined): number => {
    if (!str) return 0;
    // Remove quotes and commas for thousands separators
    const cleaned = str.replace(/"/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('小計') || line.includes('總計')) {
      continue;
    }
    
    // Use regex to split, handling commas inside quotes
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    try {
      const symbol = parts[columnMap.symbol]?.trim().replace(/"/g, '');
      const dateStr = parts[columnMap.date]?.trim().replace(/"/g, '');

      if (!symbol || !dateStr || !dateStr.match(/^\d{4}\/?\d{2}\/?\d{2}/)) {
        continue;
      }
      
      const sideText = parts[columnMap.side].trim().replace(/"/g, '');
      const side: 'BUY' | 'SELL' = sideText.includes('買') ? 'BUY' : 'SELL';
      
      const fees = columnMap.fee !== -1 ? cleanNumber(parts[columnMap.fee]) : 0;
      const tax = columnMap.tax !== -1 ? cleanNumber(parts[columnMap.tax]) : 0;
      const totalFees = fees + tax;
      
      let realizedProfitValue: number | undefined = undefined;
      if (side === 'SELL') {
          realizedProfitValue = columnMap.realizedProfit !== -1 ? cleanNumber(parts[columnMap.realizedProfit]) : 0;
      } else { // 'BUY'
          realizedProfitValue = 0;
      }

      const transaction: StockTransaction = {
        id: crypto.randomUUID(),
        date: dateStr.replace(/\//g, '-'),
        symbol: symbol,
        side: side,
        tradeType: '', // This info is less critical and might not exist consistently.
        shares: cleanNumber(parts[columnMap.shares]),
        price: cleanNumber(parts[columnMap.price]),
        fees: totalFees,
        realizedProfit: realizedProfitValue,
        amount: cleanNumber(parts[columnMap.amount]),
      };
      
      transactions.push(transaction);

    } catch (error) {
      console.warn(`Skipping invalid row during CSV parse: ${line}`, error);
    }
  }

  return { transactions, error: null };
};

export const parseStockInventoryCSV = (csvText: string): { assets: Partial<Asset>[], error: string | null } => {
    const assets: Partial<Asset>[] = [];
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) {
        return { assets: [], error: "CSV 檔案是空的或缺少標題列 (Header)。" };
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const findColumnIndex = (keywords: string[]): number => {
        for (const keyword of keywords) {
            const index = headers.findIndex(header => header.includes(keyword));
            if (index !== -1) return index;
        }
        return -1;
    };

    const columnMap = {
        symbol: findColumnIndex(['股票代號']),
        name: findColumnIndex(['股票名稱']),
        shares: findColumnIndex(['合計庫存數量']),
        avgCost: findColumnIndex(['成本均價']),
        currentPrice: findColumnIndex(['現價']),
    };

    const requiredFields = ['symbol', 'name', 'shares', 'avgCost', 'currentPrice'];
    const missingColumns = requiredFields.filter(field => columnMap[field as keyof typeof columnMap] === -1);
    if (missingColumns.length > 0) {
        return { assets: [], error: `CSV 缺少必要欄位: ${missingColumns.join(', ')}` };
    }
    
    const cleanNumber = (str: string | undefined): number => {
        if (!str) return 0;
        const cleaned = str.replace(/"/g, '').replace(/,/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const formatSymbol = (str: string | undefined): string => {
        if (!str) return '';
        // Cleans the symbol string: removes quotes, trims whitespace, and removes any decimal part.
        // e.g., '" 0050.0 "' -> "0050"
        let cleaned = str.replace(/"/g, '').trim();
        const dotIndex = cleaned.indexOf('.');
        if (dotIndex !== -1) {
            cleaned = cleaned.substring(0, dotIndex);
        }
        return cleaned;
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        try {
            const symbol = formatSymbol(parts[columnMap.symbol]);
            if (!symbol) continue;

            assets.push({
                symbol: symbol,
                name: parts[columnMap.name]?.trim().replace(/"/g, ''),
                shares: cleanNumber(parts[columnMap.shares]),
                avgCost: cleanNumber(parts[columnMap.avgCost]),
                currentPrice: cleanNumber(parts[columnMap.currentPrice]),
            });
        } catch (error) {
            console.warn(`Skipping invalid inventory row: ${line}`, error);
        }
    }
    return { assets, error: null };
};


import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, Button } from '../components/ui';
import { Asset, Transaction, AssetType, AIReportData, RecurringItem } from '../types';
import { generateFinancialReport } from '../services/gemini';
import { getApiKey } from '../services/storage';
import { 
    Sparkles, TrendingUp, AlertTriangle, ArrowRight, Wallet, CreditCard, 
    BarChart3, Activity, Briefcase, AlertCircle, Info
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

interface DashboardProps {
  assets: Asset[];
  transactions: Transaction[];
  recurring: RecurringItem[]; // New Prop V5.2
}

export const Dashboard: React.FC<DashboardProps> = ({ assets, transactions, recurring }) => {
  const [reportData, setReportData] = useState<AIReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [netWorth, setNetWorth] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const hasApiKey = !!getApiKey();

  useEffect(() => {
    // Calculate Metrics
    let assetsVal = 0;
    let liabilitiesVal = 0;

    assets.forEach(a => {
      const val = a.amount; // Already TWD
      if (a.type === AssetType.DEBT) {
        liabilitiesVal += val;
      } else {
        assetsVal += val;
      }
    });

    setNetWorth(assetsVal - liabilitiesVal);
    setTotalAssets(assetsVal);
    setTotalDebt(liabilitiesVal);
  }, [assets]);

  const handleGenerateReport = async () => {
    // V5.9.1 - AI Feature temporarily disabled for re-evaluation
    // setLoading(true);
    // const result = await generateFinancialReport(assets, transactions, recurring);
    // if (result) {
    //     setReportData(result);
    // }
    // setLoading(false);
  };

  const hasRecordedToday = transactions.some(t => t.date === new Date().toISOString().split('T')[0]);

  // SVG Configuration for Health Score
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  // Fallback to 0 if healthScore is undefined/NaN
  const score = reportData?.healthScore || 0;
  const strokeDashoffset = reportData ? circumference - (score / 100) * circumference : circumference;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* 1. Daily Reminder */}
      {!hasRecordedToday && (
         <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-2 rounded-full text-amber-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-amber-400 font-bold text-sm">今日尚未記帳</h3>
                <p className="text-slate-400 text-xs">紀錄今天的開銷，讓 AI 更精準分析。</p>
              </div>
            </div>
         </div>
      )}

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary/20 to-slate-800 border-primary/30 relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={100} />
            </div>
            <div className="text-primary-300 text-sm font-medium mb-2 flex items-center gap-2">
                <TrendingUp size={16}/> 淨資產總額 (Net Worth)
            </div>
            <div className="text-4xl font-bold text-white tracking-tight font-mono">
              ${netWorth.toLocaleString()}
            </div>
            <div className="mt-4 text-xs text-slate-400">
               資產 - 負債 (AI 校正後)
            </div>
        </Card>
        
        <Card className="hover:border-emerald-500/30 transition-colors">
            <div className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2">
                <Wallet size={16} className="text-emerald-400"/> 總資產 (Assets)
            </div>
            <div className="text-3xl font-bold text-white tracking-tight font-mono">
              ${totalAssets.toLocaleString()}
            </div>
        </Card>

        <Card className="hover:border-red-500/30 transition-colors">
            <div className="text-slate-400 text-sm font-medium mb-2 flex items-center gap-2">
                <CreditCard size={16} className="text-red-400"/> 總負債 (Debt)
            </div>
            <div className="text-3xl font-bold text-red-400 tracking-tight font-mono">
              ${totalDebt.toLocaleString()}
            </div>
        </Card>
      </div>

      {/* 3. AI Advisor Section - Full Width */}
      <Card className="border-cyan-500/20 bg-gradient-to-b from-slate-800 to-slate-900/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-700 pb-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Sparkles size={20}/>
               </div>
               <div>
                  <h3 className="text-lg font-bold text-white">AI 財務精算師</h3>
                  <p className="text-xs text-slate-400">Gemini 2.5 • 現金流壓力測試與債務管理</p>
               </div>
            </div>
            <Button 
                variant="primary" 
                onClick={handleGenerateReport} 
                disabled={true}
                title="此功能將於股票模組完善後重新規劃"
                className="w-full md:w-auto bg-slate-700 hover:bg-slate-600 shadow-none disabled:bg-slate-700 disabled:shadow-none disabled:text-slate-400"
            >
              AI 分析 (規劃中)
            </Button>
          </div>
          
          <div className="min-h-[200px]">
            {reportData ? (
              <div className="space-y-6 animate-fade-in">
                  
                  {/* Health Score & Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="col-span-1 bg-slate-900/60 p-5 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                          {/* Corrected SVG Container */}
                          <div className="relative w-32 h-32 flex items-center justify-center mb-1">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  {/* Background Circle */}
                                  <circle cx="50" cy="50" r={radius} stroke="#1e293b" strokeWidth="8" fill="none" />
                                  {/* Progress Circle */}
                                  <circle 
                                      cx="50" 
                                      cy="50" 
                                      r={radius} 
                                      stroke={score > 70 ? "#10b981" : score > 50 ? "#f59e0b" : "#ef4444"} 
                                      strokeWidth="8" 
                                      fill="none" 
                                      strokeDasharray={circumference} 
                                      strokeDashoffset={strokeDashoffset} 
                                      strokeLinecap="round" 
                                      className="transition-all duration-1000 ease-out"
                                  />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center flex-col">
                                  <span className="text-3xl font-bold text-white">{score}</span>
                                  <span className="text-[10px] text-slate-500 uppercase font-bold">Health</span>
                              </div>
                          </div>
                      </div>
                      <div className="col-span-1 md:col-span-3 bg-slate-900/60 p-5 rounded-xl border border-slate-700">
                          <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                             <Activity size={16}/> 財務總結分析
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                              {reportData.summary}
                          </p>
                      </div>
                  </div>

                  {/* Future Cash Flow Chart - DTI Percentage Mode */}
                  <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-700">
                      <h4 className="text-sm font-bold text-rose-400 mb-4 flex items-center gap-2">
                          <BarChart3 size={16}/> 未來現金流壓力模擬 (收支比率 DTI Stress Test)
                      </h4>
                      <div className="h-[250px] w-full relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={reportData.cashFlowForecast} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5}/>
                                  <XAxis dataKey="yearLabel" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}/>
                                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]}/>
                                  <Tooltip 
                                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                      itemStyle={{ fontSize: '12px', color: '#fff' }}
                                      formatter={(value: number, name: string, props: any) => {
                                          if (name === 'debtToIncomeRatio') return [`${value}%`, '佔收入百分比'];
                                          return [value, name];
                                      }}
                                      labelStyle={{ color: '#94a3b8' }}
                                  />
                                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'right', value: '50% 警戒線', fill: '#f59e0b', fontSize: 10 }} />
                                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: '70% 危險線', fill: '#ef4444', fontSize: 10 }} />
                                  
                                  <Bar dataKey="debtToIncomeRatio" name="負債佔收入比" radius={[4, 4, 0, 0]} barSize={60}>
                                      {reportData.cashFlowForecast.map((entry, index) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.debtToIncomeRatio > 70 ? '#ef4444' : entry.debtToIncomeRatio > 50 ? '#f59e0b' : '#10b981'} 
                                          />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="flex justify-between items-center mt-3 text-xs text-slate-500 px-2">
                         <p>* 數據依據目前「固定收入 + 近期變動收入平均」與「預估房貸支出」計算。</p>
                         <div className="flex gap-3">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 安全 (&lt;50%)</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 警戒 (50-70%)</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 危險 (&gt;70%)</span>
                         </div>
                      </div>
                  </div>

                  {/* Debt Analysis */}
                  <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-700 h-full flex flex-col">
                      <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                          <AlertCircle size={16}/> 負債管理建議
                      </h4>
                      <div className="space-y-3 flex-1">
                          {reportData.debtAnalysis.map((debt, idx) => (
                              <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="text-sm font-bold text-white">{debt.name}</span>
                                      <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">{debt.status}</span>
                                  </div>
                                  <p className="text-xs text-slate-400">{debt.suggestion}</p>
                              </div>
                          ))}
                          {reportData.debtAnalysis.length === 0 && (
                              <div className="text-center py-6 text-slate-500 text-xs">
                                  目前無重大負債風險，請繼續保持。
                              </div>
                          )}
                      </div>
                  </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 text-slate-500 gap-4 opacity-60">
                <Sparkles size={64} className="animate-pulse duration-[3s] text-cyan-500/50"/>
                <div className="text-center max-w-md">
                    <p className="text-lg font-medium text-slate-300 mb-2">AI 分析功能重新規劃中</p>
                    <p className="text-sm">此功能將在股票模組整合後，提供更全面的財務洞見。敬請期待！</p>
                </div>
              </div>
            )}
          </div>
      </Card>
    </div>
  );
};

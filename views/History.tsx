
import React from 'react';
import { Card } from '../components/ui';
import { Code2, GitCommit, CheckCircle2, AlertTriangle, ThumbsUp, Archive } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const versions = [
    {
      tag: "V5.1 (Current)",
      status: "current",
      title: "智能聯網搜尋增強版",
      features: [
        "優化：移除手動股利匯入，改為自動化資訊整合",
        "新增：Gemini Search Grounding 聯網搜尋技術",
        "功能：自動搜尋持股殖利率、配息金額與頻率",
        "介面：持股明細新增股利資訊標籤"
      ]
    },
    {
      tag: "V5.0 (Stable)",
      status: "past",
      title: "投資副駕駛與 AI 視覺分析版",
      features: [
        "新增：Gemini Vision 視覺辨識引擎",
        "新增：股票庫存截圖自動分析與資產連動",
        "新增：已實現損益自動記帳功能"
      ]
    },
    {
      tag: "V4.9 (Stable)",
      status: "past",
      title: "動態數據分析與精準匯入版",
      features: [
        "新增：自動入帳 (Auto-Execute) 固定收支邏輯",
        "里程碑：完成動態時間範圍選擇器 (週/月/季)",
        "優化：數據趨勢圖與結構分析支援跨月展示"
      ]
    }
  ];

  const evaluations = [
    {
      title: "投資自動化",
      icon: <Code2 className="text-violet-400" size={24}/>,
      pros: ["截圖分析解決了無 API 串接的痛點", "資產連動邏輯確保了帳面價值的一致性"],
      cons: ["依賴 OCR 清晰度，模糊圖片可能導致辨識數值錯誤"]
    },
    {
      title: "資料自動化",
      icon: <CheckCircle2 className="text-emerald-400" size={24}/>,
      pros: ["CSV 匯入大幅減少手動記帳負擔", "AI 批次分類精準度高且節省 Token"],
      cons: ["CSV 格式依賴財政部標準，若格式更動需維護"]
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-primary/20 to-slate-800 p-8 rounded-2xl border border-primary/20 shadow-2xl relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
         <h2 className="text-3xl font-bold text-white flex items-center gap-3 relative z-10">
            <Code2 className="text-primary"/> 系統日誌與開發評估
         </h2>
         <p className="text-slate-300 mt-2 relative z-10">追蹤 FinTrack AI 的演進歷程、核心功能評估與未來優化藍圖。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 bg-slate-800 rounded-2xl border border-slate-700 p-6 h-fit shadow-xl">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
                <GitCommit className="text-cyan-400"/> 版本演進
             </h3>
             <div className="relative pl-2 space-y-8 border-l border-slate-700 ml-2">
                {versions.map((ver, idx) => (
                    <div key={idx} className="relative pl-6 group">
                        <div className={`absolute -left-[5px] top-1.5 w-3 h-3 rounded-full border-2 ${ver.status === 'current' ? 'border-primary bg-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]' : 'border-slate-500 bg-slate-800'}`}></div>
                        <div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${ver.status === 'current' ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>{ver.tag}</span>
                            <h4 className="text-white font-bold text-base mt-1">{ver.title}</h4>
                            <ul className="mt-2 space-y-1">
                                {ver.features.map((f, i) => (
                                    <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                                        <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-600"></span> {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
             </div>
         </div>

         <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-400"/> 功能深度評估
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {evaluations.map((ev, idx) => (
                        <div key={idx} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                    {ev.icon}
                                </div>
                                <h4 className="text-white font-bold">{ev.title}</h4>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-emerald-400 flex items-start gap-2">
                                    <ThumbsUp size={14} className="mt-1"/> <span>{ev.pros[0]}</span>
                                </div>
                                {ev.cons[0] !== "無" && (
                                    <div className="text-sm text-amber-400 flex items-start gap-2">
                                        <AlertTriangle size={14} className="mt-1"/> <span>{ev.cons[0]}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
               <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                  <Archive size={16}/> 版本存檔建議
               </h3>
               <p className="text-xs text-slate-400 leading-relaxed">
                  若要保存此穩定版本，請前往 <b>「系統設定」</b> 使用 <b>「匯出備份」</b> 功能下載數據 JSON 檔。下次開啟本系統時，僅需匯入該 JSON 即可還原所有資產與收支分析紀錄。
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

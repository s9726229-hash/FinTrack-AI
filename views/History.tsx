
import React from 'react';
import { Card } from '../components/ui';
import { Code2, GitCommit, CheckCircle2, AlertTriangle, ThumbsUp, Archive, Mic } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const versions = [
    {
      tag: "V5.3 (Current)",
      status: "current",
      title: "AI 語音記帳版",
      features: [
        "新增：AI 語音記帳按鈕 (Voice FAB)，支援自然語言快速輸入",
        "體驗：無需打字，直接說「午餐吃排骨飯120」即可自動分類並入帳",
        "技術：整合 Web Speech API 與 Gemini 語意分析"
      ]
    },
    {
      tag: "V5.2 (Stable)",
      status: "past",
      title: "雲端同步與預算防禦版",
      features: [
        "新增：Google Drive 雲端同步 (Beta)，支援跨裝置備份與還原",
        "新增：AI 預算編列與「購買模擬器」，預測大額消費對現金流影響",
        "優化：貸款資產支援「寬限期」與「本息攤還」自動試算邏輯"
      ]
    },
    {
      tag: "V5.1 (Stable)",
      status: "past",
      title: "智能聯網搜尋增強版",
      features: [
        "優化：移除手動股利匯入，改為自動化資訊整合",
        "新增：Gemini Search Grounding 聯網搜尋技術",
        "功能：自動搜尋持股殖利率、配息金額與頻率"
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
    }
  ];

  const evaluations = [
    {
      title: "語音輸入體驗",
      icon: <Mic className="text-red-400" size={24}/>,
      pros: ["極速記帳，解決手機打字不便的痛點", "AI 自動判斷分類，省去手動選擇的步驟"],
      cons: ["依賴瀏覽器麥克風權限與網路連線"]
    },
    {
      title: "雲端同步機制",
      icon: <Code2 className="text-blue-400" size={24}/>,
      pros: ["利用 Google Drive API 實現完全私有的雲端備份", "不需要架設後端資料庫，大幅降低維護成本"],
      cons: ["需設定 OAuth Client ID，對非技術背景用戶有一定門檻"]
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

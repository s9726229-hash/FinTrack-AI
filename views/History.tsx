
import React from 'react';
import { Card } from '../components/ui';
import { Code2, GitCommit, CheckCircle2, AlertTriangle, ThumbsUp, Archive, Mic, Cpu, Layers } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const versions = [
    {
      tag: "V5.3 (Stable)",
      status: "current",
      title: "FinTrack AI - 全方位智慧財務管家",
      features: [
        "核心架構：升級至 React 19 + Vite，支援 PWA 安裝與離線操作，BYOK 架構確保隱私安全。",
        "AI 語音記帳：整合 Web Speech API 與 Gemini NLP，點擊懸浮按鈕即可口語記帳，自動解析分類與金額。",
        "視覺投資副駕駛：支援多券商 App 庫存截圖與已實現損益截圖辨識，自動計算市值並聯網搜尋股利資訊。",
        "雲端同步中心：整合 Google Drive API，實現私有雲端加密備份與跨裝置還原。",
        "智慧預算防禦：新增「購買模擬器」評估消費衝擊、「異常大額雷達」監控消費，以及「AI 預算建議」。",
        "資產貸款引擎：支援寬限期設定、年金法本息攤還試算，自動更新每月剩餘貸款本金。"
      ]
    },
    {
      tag: "V5.2",
      status: "past",
      title: "雲端同步與預算防禦版",
      features: [
        "新增：Google Drive 雲端同步 (Beta)",
        "新增：AI 預算編列與「購買模擬器」",
        "優化：貸款資產支援「寬限期」與「本息攤還」自動試算邏輯"
      ]
    },
    {
      tag: "V5.0",
      status: "past",
      title: "投資副駕駛與 AI 視覺分析版",
      features: [
        "新增：Gemini Vision 視覺辨識引擎",
        "新增：股票庫存截圖自動分析與資產連動",
        "新增：已實現損益自動記帳功能"
      ]
    }
  ];

  const featuresList = [
      {
          category: "AI 智能核心 (Gemini 2.5/3.0)",
          items: [
              "NLP 語意記帳 (語音/文字轉交易)",
              "Vision 視覺辨識 (庫存/損益截圖分析)",
              "Search Grounding (聯網搜尋台股股利)",
              "Financial Advisor (資產壓力測試報告)",
              "Purchase Simulator (購買行為現金流模擬)"
          ]
      },
      {
          category: "資產與帳務管理",
          items: [
              "多幣別資產管理 (自動匯率換算)",
              "智慧貸款攤提 (寬限期/本息平均)",
              "固定收支自動化 (月繳/年繳自動入帳)",
              "CSV 發票匯入與去重機制",
              "預算執行率監控與警示"
          ]
      },
      {
          category: "系統架構與安全",
          items: [
              "PWA 漸進式網頁 (支援手機安裝)",
              "Local-First 資料存儲 (IndexedDB/LocalStorage)",
              "Google Drive 私有雲端備份",
              "API Key 本地端加密存儲",
              "React 19 + TypeScript 高效能渲染"
          ]
      }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="bg-gradient-to-r from-primary/20 to-slate-800 p-8 rounded-2xl border border-primary/20 shadow-2xl relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
         <h2 className="text-3xl font-bold text-white flex items-center gap-3 relative z-10">
            <Code2 className="text-primary"/> 系統日誌與功能總覽
         </h2>
         <p className="text-slate-300 mt-2 relative z-10">FinTrack AI V5.3 穩定版功能矩陣與演進歷程。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
             <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
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
                                <ul className="mt-2 space-y-2">
                                    {ver.features.map((f, i) => (
                                        <li key={i} className="text-slate-300 text-sm flex items-start gap-2 leading-relaxed">
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-500 shrink-0"></span> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
         </div>

         <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Layers className="text-emerald-400"/> 功能模組矩陣
                </h3>
                <div className="space-y-4">
                    {featuresList.map((cat, idx) => (
                        <div key={idx}>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{cat.category}</h4>
                            <ul className="space-y-1.5">
                                {cat.items.map((item, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                        <CheckCircle2 size={12} className="text-primary/70"/> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
               <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                  <Archive size={16}/> 版本發布說明
               </h3>
               <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  本版本 (V5.3) 已經過完整測試，系統架構穩定。所有 AI 功能皆採用 Google Gemini 最新模型 (Flash/Pro) 驅動。
               </p>
               <p className="text-xs text-slate-400 leading-relaxed">
                  若您是開發者，可直接將此專案推送至 GitHub，程式碼已針對 Vercel 或 GitHub Pages 部署進行優化。
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

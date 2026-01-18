
import React from 'react';
import { Bot, GitCommit, Clock, CheckCircle2, FlaskConical, Bug, Wrench, CalendarCheck, Info, BookOpen, ListTree, LayoutPanelLeft, GitBranch, PlusCircle, FileText, Tags, FileUp, Sparkles, ShieldCheck, BrainCircuit } from 'lucide-react';
import { Card } from '../components/ui';

const logs = [
  {
    build: "5.4.1",
    date: "2026-01-18",
    title: "AI 智慧分類準確度提升 (提示工程優化)",
    status: "verifying",
    changes: [
      {
        icon: Bug,
        color: 'text-rose-400',
        text: "**問題修正**: 修正了發票匯入時 AI 分類不精準的問題。例如，飲料店被錯誤歸類為「購物」。"
      },
      {
        icon: BrainCircuit,
        color: 'text-sky-400',
        text: "**提示工程 (Prompt Engineering)**: 建立專屬的分類 AI 函式，並在指令中明確提供預設的支出類別清單，將 AI 的『開放式猜測』轉變為『有標準選項的選擇題』。"
      },
       {
        icon: Wrench,
        color: 'text-amber-400',
        text: "**上下文優化**: 現在會將發票的前 3 個品項名稱一同提供給 AI，以增加判斷線索，提升在複合式店家消費時的分類準確性。"
      },
    ]
  },
  {
    build: "5.4.0",
    date: "2026-01-18",
    title: "新功能：電子發票 CSV 匯入",
    status: "verified",
    changes: [
      {
        icon: FileUp,
        color: 'text-sky-400',
        text: "**快速匯入**: 於「收支記帳」頁面新增「匯入電子發票」功能，支援財政部平台的標準 CSV 格式，大幅簡化記帳流程。"
      },
      {
        icon: Sparkles,
        color: 'text-violet-400',
        text: "**AI 智慧分類**: 匯入時，Gemini AI 會根據店家名稱與品項自動判斷最適當的消費類別，省去手動設定的麻煩。"
      },
       {
        icon: ShieldCheck,
        color: 'text-emerald-400',
        text: "**重複偵測**: 系統會以「發票號碼」為唯一識別碼，自動跳過已存在的紀錄，確保資料的準確性與唯一性。"
      },
    ]
  },
  {
    build: "5.3.11",
    date: "2026-01-18",
    title: "擴展版本發布 SOP：納入介面版本號與網頁說明",
    status: "verified",
    changes: [
      {
        icon: Tags,
        color: 'text-sky-400',
        text: "**介面同步**: 根據使用者提醒，將「更新主介面版本號」納入新功能發布的標準流程，確保 `Sidebar.tsx` 中顯示的版本永遠與實際功能同步。"
      },
      {
        icon: FileText,
        color: 'text-emerald-400',
        text: "**網頁說明同步**: 同步將「更新 `metadata.json` 的網頁說明」納入流程，確保應用程式的公開描述能準確反映最新功能。"
      },
       {
        icon: ListTree,
        color: 'text-amber-400',
        text: "**流程固化**: 確立未來所有『新功能』發布，都將遵循包含『程式實作、版本號更新、UI同步、網頁說明、功能導覽、更新日誌』的完整六步驟SOP。"
      },
    ]
  },
  {
    build: "5.3.10",
    date: "2026-01-18",
    title: "導入語意化版本控制系統",
    status: "verified",
    changes: [
      {
        icon: GitBranch,
        color: 'text-sky-400',
        text: "**流程標準化**: 建立並導入語意化版本控制 (Semantic Versioning) 系統，格式為 `主版號.次版號.修訂號`，以更精確地追蹤變更歷史。"
      },
      {
        icon: PlusCircle,
        color: 'text-emerald-400',
        text: "**次版號 (Minor)**: 未來任何「新增功能」的請求，將會提升次版號。例如，從 `5.3.x` 升級至 `5.4.0`。"
      },
      {
        icon: Wrench,
        color: 'text-amber-400',
        text: "**修訂號 (Patch)**: 任何「介面錯誤修改」、「小型優化」或「錯誤修正」，將會提升修訂號。例如，從 `5.3.10` 升級至 `5.3.11`。"
      },
    ]
  },
  {
    build: "5.3.9",
    date: "2026-01-18",
    title: "重構功能導覽為獨立頁面",
    status: "verified",
    changes: [
      {
        icon: LayoutPanelLeft,
        color: 'text-sky-400',
        text: "**UI/UX 重構**: 根據使用者回饋，將「功能導覽」從側邊欄的收合式面板，升級為一個位於主畫面的獨立、完整的頁面，並參照設計稿優化視覺呈現。"
      },
      {
        icon: ListTree,
        color: 'text-cyan-400',
        text: "**導覽簡化**: 側邊欄的「功能導覽」項目現在會直接連結至新的功能說明頁面，操作流程更直觀。"
      },
    ]
  },
  {
    build: "5.3.8",
    date: "2026-01-18",
    title: "側邊欄重構：新增功能導覽與日誌簡化",
    status: "verified",
    changes: [
      {
        icon: ListTree,
        color: 'text-sky-400',
        text: "**日誌導覽簡化**: 根據使用者回饋，恢復「AI 調校日誌」為單純的導覽連結，移除預覽功能，使介面更簡潔。"
      },
      {
        icon: BookOpen,
        color: 'text-cyan-400',
        text: "**新增功能導覽**: 於側邊欄加入可收合的「功能導覽」面板，依版本號清晰列出核心功能，協助使用者快速上手。"
      },
    ]
  },
  {
    build: "5.3.7",
    date: "2026-01-18",
    title: "優化 AI 日誌導覽體驗",
    status: "verified",
    changes: [
      {
        icon: ListTree,
        color: 'text-sky-400',
        text: "**側邊欄優化**: 根據使用者回饋，將 AI 調校日誌的導覽項目改為可展開的選單，直接在側邊欄顯示最新的 3 筆更新紀錄，提升查閱便利性。"
      },
    ]
  },
  {
    build: "5.3.6",
    date: "2026-01-18",
    title: "新增側邊欄功能導覽",
    status: "verified",
    changes: [
      {
        icon: BookOpen,
        color: 'text-cyan-400',
        text: "**功能導覽**: 於側邊欄新增可收合的功能導覽面板，依主要版本號 (V5.3, V5.2, 核心) 說明各項功能，提升使用者體驗與上手便利性。"
      },
    ]
  },
  {
    build: "5.3.5",
    date: "2026-01-18",
    title: "優化日誌狀態顯示與說明",
    status: "verified",
    changes: [
      {
        icon: Info,
        color: 'text-sky-400',
        text: "**UX 優化**: 根據使用者回饋，為狀態標籤增加了懸停提示（Tooltip），明確解釋「驗證中」與「驗證通過」的具體含義，避免混淆。"
      },
    ]
  },
  {
    build: "5.3.4",
    date: "2026-01-18",
    title: "系統時間感校正與日誌更新",
    status: "verified",
    changes: [
      {
        icon: CalendarCheck,
        color: 'text-sky-400',
        text: "**時間感校正**: 根據使用者提供的當前日期 (`2026-01-18`)，全面更新 AI 調校日誌的時間戳，確保紀錄的準確性。"
      },
    ]
  },
  {
    build: "5.3.3",
    date: "2026-01-15",
    title: "AI 調校日誌日期校正",
    status: "verified",
    changes: [
      {
        icon: CalendarCheck,
        color: 'text-sky-400',
        text: "**日誌校正**: 根據使用者回饋，修正了 `Build 5.3.2` 的錯誤提交日期，並更新了其驗證狀態。"
      },
    ]
  },
  {
    build: "5.3.2",
    date: "2026-01-12",
    title: "建構錯誤修正與程式碼一致性優化",
    status: "verified",
    changes: [
      {
        icon: Bug,
        color: 'text-rose-400',
        text: "**建構錯誤修正 (Build Fix)**: 解決了 `views/History.tsx` 中因不正確的模組路徑造成的 TypeScript 編譯錯誤。"
      },
      {
        icon: FlaskConical,
        color: 'text-sky-400',
        text: "**程式碼一致性**: 將 AI 調校日誌頁面的卡片元件重構為使用全域共用的 `Card` 元件，提升了程式碼的可維護性與視覺一致性。"
      },
    ]
  },
  {
    build: "5.3.1",
    date: "2026-01-10",
    title: "程式碼重構與錯誤修正",
    status: "verified",
    changes: [
      {
        icon: FlaskConical,
        color: 'text-sky-400',
        text: "**程式碼重構 (DRY)**: 統一所有貸款餘額計算邏輯至 `services/finance.ts`，消除重複程式碼並確保計算一致性。"
      },
      {
        icon: Bug,
        color: 'text-rose-400',
        text: "**錯誤修正 (Bug Fix)**: 修正編輯貸款資產時，餘額不會立即更新的問題。現在任何變更都會即時反應。"
      },
      {
        icon: Wrench,
        color: 'text-amber-400',
        text: "**功能補全**: 為 `executeRecurring` 函式補上完整邏輯，消除無效作用的程式碼。"
      },
    ]
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  const isVerifying = status === 'verifying';
  const title = isVerifying 
    ? "此版本的變更正在等待您的確認。" 
    : "此版本的變更已被後續的操作確認完成。";

  if (isVerifying) {
    return (
      <span title={title} className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full cursor-help">
        <Clock size={12} />
        驗證中 (Verifying)
      </span>
    );
  }
  return (
    <span title={title} className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full cursor-help">
      <CheckCircle2 size={12} />
      驗證通過 (Verified)
    </span>
  );
};

export const HistoryView: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="bg-gradient-to-r from-cyan-500/10 to-slate-800 p-8 rounded-2xl border border-cyan-500/20 shadow-2xl relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
         <h2 className="text-3xl font-bold text-white flex items-center gap-3 relative z-10">
            <Bot className="text-cyan-400"/> AI 調校日誌
         </h2>
         <p className="text-slate-300 mt-2 relative z-10">追蹤 AI 開發助理對此應用程式的每一次調整與優化紀錄。</p>
      </div>

      <div className="relative pl-4 border-l-2 border-slate-700 ml-4">
        {logs.map((log, index) => (
          <div key={index} className="mb-10 pl-8 relative">
            <div className="absolute -left-[11px] top-1 w-5 h-5 bg-slate-800 border-4 border-primary rounded-full ring-8 ring-slate-900"></div>
            
            <Card className="shadow-lg hover:border-slate-600 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                          Build {log.build}
                        </span>
                        <span className="text-xs text-slate-400">{log.date}</span>
                    </div>
                    <StatusBadge status={log.status} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                   <GitCommit className="text-primary/70" size={20}/> {log.title}
                </h3>
                
                <ul className="mt-4 space-y-3 list-none">
                    {log.changes.map((change, i) => {
                        const Icon = change.icon;
                        return (
                            <li key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                <Icon size={20} className={`${change.color} mt-0.5 shrink-0`} />
                                <p className="text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: change.text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>') }} />
                            </li>
                        );
                    })}
                </ul>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};
import React from 'react';
import { Bot, GitCommit, Clock, CheckCircle2, FlaskConical, Bug, Wrench, CalendarCheck, Info, BookOpen, ListTree, LayoutPanelLeft, GitBranch, PlusCircle, FileText, Tags, FileUp, Sparkles, ShieldCheck, BrainCircuit, FilePenLine, Edit, Pointer, Pencil, Wifi, Layers, CircleDot, MessageSquareText, Camera, Zap, FileSearch, Trash2, TrendingUp, Calculator, GitMerge, UserCheck, Code, Scissors, Timer, Download, RefreshCw, Rocket, AppWindow, Columns, Paintbrush, SlidersHorizontal, Split, Gauge, LayoutGrid, Key, Filter, ClipboardList, MicVocal } from 'lucide-react';
import { Card } from '../components/ui';

const logs = [
  {
    build: "6.6.0",
    date: "2026-02-17",
    title: "語音引擎重大更新",
    status: "verifying",
    changes: [
      {
        icon: MicVocal,
        color: 'text-rose-400',
        text: "修復文字重複疊加 Bug，支援**長語音持續辨識**與**多筆交易批次 AI 解析**。"
      }
    ]
  },
  {
    build: "6.5.0",
    date: "2026-02-16",
    title: "介面重構與功能同步",
    status: "verified",
    changes: [
      {
        icon: SlidersHorizontal,
        color: 'text-sky-400',
        text: "交易篩選器全面中文化，新增**半年**與自定義日期區間，並導入即時查詢區間標籤。"
      },
      {
        icon: GitMerge,
        color: 'text-teal-400',
        text: "功能同步：將進階日期篩選器整合至股票交易明細，實現收支與投資模組的一致性操作。"
      }
    ]
  },
  {
    build: "6.4.1",
    date: "2026-02-15",
    title: "修正庫存匯入 Bug",
    status: "verified",
    changes: [
      {
        icon: GitMerge,
        color: 'text-sky-400',
        text: "**優化股票代號比對**：重構庫存匯入的合併邏輯，現在能正確比對不同補 0 格式的股票代號（例如 `878` 與 `00878`），確保資料能正確覆蓋更新。"
      },
      {
        icon: Wrench,
        color: 'text-amber-400',
        text: "**修正數值覆蓋邏輯**：修復當匯入的 CSV 檔案中包含 `0`（例如庫存為 0）時，無法正確更新現有數據的問題。"
      }
    ]
  },
  {
    build: "6.4.0",
    date: "2026-02-14",
    title: "新功能：支援股票庫存 CSV 匯入",
    status: "verified",
    changes: [
      {
        icon: ClipboardList,
        color: 'text-emerald-400',
        text: "**新增功能**：支援完整版股票庫存匯入，可透過 CSV 檔案一次性同步所有持股的數量、現價與**成本均價**，實現更精準的自動化損益追蹤。"
      }
    ]
  },
  {
    build: "6.3.0",
    date: "2026-02-13",
    title: "重大重構：交易紀錄解耦 & CSV 解析強化",
    status: "verified",
    changes: [
      {
        icon: GitBranch,
        color: 'text-violet-400',
        text: "架構重構：將股票交易紀錄 (`StockTransaction`) 從資產物件中分離，改為獨立的頂層資料表儲存，提升資料管理彈性。"
      },
      {
        icon: Filter,
        color: 'text-green-400',
        text: "**修復 CSV 解析 Bug**：強化解析引擎，改用正規表示式處理，能正確解析包含千分位逗號的欄位（如 `\"50,100\"`），大幅提升券商檔案相容性。"
      },
      {
        icon: GitMerge,
        color: 'text-teal-400',
        text: "**確保向後相容**：強化資料匯入功能，能自動偵測並遷移舊格式備份檔中的巢狀交易紀錄。"
      }
    ]
  },
  {
    build: "6.2.3",
    date: "2026-02-12",
    title: "功能強化：提升 CSV 解析器相容性",
    status: "verified",
    changes: [
      {
        icon: FileText,
        color: 'text-sky-400',
        text: "強化 CSV 解析器關鍵字辨識，支援更多元券商格式（如：**成交股數**、**發生金額**）。"
      }
    ]
  }
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
        {logs.slice(0, 10).map((log, index) => (
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
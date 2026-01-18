
import React from 'react';
import { Bot, GitCommit, Clock, CheckCircle2, FlaskConical, Bug, Wrench } from 'lucide-react';
import { Card } from '../components/ui';

const logs = [
  {
    build: "5.3.2",
    date: "2024-07-29",
    title: "建構錯誤修正與程式碼一致性優化",
    status: "verifying",
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
    date: "2024-07-28",
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
  if (status === 'verifying') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full">
        <Clock size={12} />
        驗證中 (Verifying)
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full">
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

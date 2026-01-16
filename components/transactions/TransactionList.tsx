
import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle2, Search } from 'lucide-react';
import { Transaction } from '../../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider flex items-center gap-2">
          Transaction History 
          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px] border border-slate-700">{transactions.length}</span>
      </h3>
      {transactions.map(t => (
      <div key={t.id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center justify-between group hover:border-slate-600 transition-all shadow-sm">
          <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {t.type === 'INCOME' ? <ArrowUpCircle size={18}/> : <ArrowDownCircle size={18}/>}
              </div>
              <div className="min-w-0">
                  <div className="font-bold text-white text-sm flex items-center gap-1.5 truncate">
                      {t.item}
                      {t.invoiceId && <CheckCircle2 size={10} className="text-primary"/>}
                  </div>
                  <div className="text-[10px] text-slate-400 flex gap-1.5 items-center">
                      <span className="font-mono">{t.date}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-slate-500"></span>
                      <span>{t.category}</span>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-2 pl-2">
              <span className={`font-mono text-base font-bold whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'}`}>
              {t.type === 'INCOME' ? '+' : '-'}${t.amount.toLocaleString()}
              </span>
              <button onClick={() => onDelete(t.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <span className="sr-only">Delete</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
          </div>
      </div>
      ))}
      {transactions.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-xl">
              <Search size={32} className="mx-auto text-slate-600 mb-2"/>
              <p className="text-slate-500 text-sm">找不到符合條件的交易紀錄</p>
              <p className="text-xs text-slate-600 mt-1">請嘗試調整搜尋關鍵字或時間區間</p>
          </div>
      )}
    </div>
  );
};

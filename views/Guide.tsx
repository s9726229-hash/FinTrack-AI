import React from 'react';
import { 
  BookOpen, Mic, Sparkles, BrainCircuit, Wand2, Calculator, Target, 
  LayoutGrid, PieChart, ScrollText, CalendarClock, Cloud,
  UploadCloud, FilePenLine, Pencil, Wifi, TrendingUp, Zap, Info,
  Clock, UserCheck, ShieldCheck, GitMerge, Scissors, AppWindow, Columns, Archive, FileSearch, Layers, Paintbrush, Split, ReceiptText, ListTree, ArrowRightLeft, Key, Filter, FileText, GitBranch, ClipboardList, SlidersHorizontal
} from 'lucide-react';

const FeatureSection = ({ title, color, children }: { title: string; color: string; children?: React.ReactNode }) => (
    <div className="relative pl-8">
        <div className="absolute left-0 top-1.5 w-3 h-3 bg-slate-700 rounded-full border-2 border-slate-900 ring-4 ring-slate-700"></div>
        <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 ${color}`}>{title}</h3>
        <div className="space-y-8">{children}</div>
    </div>
);

const FeatureItem = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="flex items-start gap-4">
        <div className="text-slate-500">
           <Icon size={24} />
        </div>
        <div>
            <h4 className="font-bold text-white">{title}</h4>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
    </div>
);

export const GuideView: React.FC = () => {
  return (
    <div className="animate-fade-in max-w-3xl mx-auto pb-20">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="text-primary"/> 功能導覽
        </h2>
        <p className="text-slate-400 mt-2">探索 FinTrack AI 的核心功能與最新 AI 技術整合。</p>
      </div>

      <div className="relative border-l-2 border-slate-800 space-y-12">
        <FeatureSection title="V6.6.0 功能 (語音記帳升級)" color="text-rose-400">
            <FeatureItem 
                icon={Mic}
                title="智慧流程重構：批次語音記帳" 
                description="語音記帳導入『先看後記』確認機制，支援長語音持續辨識（例如：早餐50元、午餐120、買咖啡90...），並可一次性解析多筆交易，大幅提升記帳效率與準確度。"
            />
        </FeatureSection>
        
        <FeatureSection title="V6.5.0 功能 (日期篩選升級)" color="text-sky-400">
            <FeatureItem 
                icon={SlidersHorizontal}
                title="精準的時間軸分析" 
                description="交易篩選器已全面升級，提供『月、季、半年、年度』等快捷選項，並強化自定義日期區間選擇。新增的即時查詢區間標籤，讓您對當前分析的數據範圍一目了然。"
            />
        </FeatureSection>
        
        <FeatureSection title="V6.4.0 功能 (庫存匯入)" color="text-emerald-400">
            <FeatureItem 
                icon={ClipboardList}
                title="支援完整股票庫存匯入" 
                description="新增了『匯入股票庫存』功能，可直接從券商的庫存快照 CSV 檔案，一次性同步所有持股的『股數』、『成本均價』與『現價』，大幅簡化了初次設定與後續校對的流程。"
            />
        </FeatureSection>

        <FeatureSection title="V6.3.0 功能 (架構重構 & Bug 修復)" color="text-violet-400">
            <FeatureItem 
                icon={GitBranch}
                title="庫存與交易明細解耦" 
                description="重構了核心資料架構，將股票的『庫存狀態』與『歷史交易紀錄』完全分離。現在所有交易紀錄都獨立存儲，使資產物件更輕量，資料管理更具彈性。"
            />
        </FeatureSection>
        
        <FeatureSection title="核心功能" color="text-slate-500">
            <FeatureItem icon={BrainCircuit} title="AI 補完持股資訊" description="在您輸入完股票基本資料後，點擊一下，AI 會在背景為所有不完整的持股批次補上「名稱、現價、類別、殖利率」等詳細數據。" />
            <FeatureItem icon={UploadCloud} title="電子發票 CSV 匯入" description="從財政部平台下載發票 CSV 檔後，可一鍵匯入所有交易，並利用 AI 智慧判斷消費類別。" />
            <FeatureItem icon={Cloud} title="雲端同步 & 備份" description="透過您的個人 Google Drive 帳號，安全地在雲端備份與還原您的所有財務資料。" />
        </FeatureSection>
      </div>
    </div>
  );
};
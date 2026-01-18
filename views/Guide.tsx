
import React from 'react';
import { 
  BookOpen, Mic, Sparkles, BrainCircuit, Wand2, Calculator, Target, 
  LayoutGrid, PieChart, ScrollText, CalendarClock, TrendingUp, Cloud,
  UploadCloud, FilePenLine, Pencil
} from 'lucide-react';

const FeatureSection = ({ title, color, children }: { title: string; color: string; children: React.ReactNode }) => (
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
        <FeatureSection title="V5.6 最新功能" color="text-rose-400">
            <FeatureItem 
                icon={Pencil} 
                title="主列表交易編輯" 
                description="現在您可以直接在「收支記帳」的主列表中，點擊任一筆已存在的交易紀錄進行編輯，隨時修正類別、金額或日期，讓帳務保持絕對精確。" 
            />
        </FeatureSection>

        <FeatureSection title="V5.5 功能" color="text-teal-400">
            <FeatureItem 
                icon={FilePenLine} 
                title="匯入預覽編輯" 
                description="在確認匯入電子發票前，您可以直接在預覽視窗中修改單筆交易的消費類別、金額或項目名稱，確保每一筆帳都符合您的實際情況。" 
            />
        </FeatureSection>
        
        <FeatureSection title="V5.4 功能" color="text-amber-400">
            <FeatureItem 
                icon={UploadCloud} 
                title="電子發票 CSV 匯入 (V5.4.1 強化)" 
                description="從財政部平台下載發票 CSV 檔後，可一鍵匯入所有交易。系統將自動排除重複紀錄，並利用優化後的 AI 智慧判斷消費類別，準確度大幅提升。" 
            />
        </FeatureSection>
        
        <FeatureSection title="V5.3 功能" color="text-cyan-400">
            <FeatureItem 
                icon={Mic} 
                title="AI 語音記帳" 
                description="透過懸浮按鈕，用自然語言（例如：昨天星巴克 150 元）快速新增收支，AI 自動為您解析並記錄。" 
            />
            <FeatureItem 
                icon={Sparkles} 
                title="AI 智慧輸入" 
                description="在傳統記帳視窗中，直接輸入一句話，AI 也能將其轉換為結構化的交易紀錄，兼顧速度與彈性。" 
            />
            <FeatureItem 
                icon={BrainCircuit} 
                title="AI 財務精算師" 
                description="儀表板的專屬財務顧問。整合您的資產、負債與收支，進行現金流壓力測試，並提供個人化的投資組合與債務管理建議。" 
            />
        </FeatureSection>

        <FeatureSection title="V5.2 核心 AI 強化" color="text-slate-400">
            <FeatureItem 
                icon={Target} 
                title="預算與分析" 
                description="設定各消費類別的月度預算，並透過「購買評估模擬器」在消費前評估該決策對財務狀況的影響。" 
            />
            <FeatureItem 
                icon={Wand2} 
                title="智慧預算建議" 
                description="不確定預算該如何設定？讓 AI 分析您的歷史消費數據，自動建議各類別中最適合您的合理預算上限。" 
            />
            <FeatureItem 
                icon={Calculator} 
                title="貸款自動攤提" 
                description="設定房貸、信貸的起始日期、利率與年期後，系統將每月自動計算並更新您的貸款餘額，無需再手動調整。" 
            />
        </FeatureSection>

        <FeatureSection title="核心功能" color="text-slate-500">
            <FeatureItem icon={LayoutGrid} title="總覽儀表板" description="整合所有財務數據，一覽淨資產、總資產與總負債的即時狀況與歷史趨勢。" />
            <FeatureItem icon={PieChart} title="資產管理" description="追蹤包括現金、股票、基金、房地產、加密貨幣及負債等多種類別的資產。" />
            <FeatureItem icon={ScrollText} title="收支記帳" description="提供詳盡的收支紀錄功能，並搭配強大的篩選器與視覺化圖表，深入了解您的金錢流向。" />
            <FeatureItem icon={CalendarClock} title="固定收支管理" description="輕鬆管理訂閱服務、房租、薪水等定期帳務，系統會在指定日期自動為您入帳，避免遺漏。" />
            <FeatureItem icon={TrendingUp} title="股票投資追蹤" description="監控您的持股組合，自動計算即時市值與未實現損益，掌握投資績效。" />
            <FeatureItem icon={Cloud} title="雲端同步 & 備份" description="透過您的個人 Google Drive 帳號，安全地在雲端備份與還原您的所有財務資料，實現跨裝置同步。" />
        </FeatureSection>
      </div>
    </div>
  );
};
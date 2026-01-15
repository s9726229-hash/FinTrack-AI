
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui';
import { exportData, importData, clearAllData, getApiKey, saveApiKey } from '../services/storage';
import { Download, Upload, Trash2, History, CheckCircle2, AlertCircle, X, Key, Eye, EyeOff } from 'lucide-react';

interface SettingsProps {
  onDataChange: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onDataChange }) => {
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setApiKey(getApiKey());
  }, []);

  const handleSaveKey = () => {
    saveApiKey(apiKey.trim());
    setNotification({
        type: 'success',
        message: 'API Key 已儲存！您可以開始使用 AI 智慧功能。'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const success = importData(ev.target.result as string);
          if (success) {
             setApiKey(getApiKey()); // Reload key if imported
             setNotification({
                 type: 'success',
                 message: '資料匯入成功！系統已自動更新您的資產與收支紀錄。'
             });
             onDataChange();
             
             // Auto hide after 5 seconds
             setTimeout(() => setNotification(null), 5000);
          } else {
             setNotification({
                 type: 'error',
                 message: '匯入失敗：無效的檔案格式，請確認您選擇的是正確的備份 JSON 檔。'
             });
          }
        }
      };
      reader.readAsText(file);
    }
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm("您確定要重置系統嗎？\n\n警告：這將會永久刪除所有資產、交易與設定資料且無法復原。")) {
        clearAllData();
        setApiKey('');
        onDataChange();
        setNotification({
            type: 'success',
            message: '系統已成功重置，所有資料已清除。'
        });
        setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in relative">
      <div>
         <h2 className="text-2xl font-bold mb-2 text-white">系統設定</h2>
         <p className="text-slate-400">管理 API 金鑰與資料備份。</p>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`
            p-4 rounded-xl border flex items-start gap-3 shadow-lg animate-fade-in transition-all
            ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}
        `}>
            {notification.type === 'success' ? <CheckCircle2 className="shrink-0" size={24}/> : <AlertCircle className="shrink-0" size={24}/>}
            <div className="flex-1 pt-0.5">
                <h4 className="font-bold text-sm mb-1">{notification.type === 'success' ? '操作成功' : '操作失敗'}</h4>
                <p className="text-sm opacity-90">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/20 rounded-lg transition-colors">
                <X size={16}/>
            </button>
        </div>
      )}

      {/* API Key Config */}
      <Card>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><Key className="text-amber-400"/> AI 金鑰設定</h3>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                  本系統使用 Google Gemini API 進行 AI 記帳與股票分析。請輸入您的 API Key 以啟用功能。
                  <br/>金鑰僅儲存於您的瀏覽器端，不會傳送至其他伺服器。
              </p>
              <div className="flex gap-2">
                  <div className="relative flex-1">
                      <Input 
                          type={showKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="請輸入 Gemini API Key (AIza...)"
                          className="pr-10"
                      />
                      <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                          {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                  </div>
                  <Button onClick={handleSaveKey}>儲存設定</Button>
              </div>
              <div className="text-xs text-slate-500">
                  沒有 API Key？ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">前往 Google AI Studio 申請</a>
              </div>
          </div>
      </Card>

      <Card>
         <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><History className="text-cyan-400"/> 資料備份與還原</h3>
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Button variant="secondary" onClick={exportData} className="h-28 flex-col gap-3 border border-slate-700 hover:border-primary/50 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="bg-slate-800 p-3 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                    <Download size={24}/> 
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-slate-200">匯出備份 (Export)</span>
                    <span className="text-xs text-slate-500 font-normal">下載完整 JSON 檔案 (含 Key)</span>
                  </div>
               </Button>
               
               <label className="cursor-pointer h-28 bg-slate-800 hover:bg-slate-750 rounded-lg flex flex-col items-center justify-center gap-3 text-slate-100 font-medium transition-all border border-slate-700 hover:border-cyan-400/50 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="bg-slate-900 p-3 rounded-full group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    <Upload size={24}/>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-slate-200">匯入備份 (Import)</span>
                    <span className="text-xs text-slate-500 font-normal">讀取 JSON 檔案還原</span>
                  </div>
                  <input type="file" className="hidden" accept=".json" onChange={handleImport} />
               </label>
            </div>

            <div className="pt-6 border-t border-slate-700/50">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                   <div>
                       <h4 className="text-red-400 font-bold text-sm flex items-center gap-2">
                           <AlertCircle size={14}/> 危險區域
                       </h4>
                       <p className="text-xs text-red-400/70 mt-1">此操作將無法復原，請謹慎使用。</p>
                   </div>
                   <Button variant="danger" onClick={handleReset} className="w-full md:w-auto text-xs py-2">
                      <Trash2 size={14}/> 清除所有資料 (重置)
                   </Button>
               </div>
            </div>
         </div>
      </Card>

      <div className="text-center text-slate-600 text-xs py-4 font-mono">
         FinTrack AI V5.1 System
      </div>
    </div>
  );
};

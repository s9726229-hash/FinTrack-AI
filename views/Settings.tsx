
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui';
import { exportData, importData, clearAllData, getApiKey, saveApiKey, getGoogleClientId, saveGoogleClientId } from '../services/storage';
import { initGapi, initGis, handleAuthClick, uploadToDrive, downloadFromDrive, getBackupMetadata } from '../services/googleDrive';
import { Download, Upload, Trash2, History, CheckCircle2, AlertCircle, X, Key, Eye, EyeOff, Cloud, RefreshCw, LogIn, ExternalLink, HelpCircle, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  onDataChange: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onDataChange }) => {
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  
  // Google Drive State
  const [googleClientId, setGoogleClientId] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);

  useEffect(() => {
    setApiKey(getApiKey());
    
    // Check URL for client_id parameter for quick setup on new devices
    const params = new URLSearchParams(window.location.search);
    const urlClientId = params.get('client_id');
    const storedClientId = getGoogleClientId();

    if (urlClientId) {
        setGoogleClientId(urlClientId);
        saveGoogleClientId(urlClientId);
        // Clear URL param to keep it clean (optional, but good UX)
        window.history.replaceState({}, '', window.location.pathname);
        showNotify('success', '已自動帶入 Client ID，請點擊連接。');
    } else {
        setGoogleClientId(storedClientId);
    }
  }, []);

  const handleSaveKey = () => {
    saveApiKey(apiKey.trim());
    showNotify('success', 'API Key 已儲存！您可以開始使用 AI 智慧功能。');
  };

  const handleSaveClientId = () => {
      saveGoogleClientId(googleClientId.trim());
      showNotify('success', 'Google Client ID 已儲存。請嘗試連接。');
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
  };

  // --- Drive Handlers ---
  const handleConnectDrive = async () => {
      if (!googleClientId) {
          showNotify('error', '請先輸入 Google Client ID');
          return;
      }
      setIsDriveLoading(true);
      try {
          await initGapi();
          await initGis(googleClientId);
          await handleAuthClick();
          setIsDriveConnected(true);
          showNotify('success', 'Google Drive 連接成功！');

          // Auto-detect backup
          const backup = await getBackupMetadata();
          if (backup) {
              const date = new Date(backup.modifiedTime).toLocaleString();
              if (confirm(`🔍 偵測到雲端備份檔\n\n備份時間：${date}\n\n是否立即下載並還原至此裝置？`)) {
                  await performRestore();
              }
          }
      } catch (e: any) {
          console.error(e);
          // Show user-friendly error messages for common OAuth issues
          if (e.message?.includes('origin_mismatch') || e?.error === 'idpiframe_initialization_failed') {
              showNotify('error', '來源網址不符：請檢查 Google Console 的「已授權 JavaScript 來源」。');
          } else if (e?.error === 'popup_closed_by_user') {
              showNotify('error', '取消登入：您關閉了登入視窗。');
          } else {
              showNotify('error', `連接失敗: ${e.message || e.error || '未知的授權錯誤'}`);
          }
      } finally {
          setIsDriveLoading(false);
      }
  };

  const handleBackupToDrive = async () => {
      if(!isDriveConnected) return;
      setIsDriveLoading(true);
      try {
          await uploadToDrive();
          showNotify('success', '上傳成功！資料已備份至 Google Drive。');
      } catch (e) {
          showNotify('error', '上傳失敗，請檢查網路或授權狀態。');
      } finally {
          setIsDriveLoading(false);
      }
  };

  const performRestore = async () => {
      try {
          const success = await downloadFromDrive();
          if (success) {
              onDataChange();
              showNotify('success', '還原成功！資料已同步。');
          } else {
              showNotify('error', '還原失敗，備份檔格式可能有誤。');
          }
      } catch (e: any) {
           showNotify('error', `下載失敗: ${e.message || '找不到備份檔'}`);
      }
  }

  const handleRestoreFromDrive = async () => {
      if(!isDriveConnected) return;
      if(!confirm("確定要從雲端還原嗎？這將覆蓋您目前的本地資料。")) return;
      
      setIsDriveLoading(true);
      await performRestore();
      setIsDriveLoading(false);
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
             setGoogleClientId(getGoogleClientId());
             showNotify('success', '資料匯入成功！系統已自動更新您的資產與收支紀錄。');
             onDataChange();
          } else {
             showNotify('error', '匯入失敗：無效的檔案格式。');
          }
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm("您確定要重置系統嗎？\n\n警告：這將會永久刪除所有資產、交易與設定資料且無法復原。")) {
        clearAllData();
        setApiKey('');
        setGoogleClientId('');
        onDataChange();
        showNotify('success', '系統已成功重置，所有資料已清除。');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in relative pb-20">
      <div>
         <h2 className="text-2xl font-bold mb-2 text-white">系統設定</h2>
         <p className="text-slate-400">管理 API 金鑰、雲端同步與資料備份。</p>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`
            p-4 rounded-xl border flex items-start gap-3 shadow-lg animate-fade-in transition-all sticky top-4 z-50
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

      {/* Google Drive Sync */}
      <Card>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><Cloud className="text-blue-400"/> Google Drive 雲端同步 (Beta)</h3>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
              <div className="text-sm text-slate-400 leading-relaxed">
                  <p className="mb-2">將資料備份至您的個人 Google Drive，實現跨裝置同步。</p>
                  
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4 space-y-3">
                      <p className="font-bold text-slate-300 flex items-center gap-2">
                          <ExternalLink size={14} className="text-primary"/> Google Cloud Console 設定教學
                      </p>
                      
                      <div className="space-y-4 text-xs text-slate-400">
                          <div>
                              <p className="font-bold text-slate-200 mb-1">1. 建立專案與啟用 API</p>
                              <ul className="list-disc list-inside pl-1 space-y-0.5">
                                  <li>前往 <a href="https://console.cloud.google.com/apis/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a>。</li>
                                  <li>左上角選單 (≡) &gt; 「API 和服務」 &gt; 「已啟用的 API 和服務」。</li>
                                  <li>點擊上方 <strong>「+ 啟用 API 和服務」</strong>，搜尋 <code>Google Drive API</code> 並啟用。</li>
                              </ul>
                          </div>

                          <div>
                              <p className="font-bold text-slate-200 mb-1">2. 設定 OAuth 同意畫面 (關鍵步驟)</p>
                              <ul className="list-disc list-inside pl-1 space-y-0.5">
                                  <li>左側選單點擊 <strong>「OAuth 同意畫面」</strong>。</li>
                                  <li>User Type 選擇 <strong>「外部 (External)」</strong> &gt; 建立。(若沒出現選擇畫面代表已建立過，請直接往下看)。</li>
                                  <li>填寫應用程式名稱 (如 FinTrack) 與您的 Email。</li>
                                  <li className="text-amber-400 font-bold bg-amber-500/10 p-1 rounded border border-amber-500/20 mt-1">
                                      重要：拉到最下方「測試使用者 (Test users)」，點擊「+ ADD USERS」，輸入您的 Gmail 信箱。
                                  </li>
                                  <li>(若沒做這步，登入時會顯示 Access blocked 錯誤)</li>
                              </ul>
                          </div>

                          <div>
                              <p className="font-bold text-slate-200 mb-1">3. 取得 Client ID</p>
                              <ul className="list-disc list-inside pl-1 space-y-0.5">
                                  <li>左側選單點擊 <strong>「憑證 (Credentials)」</strong>。</li>
                                  <li>點擊上方 <strong>「+ 建立憑證」</strong> &gt; <strong>「OAuth 用戶端 ID」</strong>。</li>
                                  <li>應用程式類型：選 <strong>「單頁應用程式」</strong> (或「網頁應用程式」)。</li>
                                  <li className="bg-slate-700/50 p-1 rounded border border-slate-600">
                                      已授權的 JavaScript 來源 (Authorized Origins)：<br/>
                                      <strong>{window.location.origin}</strong>
                                  </li>
                                  <li>建立後複製 Client ID 填入下方。</li>
                              </ul>
                          </div>
                      </div>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs space-y-1">
                      <h4 className="font-bold text-red-400 flex items-center gap-1"><AlertTriangle size={12}/> 出現 "You can't sign in... policy" 錯誤？</h4>
                      <p className="text-slate-300">這是最常見的設定錯誤，請檢查：</p>
                      <ul className="list-disc list-inside text-slate-400 pl-1">
                          <li>您在 Google Console 填寫的網址是否與上方瀏覽器網址列<strong>完全一致</strong>？</li>
                          <li>如果您瀏覽器是 <code>http://127.0.0.1:3000</code>，Console 裡不能填 <code>localhost:3000</code>，必須填 <code>http://127.0.0.1:3000</code>。</li>
                          <li>請確保網址是填在<strong>「已授權的 JavaScript 來源 (Origins)」</strong>，而不是「重新導向 URI」。</li>
                      </ul>
                  </div>
              </div>
              
              {!isDriveConnected ? (
                  <div className="flex gap-2">
                     <div className="flex-1">
                        <Input 
                            value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            placeholder="輸入 Google Client ID (例如: 123...apps.googleusercontent.com)"
                        />
                     </div>
                     <Button variant="secondary" onClick={handleSaveClientId}>儲存 ID</Button>
                     <Button 
                        onClick={handleConnectDrive} 
                        loading={isDriveLoading}
                        className="bg-white text-slate-900 hover:bg-slate-200"
                     >
                         <LogIn size={16} className="mr-2"/> 連接 Drive
                     </Button>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 gap-4">
                      <Button 
                         onClick={handleBackupToDrive} 
                         loading={isDriveLoading}
                         className="bg-blue-600 hover:bg-blue-500"
                      >
                         <Upload size={16} className="mr-2"/> 備份上傳 (覆蓋雲端)
                      </Button>
                      <Button 
                         onClick={handleRestoreFromDrive} 
                         loading={isDriveLoading}
                         className="bg-emerald-600 hover:bg-emerald-500"
                      >
                         <Download size={16} className="mr-2"/> 還原下載 (覆蓋本地)
                      </Button>
                      <div className="col-span-2 text-center">
                          <span className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                              <CheckCircle2 size={12}/> 已連接至 Google Drive
                          </span>
                      </div>
                  </div>
              )}
          </div>
      </Card>

      {/* API Key Config */}
      <Card>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><Key className="text-amber-400"/> AI 金鑰設定 (Gemini)</h3>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
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
          </div>
      </Card>

      <Card>
         <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><History className="text-cyan-400"/> 本地備份與還原</h3>
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Button variant="secondary" onClick={exportData} className="h-28 flex-col gap-3 border border-slate-700 hover:border-primary/50 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="bg-slate-800 p-3 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                    <Download size={24}/> 
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-slate-200">匯出備份 (Export)</span>
                    <span className="text-xs text-slate-500 font-normal">下載 JSON</span>
                  </div>
               </Button>
               
               <label className="cursor-pointer h-28 bg-slate-800 hover:bg-slate-750 rounded-lg flex flex-col items-center justify-center gap-3 text-slate-100 font-medium transition-all border border-slate-700 hover:border-cyan-400/50 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="bg-slate-900 p-3 rounded-full group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    <Upload size={24}/>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-slate-200">匯入備份 (Import)</span>
                    <span className="text-xs text-slate-500 font-normal">讀取 JSON</span>
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
    </div>
  );
};

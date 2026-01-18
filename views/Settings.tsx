
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui';
import { exportData, importData, clearAllData, getApiKey, saveApiKey, getGoogleClientId, saveGoogleClientId } from '../services/storage';
import { initGapi, initGis, handleAuthClick, uploadToDrive, downloadFromDrive, getBackupMetadata } from '../services/googleDrive';
import { Download, Upload, Trash2, History, CheckCircle2, AlertCircle, X, Key, Eye, EyeOff, Cloud, RefreshCw, LogIn, ExternalLink, HelpCircle, AlertTriangle, Copy, UserCheck, Users } from 'lucide-react';

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
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    setApiKey(getApiKey());
    // Get the exact current origin (e.g. https://yourname.github.io)
    // Removing trailing slash if present just in case
    const origin = window.location.origin.replace(/\/$/, "");
    setCurrentOrigin(origin);
    
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

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      showNotify('success', '已複製到剪貼簿');
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
          const errString = JSON.stringify(e);
          if (e.message?.includes('origin_mismatch') || e?.error === 'idpiframe_initialization_failed' || errString.includes('origin_mismatch')) {
              showNotify('error', '網址設定錯誤：請確認 Google Console 內的來源網址「沒有」包含 /FinTrack-AI/ 等路徑，且與下方顯示的完全一致。');
          } else if (e?.error === 'popup_closed_by_user') {
              showNotify('error', '取消登入：您關閉了登入視窗。');
          } else if (e?.error === 'access_denied' || errString.includes('access_denied')) {
              showNotify('error', '存取被拒 (403)：您的 Email 未加入測試名單。請參閱下方步驟 3 設定「測試使用者」。');
          } else {
              showNotify('error', `連接失敗: ${e.message || e.error || '未知的授權錯誤 (請確認 Client ID 正確)'}`);
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
                              <p className="font-bold text-slate-200 mb-1">1. 設定 OAuth 來源 (解決 origin_mismatch)</p>
                              <ul className="list-disc list-inside pl-1 space-y-0.5">
                                  <li>前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">憑證 (Credentials)</a> &gt; 您的 OAuth Client ID。</li>
                                  <li>在 <strong>「已授權的 JavaScript 來源」</strong> 填入下方網址：</li>
                                  <li className="bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-1 mb-1 flex items-center gap-2">
                                      <code className="text-emerald-400 font-mono flex-1 overflow-x-auto">{currentOrigin}</code>
                                      <button onClick={() => copyToClipboard(currentOrigin)} className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><Copy size={12}/></button>
                                  </li>
                                  <li className="text-[10px] text-amber-400">* 請勿包含斜線 <code>/</code> 或路徑。</li>
                              </ul>
                          </div>

                          <div>
                              <p className="font-bold text-slate-200 mb-1 flex items-center gap-2">
                                  <UserCheck size={14} className="text-rose-400"/> 
                                  2. 設定測試使用者 (解決「存取被拒」錯誤)
                              </p>
                              <ul className="list-disc list-inside pl-1 space-y-0.5 text-rose-300">
                                  <li>前往左側選單的 <strong>「OAuth 同意畫面」</strong> &gt; <strong>「測試使用者」</strong>。</li>
                                  <li><span className="font-bold underline">必須</span> 輸入您要登入的 Google Email 並儲存。</li>
                              </ul>
                          </div>

                          <div className="pt-2 border-t border-slate-700/50">
                              <p className="font-bold text-slate-200 mb-1 flex items-center gap-2">
                                  <Users size={14} className="text-violet-400"/> 
                                  3. 如何分享給朋友使用？
                              </p>
                              <div className="bg-violet-500/10 p-2 rounded border border-violet-500/20 text-slate-300 space-y-2">
                                  <p><strong>方法 A (簡單)：</strong> 將朋友 Email 加入上述「測試使用者」名單。</p>
                                  <p><strong>方法 B (推薦)：</strong> 請朋友建立自己的 Google Cloud 專案，將此網頁網址 ({currentOrigin}) 加入來源，並輸入他們自己的 Client ID。</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-400 uppercase">Google Client ID</label>
                      <div className="flex gap-2">
                          <Input 
                              type="text" 
                              value={googleClientId} 
                              onChange={(e) => setGoogleClientId(e.target.value)}
                              placeholder="例如：123456789-abcde...apps.googleusercontent.com"
                              className="font-mono text-xs bg-black/30"
                          />
                          <Button onClick={handleSaveClientId} variant="secondary" className="shrink-0 h-10">儲存 ID</Button>
                      </div>
                  </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                  <Button 
                      onClick={handleConnectDrive} 
                      disabled={isDriveLoading || isDriveConnected} 
                      className={`flex-1 ${isDriveConnected ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                  >
                      {isDriveLoading ? <RefreshCw className="animate-spin" size={18}/> : isDriveConnected ? <CheckCircle2 size={18}/> : <LogIn size={18}/>}
                      {isDriveConnected ? '已連接 Google Drive' : '連接 Google 帳號'}
                  </Button>
                  
                  {isDriveConnected && (
                      <>
                          <Button onClick={handleBackupToDrive} disabled={isDriveLoading} variant="secondary" className="flex-1">
                              <Upload size={18} className="mr-2"/> 上傳備份
                          </Button>
                          <Button onClick={handleRestoreFromDrive} disabled={isDriveLoading} variant="secondary" className="flex-1">
                              <Cloud size={18} className="mr-2"/> 從雲端還原
                          </Button>
                      </>
                  )}
              </div>
          </div>
      </Card>

      {/* Gemini API Key Settings */}
      <Card>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><Key className="text-primary"/> Gemini API Key 設定</h3>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
              <div className="text-sm text-slate-400">
                  <p className="mb-2">啟用 AI 智慧分析、收支自動分類與股票建議功能。</p>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 w-fit mb-3">
                      <ExternalLink size={14}/> 取得免費 API Key
                  </a>
              </div>
              <div className="flex gap-2">
                  <div className="relative flex-1">
                      <Input 
                          type={showKey ? "text" : "password"} 
                          value={apiKey} 
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="貼上您的 Gemini API Key"
                          className="pr-10 bg-black/30"
                      />
                      <button 
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                          {showKey ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                  </div>
                  <Button onClick={handleSaveKey} variant="primary" className="shrink-0">儲存</Button>
              </div>
          </div>
      </Card>

      {/* Manual Data Management */}
      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><History className="text-amber-500"/> 本地資料管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2"><Download size={16}/> 匯出備份 (JSON)</h4>
                <p className="text-xs text-slate-400 mb-3">下載完整資料檔到此裝置，可用於手動備份。</p>
                <Button onClick={exportData} variant="secondary" className="w-full">
                   下載 .json 檔案
                </Button>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2"><Upload size={16}/> 匯入還原</h4>
                <p className="text-xs text-slate-400 mb-3">從 .json 檔案還原資料 (將覆蓋現有紀錄)。</p>
                <div className="relative">
                    <input 
                        type="file" 
                        onChange={handleImport}
                        accept=".json"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="secondary" className="w-full">
                       選擇檔案匯入
                    </Button>
                </div>
            </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2"><AlertCircle size={16}/> 危險區域</h4>
            <div className="flex items-center justify-between bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <div className="text-xs text-red-200">
                    清除所有本地資料，將系統重置為初始狀態。
                </div>
                <Button onClick={handleReset} variant="danger" className="text-xs px-3 py-1.5 h-auto">
                    重置系統
                </Button>
            </div>
        </div>
      </Card>

      <div className="text-center text-xs text-slate-600 pb-4">
          <p>FinTrack AI V5.2 • Built with Gemini 2.5 Flash</p>
          <p className="mt-1">Data is stored locally on your device.</p>
      </div>
    </div>
  );
};

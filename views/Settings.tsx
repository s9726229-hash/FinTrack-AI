
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/ui';
import { exportData, importData, clearAllData, getGoogleClientId, saveGoogleClientId, getApiKey, saveApiKey } from '../services/storage';
import { initGapi, initGis, handleAuthClick, uploadToDrive, downloadFromDrive, getBackupMetadata, checkConnection } from '../services/googleDrive';
import { Download, Upload, CheckCircle2, AlertCircle, X, Cloud, RefreshCw, LogIn, History, Trash2, Key, Eye, EyeOff, Sparkles, ExternalLink } from 'lucide-react';
import { ApiKeyStatus } from '../types';

interface SettingsProps {
  onDataChange: () => void;
  apiKeyStatus: ApiKeyStatus;
}

const ApiKeyStatusIndicator = ({ status }: { status: ApiKeyStatus }) => {
    const statusConfig = {
        unchecked: { color: 'bg-slate-500', pulse: false, text: '未設定金鑰' },
        verifying: { color: 'bg-amber-500', pulse: true, text: '正在驗證...' },
        valid: { color: 'bg-emerald-500', pulse: false, text: '金鑰有效，AI 功能已啟用' },
        invalid: { color: 'bg-red-500', pulse: false, text: '金鑰無效或已過期' },
    };
    const { color, pulse, text } = statusConfig[status];

    return (
        <div title={text} className="flex items-center gap-1.5 ml-2">
            <div className={`w-2.5 h-2.5 rounded-full ${color} ${pulse ? 'animate-pulse' : ''} transition-colors`}></div>
            <span className="text-xs text-slate-400">{text}</span>
        </div>
    );
};


export const Settings: React.FC<SettingsProps> = ({ onDataChange, apiKeyStatus }) => {
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Google Drive State
  const [googleClientId, setGoogleClientId] = useState('');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);

  useEffect(() => {
    // Load existing settings on mount
    const storedApiKey = getApiKey();
    setApiKey(storedApiKey);
    
    const storedClientId = getGoogleClientId();
    if (storedClientId) {
        setGoogleClientId(storedClientId);
        autoInitDrive(storedClientId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoInitDrive = async (clientId: string) => {
      try {
          await initGapi();
          await initGis(clientId);
          if (checkConnection()) {
              setIsDriveConnected(true);
          }
      } catch (e) {
          console.debug("Drive auto-init skipped", e);
      }
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
  };

  const handleSaveApiKey = () => {
      const trimmedKey = apiKey.trim();
      saveApiKey(trimmedKey);
      onDataChange(); // Trigger App-level refresh and verification
      
      if (trimmedKey) {
          showNotify('success', 'Gemini API Key 已儲存！正在驗證...');
      } else {
          showNotify('error', 'API Key 已清除');
      }
  };

  const handleSaveClientId = () => {
      saveGoogleClientId(googleClientId.trim());
      showNotify('success', 'Google Client ID 已儲存。請嘗試點擊連接。');
      autoInitDrive(googleClientId.trim());
  };

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

          const backup = await getBackupMetadata();
          if (backup) {
              const date = new Date(backup.modifiedTime).toLocaleString();
              if (confirm(`🔍 偵測到雲端備份檔\n\n備份時間：${date}\n\n是否立即下載並還原至此裝置？`)) {
                  await performRestore();
              }
          }
      } catch (e: any) {
          showNotify('error', `連接失敗: ${e.message || '授權錯誤，請檢查來源網址設定'}`);
      } finally {
          setIsDriveLoading(false);
      }
  };

  const handleBackupToDrive = async () => {
      if(!isDriveConnected) return;
      setIsDriveLoading(true);
      try {
          await uploadToDrive();
          showNotify('success', '備份成功！資料已加密存儲至您的 Google Drive。');
      } catch (e) {
          showNotify('error', '上傳失敗，請檢查網路或授權。');
      } finally {
          setIsDriveLoading(false);
      }
  };

  const performRestore = async () => {
      try {
          const success = await downloadFromDrive();
          if (success) {
              onDataChange();
              showNotify('success', '還原成功！所有資料已同步至此裝置。');
          } else {
              showNotify('error', '還原失敗：檔案格式不正確。');
          }
      } catch (e: any) {
           showNotify('error', `下載失敗: ${e.message || '找不到備份檔'}`);
      }
  }

  const handleRestoreFromDrive = async () => {
      if(!isDriveConnected) return;
      if(!confirm("確定要從雲端還原嗎？這將覆蓋現有資料。")) return;
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
             setApiKey(getApiKey());
             setGoogleClientId(getGoogleClientId());
             onDataChange(); // Trigger full refresh and verification
             showNotify('success', '匯入成功！');
          } else {
             showNotify('error', '格式錯誤');
          }
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm("確定要重置系統嗎？所有資料都會被刪除。")) {
        clearAllData();
        setApiKey('');
        setGoogleClientId('');
        setIsDriveConnected(false);
        onDataChange(); // Trigger full refresh
        showNotify('success', '系統已重置。');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in relative pb-20">
      <div>
         <h2 className="text-2xl font-bold mb-2 text-white">系統設定</h2>
         <p className="text-slate-400">管理 API 金鑰、雲端同步與資料安全性。</p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg animate-fade-in sticky top-4 z-50 ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            <div className="flex-1 pt-0.5">
                <p className="text-sm font-bold">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)}><X size={16}/></button>
        </div>
      )}

      {/* Gemini API Key Setting */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-800 to-slate-900/50">
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <Sparkles className="text-cyan-400"/> Gemini API 金鑰設定
              </h3>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
              >
                取得 API Key <ExternalLink size={10}/>
              </a>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
              <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-400">
                      請輸入您的 Google Gemini API Key 以啟用所有 AI 功能。
                  </p>
                  <ApiKeyStatusIndicator status={apiKeyStatus} />
              </div>
              <div className="flex gap-2">
                  <div className="relative flex-1">
                      <div className="absolute left-3 top-3 text-slate-500">
                          <Key size={16} />
                      </div>
                      <Input 
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="請輸入 Gemini API Key (AI Studio)"
                          className="pl-9 pr-10 font-mono text-sm bg-black/30"
                      />
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-white"
                      >
                          {showApiKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                  </div>
                  <Button onClick={handleSaveApiKey} className="shrink-0 bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-900/20">
                      儲存設定
                  </Button>
              </div>
          </div>
      </Card>

      {/* Google Drive Sync */}
      <Card>
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <Cloud className="text-blue-400"/> Google Drive 雲端同步
              </h3>
              {isDriveConnected && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> 已連線
                  </span>
              )}
          </div>
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
              <div className="text-sm text-slate-400">
                  <p className="mb-4">將所有帳務資料備份至您的私人雲端 (Google Drive)，解決跨裝置同步需求。</p>
                  
                  <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">OAuth Client ID</label>
                      <div className="flex gap-2">
                          <Input 
                              type="text" 
                              value={googleClientId} 
                              onChange={(e) => setGoogleClientId(e.target.value)}
                              placeholder="請輸入 Google Cloud Client ID (Web Application)"
                              className="font-mono text-xs bg-black/30"
                          />
                          <Button onClick={handleSaveClientId} variant="secondary" className="shrink-0 h-10 px-3">儲存</Button>
                      </div>
                      <p className="text-[10px] text-slate-600">
                        * 請在 Google Cloud Console 設定授權來源 (Javascript Origins)。
                      </p>
                  </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                  <Button 
                      onClick={handleConnectDrive} 
                      disabled={isDriveLoading || (isDriveConnected && checkConnection())} 
                      className={`flex-1 ${isDriveConnected ? 'bg-emerald-600/50 cursor-default' : 'bg-blue-600'}`}
                  >
                      {isDriveLoading ? <RefreshCw className="animate-spin" size={18}/> : isDriveConnected ? <CheckCircle2 size={18}/> : <LogIn size={18}/>}
                      {isDriveConnected ? '雲端服務已就緒' : '連接 Google 帳號'}
                  </Button>
                  
                  {isDriveConnected && (
                      <>
                          <Button onClick={handleBackupToDrive} disabled={isDriveLoading} variant="secondary" className="flex-1">
                              <Upload size={18} className="mr-2"/> 雲端備份
                          </Button>
                          <Button onClick={handleRestoreFromDrive} disabled={isDriveLoading} variant="secondary" className="flex-1">
                              <Cloud size={18} className="mr-2"/> 雲端還原
                          </Button>
                      </>
                  )}
              </div>
          </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white"><History className="text-amber-500"/> 本地資料管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={exportData} variant="secondary" className="w-full text-xs">
                <Download size={16} className="mr-2"/> 匯出 JSON 備份
            </Button>
            <div className="relative">
                <input type="file" onChange={handleImport} accept=".json" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Button variant="secondary" className="w-full text-xs">
                    <Upload size={16} className="mr-2"/> 匯入備份還原
                </Button>
            </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
            <Button onClick={handleReset} variant="danger" className="w-full text-[10px] uppercase font-bold">
                <Trash2 size={16} className="mr-2"/> 重置並清除所有本地資料
            </Button>
        </div>
      </Card>

      <div className="text-center text-[10px] text-slate-600 pb-4">
          <p>FinTrack AI V5.7 • Gemini Engine • Powered by Google Generative AI</p>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, X } from 'lucide-react';
import { parseTransactionInput } from '../services/gemini';
import { Transaction, IWindow } from '../types';

interface VoiceInputFabProps {
  onAddTransaction: (t: Transaction) => void;
  hasApiKey: boolean;
}

export const VoiceInputFab: React.FC<VoiceInputFabProps> = ({ onAddTransaction, hasApiKey }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (Recognition) {
      const recognition = new Recognition();
      recognition.continuous = false; // Stop after one sentence
      recognition.interimResults = true;
      recognition.lang = 'zh-TW'; // Default to Traditional Chinese

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        // CRITICAL FIX: Update the ref immediately so onend can access the latest text
        // This avoids state closure issues in the onend callback
        if (recognitionRef.current) {
            recognitionRef.current.finalTranscript = currentTranscript;
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            setError('請允許麥克風權限');
        } else {
            setError('辨識錯誤，請重試');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // If we have a transcript stored in the ref, process it
        if (recognitionRef.current && recognitionRef.current.finalTranscript) {
             handleAIProcess(recognitionRef.current.finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleStart = () => {
    if (!hasApiKey) {
        alert("請先在設定頁面輸入 Gemini API Key");
        return;
    }
    if (recognitionRef.current) {
        // Reset the transcript ref before starting
        recognitionRef.current.finalTranscript = ''; 
        try {
            recognitionRef.current.start();
        } catch (e) {
            // Sometimes start is called when already started
            console.error(e);
        }
    } else {
        setError("您的瀏覽器不支援語音辨識");
    }
  };

  const handleStop = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        // Fallback: if onend doesn't trigger correctly or we want to force process current state
        if (transcript.trim() && !isProcessing) {
            handleAIProcess(transcript);
        }
    }
  };

  const handleAIProcess = async (text: string) => {
      if (!text.trim() || isProcessing) return;
      
      setIsProcessing(true);
      try {
          const result = await parseTransactionInput(text);
          if (result && result.item && result.amount) {
              const newTransaction: Transaction = {
                  id: crypto.randomUUID(),
                  date: result.date || new Date().toISOString().split('T')[0],
                  amount: Number(result.amount),
                  category: result.category || '其他',
                  item: result.item,
                  type: result.type as 'EXPENSE' | 'INCOME',
                  source: 'AI_VOICE',
                  note: `語音指令: "${text}"`
              };
              onAddTransaction(newTransaction);
              setTranscript(''); // Clear after success
          } else {
              setError("AI 無法理解，請再試一次");
          }
      } catch (e) {
          setError("AI 分析失敗");
      } finally {
          setIsProcessing(false);
      }
  };

  // If Browser doesn't support speech API, don't render
  const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
  if (!webkitSpeechRecognition && !SpeechRecognition) return null;

  return (
    <>
        {/* Overlay when listening or processing */}
        {(isListening || isProcessing) && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex flex-col items-center justify-center animate-fade-in">
                <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs w-full relative">
                    <button 
                        onClick={() => { setIsListening(false); setIsProcessing(false); recognitionRef.current?.stop(); }}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white"
                    >
                        <X size={20}/>
                    </button>

                    {isProcessing ? (
                        <>
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 animate-pulse"></div>
                                <Sparkles size={48} className="text-violet-400 relative z-10 animate-bounce"/>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">AI 分析中...</h3>
                            <p className="text-sm text-slate-400 text-center">"{transcript}"</p>
                        </>
                    ) : (
                        <>
                            <div className={`relative mb-6 p-6 rounded-full bg-red-500/10 ${isListening ? 'animate-pulse' : ''}`}>
                                <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 animate-ping"></div>
                                <Mic size={48} className="text-red-500 relative z-10"/>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">正在聆聽...</h3>
                            <p className="text-sm text-slate-400 text-center min-h-[1.5em]">
                                {transcript || "請說話 (例如：午餐 120)"}
                            </p>
                            <button 
                                onClick={handleStop}
                                className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-bold text-white transition-colors"
                            >
                                完成並送出
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Floating Action Button */}
        {!isListening && !isProcessing && (
            <button
                onClick={handleStart}
                className="fixed z-40 right-4 bottom-20 md:bottom-8 w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 rounded-full shadow-[0_4px_20px_rgba(225,29,72,0.4)] flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-300 group"
                title="語音記帳"
            >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-full transition-opacity"></div>
                <Mic size={24} className="fill-white/20"/>
            </button>
        )}
    </>
  );
};


import React, { useState } from 'react';
import { Modal, Input, Button, Select } from '../ui';
import { Transaction } from '../../types';
import { Sparkles, Pencil, Info, Wand2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants';
import { parseTransactionInput } from '../../services/gemini';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (t: Transaction) => void;
  hasApiKey: boolean;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onAdd, hasApiKey }) => {
  const [activeTab, setActiveTab] = useState<'AI' | 'MANUAL'>('AI');
  const [aiInputText, setAiInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'EXPENSE',
    date: new Date().toISOString().split('T')[0],
    category: '餐飲'
  });

  // Reset state when opening (handled via useEffect in parent or simpler: just reset on close)
  // Here we use a key or assume parent manages mounting, but for simplicity we reset if needed manually
  // or we rely on the user to clear inputs. For better UX, we can use an effect.
  
  React.useEffect(() => {
    if (isOpen) {
        setFormData({
            type: 'EXPENSE',
            date: new Date().toISOString().split('T')[0],
            category: '餐飲',
            item: '',
            amount: undefined
        });
        setAiInputText('');
        setActiveTab('AI');
    }
  }, [isOpen]);

  const handleAIAnalyze = async () => {
    if(!aiInputText.trim()) return;
    setIsAnalyzing(true);
    const result = await parseTransactionInput(aiInputText);
    if (result) {
        setFormData({
            ...formData,
            ...result,
            date: result.date || new Date().toISOString().split('T')[0]
        });
        setActiveTab('MANUAL'); 
    } else {
        alert("AI 無法辨識內容，請嘗試輸入更完整的句子。");
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = () => {
    if (!formData.amount || !formData.item) return;
    onAdd({
        id: crypto.randomUUID(),
        date: formData.date || new Date().toISOString().split('T')[0],
        amount: Number(formData.amount),
        category: formData.category || '其他',
        item: formData.item,
        type: formData.type as 'EXPENSE' | 'INCOME',
        source: 'MANUAL'
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新增收支">
      <div className="space-y-6">
         <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-700/50">
             <button 
                 onClick={() => setActiveTab('AI')}
                 className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                     activeTab === 'AI' 
                     ? 'bg-primary text-white shadow-md' 
                     : 'text-slate-400 hover:text-white'
                 }`}
             >
                 <Sparkles size={16} className={activeTab === 'AI' ? 'text-white' : 'text-cyan-400'}/>
                 AI 智慧輸入
             </button>
             <button 
                 onClick={() => setActiveTab('MANUAL')}
                 className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                     activeTab === 'MANUAL' 
                     ? 'bg-slate-700 text-white shadow-md' 
                     : 'text-slate-400 hover:text-white'
                 }`}
             >
                 <Pencil size={16}/>
                 手動輸入
             </button>
         </div>

         {activeTab === 'AI' ? (
             <div className="space-y-4 animate-fade-in">
                 <div className="relative">
                     <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-cyan-500/5 rounded-xl pointer-events-none"></div>
                     <textarea
                         value={aiInputText}
                         onChange={(e) => setAiInputText(e.target.value)}
                         placeholder="試著輸入：昨天跟朋友吃火鍋花了 1200 元..."
                         className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                     />
                 </div>
                 <p className="text-xs text-slate-500 flex items-center gap-1.5">
                     <Info size={12}/> AI 將自動分析日期、金額、分類與項目名稱。
                 </p>
                 <Button 
                    onClick={handleAIAnalyze} 
                    disabled={isAnalyzing || !aiInputText.trim() || !hasApiKey}
                    className="w-full py-3 bg-gradient-to-r from-primary to-cyan-600 hover:from-primary-hover hover:to-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                 >
                    {isAnalyzing ? '分析中...' : (hasApiKey ? '立即分析並帶入' : '請先設定 API Key')} <Wand2 size={16} className="ml-1"/>
                 </Button>
             </div>
         ) : (
             <div className="space-y-4 animate-fade-in">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setFormData({...formData, type: 'EXPENSE', category: '餐飲'})}
                            className={`flex-1 py-1.5 text-sm rounded font-medium transition-all ${formData.type === 'EXPENSE' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            支出
                        </button>
                        <button 
                            onClick={() => setFormData({...formData, type: 'INCOME', category: '薪資'})}
                            className={`flex-1 py-1.5 text-sm rounded font-medium transition-all ${formData.type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            收入
                        </button>
                     </div>
                     <Input 
                        type="date" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                        className="bg-slate-900 text-center"
                     />
                 </div>

                 <div>
                    <label className="block text-xs text-slate-400 mb-1">項目名稱</label>
                    <Input 
                        placeholder="例如：午餐、薪水" 
                        value={formData.item || ''} 
                        onChange={e => setFormData({...formData, item: e.target.value})} 
                        className="h-11 bg-slate-900"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs text-slate-400 mb-1">分類</label>
                       <Select 
                          value={formData.category} 
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="h-11 bg-slate-900"
                       >
                          {(formData.type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                              <option key={c} value={c}>{c}</option>
                          ))}
                       </Select>
                    </div>
                    <div>
                       <label className="block text-xs text-slate-400 mb-1">金額</label>
                       <Input 
                            type="number" 
                            placeholder="0" 
                            className="text-lg font-mono h-11 bg-slate-900"
                            value={formData.amount || ''} 
                            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                       />
                    </div>
                 </div>
                 
                 <div className="pt-2">
                    <Button className="w-full py-3" onClick={handleSubmit}>確認新增</Button>
                 </div>
             </div>
         )}
      </div>
    </Modal>
  );
};

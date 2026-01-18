
import React from 'react';

// 此元件功能 (AI 庫存/損益匯入) 已於 V5.3 Lite 版本中移除以精簡程式碼。
// 保留此檔案佔位，防止 import error，但移除實際邏輯以減少 bundle size。

interface InvestmentAIModalProps {
  uploadResult: any;
  onClose: () => void;
  onConfirmInventory: () => void;
  onConfirmTransactions: () => void;
}

export const InvestmentAIModal: React.FC<InvestmentAIModalProps> = () => {
  return null;
};

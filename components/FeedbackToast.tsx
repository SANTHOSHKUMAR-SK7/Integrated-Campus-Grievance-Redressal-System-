import React, { useEffect } from 'react';

type FeedbackToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
};

const FeedbackToast: React.FC<FeedbackToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const accent = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-slate-900',
    info: 'bg-slate-900 text-white',
  }[type];

  return (
    <div className="fixed right-4 bottom-4 z-[999] max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className={`flex items-center justify-between gap-4 px-5 py-4 ${accent}`}>
        <p className="text-sm font-semibold leading-snug">{message}</p>
        <button onClick={onClose} className="text-sm font-black opacity-80 hover:opacity-100 transition-opacity">
          ×
        </button>
      </div>
    </div>
  );
};

export default FeedbackToast;

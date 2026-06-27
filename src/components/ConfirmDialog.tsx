import React from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 p-4">
      <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-2xl border border-slate-200">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-red-600">Confirm Action</p>
            <h3 className="mt-3 text-2xl font-black text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-all"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-red-700 transition-all"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

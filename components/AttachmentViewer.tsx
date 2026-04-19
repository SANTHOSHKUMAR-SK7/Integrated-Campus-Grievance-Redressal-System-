import React from 'react';
import { Download, Eye } from 'lucide-react';
import {
  Attachment,
  downloadAttachment,
  viewAttachment,
  getFileIcon,
  formatFileSize,
  getReadableMimeType,
} from '../utils/attachmentUtils';

interface AttachmentViewerProps {
  attachments: Attachment[] | undefined;
  grievanceId: string;
}

const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ attachments, grievanceId }) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        Attachments ({attachments.length})
      </h4>

      <div className="space-y-3">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id || index}
            className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl">{getFileIcon(attachment.attachmentType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {attachment.name || `attachment-${index + 1}`}
                </p>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    {getReadableMimeType(attachment.attachmentType)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    - {formatFileSize(attachment.attachmentData || '', attachment.size)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  void viewAttachment(attachment, grievanceId);
                }}
                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all active:scale-95 flex items-center justify-center"
                title="View attachment"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  void downloadAttachment(attachment, grievanceId);
                }}
                className="p-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all active:scale-95 flex items-center justify-center"
                title="Download attachment"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] font-bold text-slate-400 mt-4 px-2">
        Hover over attachments to view or download
      </p>
    </div>
  );
};

export default AttachmentViewer;

/**
 * Attachment Utility Functions
 * Handles downloading and viewing of grievance attachments
 */

export interface Attachment {
  name: string;
  attachmentType: string;
  attachmentData: string;
}

/**
 * Download attachment as a file
 * @param attachment - The attachment object containing data and metadata
 * @param grievanceId - The grievance ID (for organizing downloads)
 */
export const downloadAttachment = (attachment: Attachment, grievanceId: string) => {
  try {
    if (!attachment.attachmentData) {
      console.error('No attachment data found');
      return;
    }

    // Handle both data:image/... format and raw base64
    let base64Data = attachment.attachmentData;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    // Decode base64
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and download
    const blob = new Blob([bytes], { type: attachment.attachmentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name || `attachment-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    alert('Failed to download attachment. Please try again.');
  }
};

/**
 * Open attachment in a new tab for viewing
 * @param attachment - The attachment object
 */
export const viewAttachment = (attachment: Attachment) => {
  try {
    if (!attachment.attachmentData) {
      console.error('No attachment data found');
      return;
    }

    // Convert base64 to blob for better browser support
    let base64Data = attachment.attachmentData;
    
    // If it's already a data URL, extract just the base64 part
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob from binary data
    const blob = new Blob([bytes], { type: attachment.attachmentType });
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Open in new window/tab
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      alert('Please allow pop-ups to view attachments');
    }
  } catch (error) {
    console.error('Error viewing attachment:', error);
    alert('Failed to view attachment. Please check the file format or try downloading instead.');
  }
};

/**
 * Get file icon based on MIME type
 */
export const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('video')) return '🎥';
  if (mimeType.includes('audio')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
  return '📎';
};

/**
 * Format file size for display
 */
export const formatFileSize = (base64String: string): string => {
  // Rough estimation: base64 is ~33% larger than binary
  const bytes = Math.round((base64String.length * 3) / 4);
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Get human-readable MIME type
 */
export const getReadableMimeType = (mimeType: string): string => {
  const types: { [key: string]: string } = {
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'application/pdf': 'PDF Document',
    'text/plain': 'Text File',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'application/zip': 'ZIP Archive',
  };
  
  return types[mimeType] || mimeType || 'Document';
};

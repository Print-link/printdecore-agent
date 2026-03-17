import { useEffect } from 'react';
import { useThemeClasses } from '../../lib/theme';

interface FilePreviewProps {
  fileName: string;
  fileUrl: string;
}

// Utility function to get file type
const getFileType = (fileName: string): 'image' | 'pdf' | 'document' | 'unknown' => {
  if (!fileName) return 'unknown';
  const lowerName = fileName.toLowerCase();

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  if (imageExtensions.some(ext => lowerName.endsWith(ext))) return 'image';

  if (lowerName.endsWith('.pdf')) return 'pdf';

  const documentExtensions = ['.doc', '.docx', '.txt', '.rtf'];
  if (documentExtensions.some(ext => lowerName.endsWith(ext))) return 'document';

  return 'unknown';
};

export function FilePreview({ fileName, fileUrl }: FilePreviewProps) {
  const t = useThemeClasses();
  const fileType = getFileType(fileName);

  // Simple download handler - just opens the file URL
  const handleDownload = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank');
  };

  // Block print functionality
  useEffect(() => {
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      alert('Printing is disabled');
    };

    const handlePrintShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert('Printing is disabled');
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('keydown', handlePrintShortcut);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('keydown', handlePrintShortcut);
    };
  }, []);

  const downloadBtnClass = `px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-transform ${
    t.isDark
      ? 'bg-amber-500 hover:bg-amber-600 text-black'
      : 'bg-amber-400 hover:bg-amber-500 text-black'
  }`;

  const secondaryBtnClass = `inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-transform border ${
    t.isDark
      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
  } hover:scale-105`;

  if (fileType === 'image' && fileUrl) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 p-3 rounded-xl min-h-[600px] h-full overflow-auto ${
        t.isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-[calc(100%-60px)] object-contain rounded-lg"
        />
        <button
          onClick={handleDownload}
          disabled={!fileUrl}
          className={`${downloadBtnClass} ${!fileUrl ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
        >
          ⬇️ Download
        </button>
      </div>
    );
  }

  if (fileType === 'pdf' && fileUrl) {
    // Force HTTPS for production compatibility
    const secureUrl = fileUrl.startsWith('http://')
      ? fileUrl.replace('http://', 'https://')
      : fileUrl.startsWith('//')
        ? `https:${fileUrl}`
        : fileUrl;

    // Use Google Docs Viewer for more robust production rendering
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(secureUrl)}&embedded=true`;

    return (
      <div
        className={`p-0 rounded-xl h-full min-h-[600px] overflow-hidden relative select-none flex flex-col ${
          t.isDark ? "bg-gray-800" : "bg-white"
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex-1 relative">
          <iframe
            src={googleViewerUrl}
            className="w-full h-full border-none rounded-t-lg"
            title={fileName}
          />
        </div>
        <div className={`p-3 border-t flex justify-center gap-4 ${
          t.isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <button
            onClick={handleDownload}
            className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-transform hover:scale-105 ${
              t.isDark
                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                : 'bg-amber-400 hover:bg-amber-500 text-black'
            }`}
          >
            ⬇️ Download
          </button>
          <a
            href={secureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-transform hover:scale-105 border ${
              t.isDark
                ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🔗 Open Original
          </a>
        </div>
      </div>
    );
  }

  if (fileType === 'document' && fileUrl) {
    // Use Microsoft Office Online Viewer for Word documents
    // This works with publicly accessible URLs
    const isDocx =
      fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
    const viewerUrl = isDocx
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
      : fileUrl;

    return (
      <div
        className={`p-4 rounded-xl h-full min-h-[600px] flex flex-col gap-3 ${
          t.isDark ? 'bg-gray-800' : 'bg-white'
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            disabled={!fileUrl}
            className={`px-4 py-2 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-transform ${
              t.isDark
                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                : 'bg-amber-400 hover:bg-amber-500 text-black'
            } ${!fileUrl ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            ⬇️ Download
          </button>
        </div>
        <div className="flex-1 overflow-hidden relative select-none rounded-lg border min-h-0">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-none rounded-lg"
            title={fileName}
            allow="fullscreen"
          />
        </div>
      </div>
    );
  }

  // Default/Unknown file type
  const fileIcon = fileType === 'document' ? '📝' : '📄';
  const fileTypeLabel = getFileType(fileName) === 'document' ? 'DOCUMENT' : 'FILE';

  return (
    <div className={`p-16 text-center rounded-xl h-full min-h-[400px] flex flex-col justify-center ${
      t.isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className="text-7xl mb-4 opacity-60">
        {fileIcon}
      </div>
      <p className={`text-lg font-bold mb-2 ${t.text}`}>
        {fileName}
      </p>
      <p className={t.textSecondary}>
        {fileTypeLabel}
      </p>
      {fileUrl && (
        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={handleDownload}
            disabled={!fileUrl}
            className={`${downloadBtnClass} ${!fileUrl ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
          >
            ⬇️ Download
          </button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryBtnClass}
          >
            🔗 Open File
          </a>
        </div>
      )}
    </div>
  );
}

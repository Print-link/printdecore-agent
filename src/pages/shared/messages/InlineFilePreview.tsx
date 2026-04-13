import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import {
  FileText,
  Download,
  Printer,
  Eye,
  X,
  Spinner,
  ChevronLeft,
  ChevronRight,
} from "../../../components/icons";

// PDF.js worker — use local copy from node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// ─── Helpers ──────────────────────────────────────────────────────────

type FileKind = "image" | "pdf" | "document" | "spreadsheet" | "audio" | "video" | "unknown";

function classifyFile(filename?: string, mediaType?: string): FileKind {
  if (mediaType === "image" || mediaType === "sticker") return "image";
  if (mediaType === "audio") return "audio";
  if (mediaType === "video") return "video";

  const name = (filename || "").toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (/\.(docx?|rtf|odt)$/.test(name)) return "document";
  if (/\.(xlsx?|csv|ods)$/.test(name)) return "spreadsheet";
  if (/\.(pptx?)$/.test(name)) return "document";
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(name)) return "video";
  if (/\.(mp3|m4a|ogg|wav|aac)$/.test(name)) return "audio";

  // Cloudinary URL hints
  if (filename) {
    const lower = filename.toLowerCase();
    if (lower.includes("pdf")) return "pdf";
    if (lower.includes("doc")) return "document";
    if (lower.includes("xls")) return "spreadsheet";
  }

  if (mediaType === "document") return "document";
  return "unknown";
}

function getSecureUrl(url: string): string {
  if (url.startsWith("http://")) return url.replace("http://", "https://");
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function getFileExtLabel(filename?: string): string {
  if (!filename) return "FILE";
  const ext = filename.split(".").pop()?.toUpperCase();
  return ext || "FILE";
}

const EXT_COLORS: Record<string, string> = {
  PDF: "text-red-500", DOC: "text-blue-500", DOCX: "text-blue-500",
  XLS: "text-green-600", XLSX: "text-green-600", CSV: "text-green-600",
  PPT: "text-orange-500", PPTX: "text-orange-500", TXT: "text-gray-500",
};

// ─── Props ────────────────────────────────────────────────────────────

interface InlineFilePreviewProps {
  url: string;
  filename?: string;
  mediaType?: string;
  isFromMe: boolean;
  onSave: () => void;
  downloading: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────

export default function InlineFilePreview({
  url, filename, mediaType, isFromMe, onSave, downloading,
}: InlineFilePreviewProps) {
  const t = useThemeClasses();
  const kind = classifyFile(filename, mediaType);
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const secureUrl = getSecureUrl(url);

  const handlePrint = useCallback(() => {
    if (kind === "image") {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(
          `<html><head><title>Print</title></head>` +
          `<body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh">` +
          `<img src="${secureUrl}" style="max-width:100%;max-height:100vh" onload="window.print();window.close()" />` +
          `</body></html>`
        );
        win.document.close();
      }
      return;
    }
    const win = window.open(secureUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => { try { win.print(); } catch { /* cross-origin */ } });
    }
  }, [kind, secureUrl]);

  const ActionBar = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("flex items-center gap-1", compact ? "mt-1.5" : "mt-2")}>
      <Btn icon={downloading ? Spinner : Download} label={compact ? "" : "Save"} onClick={onSave} disabled={downloading} isFromMe={isFromMe} />
      <Btn icon={Printer} label={compact ? "" : "Print"} onClick={handlePrint} isFromMe={isFromMe} />
    </div>
  );

  // ─── IMAGE ──────────────────────────────────────────────────────────
  if (kind === "image") {
    return (
      <div className="mb-1">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          {!imgLoaded && (
            <div className={cn("w-full aspect-[4/3] rounded-lg animate-pulse", isFromMe ? "bg-amber-300/30" : t.isDark ? "bg-gray-600" : "bg-gray-200")} />
          )}
          <img
            src={url}
            alt={filename || "Image"}
            className={cn("max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity", imgLoaded ? "block" : "hidden")}
            style={{ maxHeight: 400, objectFit: "contain" }}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; setImgLoaded(true); }}
          />
        </a>
        <ActionBar compact />
      </div>
    );
  }

  // ─── PDF (react-pdf thumbnail) ──────────────────────────────────────
  if (kind === "pdf") {
    return (
      <div className="mb-1 w-full min-w-[240px] max-w-[360px]">
        <div className={cn("rounded-lg border overflow-hidden", isFromMe ? "border-amber-500/30" : t.isDark ? "border-gray-600" : "border-gray-200")}>
          <PdfThumbnail url={secureUrl} isFromMe={isFromMe} onExpand={() => setExpanded(true)} />
          <FileInfoBar filename={filename || "Document.pdf"} ext="PDF" iconColor="text-red-500" isFromMe={isFromMe} />
        </div>
        <ActionBar />
        {expanded && (
          <PdfFullViewer
            url={secureUrl}
            filename={filename || "Document.pdf"}
            onClose={() => setExpanded(false)}
            onPrint={handlePrint}
            onSave={onSave}
            downloading={downloading}
          />
        )}
      </div>
    );
  }

  // ─── VIDEO ──────────────────────────────────────────────────────────
  if (kind === "video") {
    return (
      <div className="mb-1">
        <video src={url} controls className="max-w-full rounded-lg" style={{ maxHeight: 300 }} />
        <ActionBar compact />
      </div>
    );
  }

  // ─── AUDIO ──────────────────────────────────────────────────────────
  if (kind === "audio") {
    return (
      <div className="mb-1">
        <audio src={url} controls className="w-full" />
        <ActionBar compact />
      </div>
    );
  }

  // ─── DOCUMENT / SPREADSHEET / UNKNOWN ───────────────────────────────
  const ext = getFileExtLabel(filename);
  const iconColor = EXT_COLORS[ext] || "text-amber-500";
  const isOffice = /\.(docx?|xlsx?|pptx?)$/i.test(filename || "");

  return (
    <div className="mb-1 w-full min-w-[240px] max-w-[360px]">
      <div className={cn("rounded-lg border overflow-hidden", isFromMe ? "border-amber-500/30" : t.isDark ? "border-gray-600" : "border-gray-200")}>
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "w-full flex flex-col items-center justify-center gap-3 py-8 cursor-pointer transition-colors group border-none",
            isFromMe ? "bg-amber-300/10 hover:bg-amber-300/20" : t.isDark ? "bg-gray-700/50 hover:bg-gray-700/80" : "bg-gray-50 hover:bg-gray-100",
          )}
        >
          <div className="relative">
            <FileText size={48} className={cn(iconColor, "opacity-60 group-hover:opacity-100 transition-opacity")} />
            <span className={cn(
              "absolute -bottom-1 -right-2 text-[9px] font-black px-1.5 py-0.5 rounded",
              isFromMe ? "bg-amber-400 text-amber-900" : t.isDark ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-600",
            )}>
              {ext}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">
            <Eye size={14} />
            <span>Open preview</span>
          </div>
        </button>
        <FileInfoBar filename={filename || "Document"} ext={ext} iconColor={iconColor} isFromMe={isFromMe} />
      </div>
      <ActionBar />
      {expanded && (
        <DocFullViewer
          url={secureUrl}
          filename={filename || "Document"}
          isOffice={isOffice}
          onClose={() => setExpanded(false)}
          onPrint={handlePrint}
          onSave={onSave}
          downloading={downloading}
        />
      )}
    </div>
  );
}

// ─── PDF Thumbnail (first page) ───────────────────────────────────────

function PdfThumbnail({ url, isFromMe, onExpand }: { url: string; isFromMe: boolean; onExpand: () => void }) {
  const t = useThemeClasses();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button onClick={onExpand} className="relative w-full cursor-pointer border-none p-0 bg-gray-100 dark:bg-gray-800 group block" style={{ minHeight: 200 }}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <FileText size={36} className="text-red-500 opacity-50" />
          <span className={cn("text-xs", t.textSecondary)}>Preview unavailable</span>
        </div>
      ) : (
        <Document
          file={url}
          onLoadSuccess={() => setLoaded(true)}
          onLoadError={() => setError(true)}
          loading={null}
        >
          <Page
            pageNumber={1}
            width={358}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      )}
      <div className={cn(
        "absolute inset-x-0 bottom-0 h-10 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gradient-to-t transition-opacity opacity-0 group-hover:opacity-100",
        isFromMe ? "from-amber-400/90 text-amber-900" : t.isDark ? "from-gray-900/90 text-gray-300" : "from-white/90 text-gray-600",
      )}>
        <Eye size={14} />
        Expand
      </div>
    </button>
  );
}

// ─── PDF Full Viewer (all pages, scrollable) ──────────────────────────

function PdfFullViewer({
  url, filename, onClose, onPrint, onSave, downloading,
}: {
  url: string; filename: string; onClose: () => void; onPrint: () => void; onSave: () => void; downloading: boolean;
}) {
  const t = useThemeClasses();
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(800);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Toolbar */}
      <div
        className={cn("relative z-10 flex items-center justify-between px-4 py-2.5 shrink-0 border-b", t.isDark ? "bg-gray-900/95" : "bg-white/95", t.border)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={20} className="text-red-500 shrink-0" />
          <span className={cn("text-sm font-semibold truncate", t.text)}>{filename}</span>
        </div>

        {/* Page nav */}
        {numPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={cn("p-1.5 rounded-lg transition-colors disabled:opacity-30", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={cn("text-xs font-medium tabular-nums", t.textSecondary)}>
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className={cn("p-1.5 rounded-lg transition-colors disabled:opacity-30", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onSave} disabled={downloading} className={cn("p-2 rounded-lg transition-colors", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")} title="Download">
            {downloading ? <Spinner size="xs" /> : <Download size={18} />}
          </button>
          <button onClick={onPrint} className={cn("p-2 rounded-lg transition-colors", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")} title="Print">
            <Printer size={18} />
          </button>
          <button onClick={onClose} className={cn("p-2 rounded-lg transition-colors", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Pages */}
      <div
        className="relative z-10 flex-1 min-h-0 overflow-auto bg-gray-200 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        ref={(el) => { if (el) setContainerWidth(el.clientWidth); }}
      >
        <div className="flex flex-col items-center py-4 gap-4">
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={
              <div className="flex items-center justify-center py-20">
                <Spinner size="md" />
              </div>
            }
          >
            {numPages > 0 && Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="shadow-lg rounded-sm overflow-hidden">
                <Page
                  pageNumber={i + 1}
                  width={Math.min(containerWidth - 32, 900)}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}

// ─── Document Full Viewer (Office / Google Docs iframe) ───────────────

function DocFullViewer({
  url, filename, isOffice, onClose, onPrint, onSave, downloading,
}: {
  url: string; filename: string; isOffice: boolean; onClose: () => void; onPrint: () => void; onSave: () => void; downloading: boolean;
}) {
  const t = useThemeClasses();
  const viewerSrc = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={cn("relative z-10 flex items-center justify-between px-4 py-2.5 shrink-0 border-b", t.isDark ? "bg-gray-900/95" : "bg-white/95", t.border)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={20} className="text-blue-500 shrink-0" />
          <span className={cn("text-sm font-semibold truncate", t.text)}>{filename}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onSave} disabled={downloading} className={cn("p-2 rounded-lg transition-colors", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")} title="Download">
            {downloading ? <Spinner size="xs" /> : <Download size={18} />}
          </button>
          <button onClick={onPrint} className={cn("p-2 rounded-lg transition-colors", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")} title="Print">
            <Printer size={18} />
          </button>
          <button onClick={onClose} className={cn("p-2 rounded-lg transition-colors", t.isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500")} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="relative z-10 flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
        <iframe src={viewerSrc} className="w-full h-full border-none" title={filename} allow="fullscreen" />
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────

function Btn({ icon: Icon, label, onClick, disabled, isFromMe }: {
  icon: React.ComponentType<{ size?: number; className?: string }>; label: string; onClick: () => void; disabled?: boolean; isFromMe: boolean;
}) {
  const t = useThemeClasses();
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
        isFromMe ? "bg-amber-500/30 hover:bg-amber-500/50 text-amber-900" : t.isDark ? "bg-gray-600 hover:bg-gray-500 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function FileInfoBar({ filename, ext, iconColor, isFromMe }: { filename: string; ext: string; iconColor: string; isFromMe: boolean }) {
  const t = useThemeClasses();
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2", isFromMe ? "bg-amber-500/20" : t.isDark ? "bg-gray-700" : "bg-gray-50")}>
      <FileText size={18} className={cn(iconColor, "shrink-0")} />
      <span className={cn("text-xs font-medium truncate flex-1", isFromMe ? "text-amber-900" : t.text)}>{filename}</span>
      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", isFromMe ? "bg-amber-500/30 text-amber-800" : t.isDark ? "bg-gray-600 text-gray-300" : "bg-gray-200 text-gray-500")}>{ext}</span>
    </div>
  );
}

import { useState, useRef, type FormEvent, type DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/api";
import { Upload, File, X, RefreshCw, CheckCircle, Plus, Minus, Spinner } from "../../components/icons";
import { Card, Button, Select } from "../../components/ui";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import type { PrintJob } from "../../types";

interface FileInfo { name: string; file: File; size: number; type: string }

const ALLOWED_EXT = ["pdf", "txt", "doc", "docx", "jpg", "jpeg", "png", "gif", "bmp", "rtf", "html"];
const ACCEPT = ALLOWED_EXT.map(e => `.${e}`).join(",");

export default function SubmitPage() {
  const t = useThemeClasses();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [printer, setPrinter] = useState("");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"color" | "grayscale" | "black-white">("color");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: printers = [], isLoading: isLoadingPrinters, refetch: refetchPrinters } = useQuery({
    queryKey: ["printers"],
    queryFn: () => apiService.getAgents(),
    staleTime: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: async (jobData: Partial<Omit<PrintJob, "id" | "submittedAt" | "customerId" | "customerName" | "fileName" | "fileSize" | "fileType" | "status" | "priority" | "pages" | "cost">>) => {
      if (!selectedFile) throw new Error("No file selected");
      const uploadResult = await apiService.uploadFile(selectedFile.file);
      const job = await apiService.createJob({
        customerId: "current-user", customerName: uploadResult.fileName,
        fileName: uploadResult.fileName, fileSize: uploadResult.fileSize,
        fileType: selectedFile.type, status: "pending", priority: "medium",
        pages: copies, cost: 0, ...jobData,
      });
      if (printers.length > 0 && printer) await apiService.submitJobToPrinter(job.id, printer);
      return job;
    },
    onSuccess: () => {
      setSubmitSuccess(true); setSelectedFile(null); setCopies(1);
      setColorMode("color"); setOrientation("portrait"); setDescription(""); setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setTimeout(() => setSubmitSuccess(false), 3000);
    },
    onError: (error: any) => setSubmitError(error?.message || "Failed to submit print job"),
  });

  const processFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXT.includes(ext)) {
      setSubmitError(`File type .${ext} is not supported. Allowed: ${ALLOWED_EXT.join(", ")}`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) { setSubmitError("File size must be less than 50MB"); return; }
    setSelectedFile({ name: file.name, file, size: file.size, type: file.type || ext || "unknown" });
    setSubmitError(null);
  };

  const handleDrag = (e: DragEvent, enter: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(enter); };
  const handleDrop = (e: DragEvent) => { handleDrag(e, false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };
  const handleRemoveFile = () => { setSelectedFile(null); setSubmitError(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !printer) { setSubmitError(!selectedFile ? "Please select a file" : "Please select a printer"); return; }
    if (copies < 1 || copies > 100) { setSubmitError("Copies must be between 1 and 100"); return; }
    submitMutation.mutate({ printerId: printer || undefined });
  };

  const fmt = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  return (
    <div className={cn("p-6 max-w-3xl mx-auto", t.text)}>
      <Card raised padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className={cn("text-2xl font-bold flex items-center gap-3", t.text)}>
            <Upload className="text-amber-400" size={28} />
            Submit New Print Job
          </h2>
          <Button variant="secondary" icon={RefreshCw} onClick={() => refetchPrinters()} disabled={isLoadingPrinters}>
            Refresh
          </Button>
        </div>

        {submitSuccess && (
          <div className={cn("mb-6 p-4 rounded-md flex items-center gap-3", t.isDark ? "bg-green-900/30 border border-green-800 text-green-400" : "bg-green-50 border border-green-200 text-green-600")}>
            <CheckCircle size={20} />
            <span className="font-semibold">Print job submitted successfully!</span>
          </div>
        )}

        {submitError && (
          <div className={cn("mb-6 p-4 rounded-md flex items-center justify-between gap-3", t.isDark ? "bg-red-900/30 border border-red-800 text-red-400" : "bg-red-50 border border-red-200 text-red-600")}>
            <span className="font-semibold flex-1">{submitError}</span>
            <button onClick={() => setSubmitError(null)} className="p-1 rounded hover:bg-red-900/20"><X size={16} /></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Selection */}
          <div>
            <label className={cn("block text-sm font-medium mb-2", t.textSecondary)}>
              Select File <span className="text-red-500">*</span>
            </label>
            {selectedFile ? (
              <div className={cn("p-4 rounded-lg border-2 border-amber-400 flex items-center gap-4", t.isDark ? "bg-gray-700" : "bg-gray-50")}>
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", t.isDark ? "bg-gray-600" : "bg-amber-100")}>
                  <File className="text-amber-400" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold truncate", t.text)}>{selectedFile.name}</p>
                  <div className={cn("flex gap-3 text-xs", t.textSecondary)}>
                    <span>{selectedFile.type}</span><span>•</span><span>{fmt(selectedFile.size)}</span>
                  </div>
                </div>
                <button type="button" onClick={handleRemoveFile} className={cn("p-2 rounded-md hover:bg-red-500 hover:text-white transition-colors", t.textSecondary)}>
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => handleDrag(e, true)} onDragLeave={(e) => handleDrag(e, false)} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn("border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                  isDragging ? "border-amber-400 bg-amber-50 dark:bg-amber-900/10"
                    : t.isDark ? "border-gray-600 bg-gray-700/50 hover:border-gray-500" : "border-gray-300 bg-gray-50 hover:border-gray-400")}
              >
                <Upload className={cn("mx-auto mb-4", t.textTertiary)} size={48} />
                <p className={cn("font-semibold mb-2", t.textSecondary)}>{isDragging ? "Drop file here" : "Click to select or drag and drop"}</p>
                <p className="text-sm text-gray-500">PDF, DOC, DOCX, TXT, JPG, PNG, GIF, BMP, RTF, HTML</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" onChange={handleFileChange} accept={ACCEPT} className="hidden" />
          </div>

          {/* Printer Selection */}
          <div>
            {isLoadingPrinters ? (
              <div className={cn("p-4 text-center", t.textSecondary)}>Loading printers...</div>
            ) : printers.length === 0 ? (
              <div className={cn("p-4 text-center rounded-lg", t.surface)}>
                <p className={cn("mb-2", t.textSecondary)}>No printers available</p>
                <Button onClick={() => refetchPrinters()} size="sm">Retry</Button>
              </div>
            ) : (
              <Select label="Select Printer *" value={printer} onChange={(e) => setPrinter(e.target.value)} placeholder="Select a printer"
                options={printers.map((p: any) => ({ value: p.id, label: `${p.name}${p.status ? ` (${p.status})` : ""}` }))} required />
            )}
          </div>

          {/* Copies */}
          <div>
            <label className={cn("block text-sm font-medium mb-2", t.textSecondary)}>Number of Copies</label>
            <div className="flex items-center gap-3">
              <Button variant="secondary" type="button" onClick={() => setCopies(Math.max(1, copies - 1))} disabled={copies <= 1} className="p-2"><Minus size={20} /></Button>
              <input type="number" value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))} min={1} max={100}
                className={cn("flex-1 px-4 py-2 rounded-lg border text-center font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400", t.input)} />
              <Button variant="secondary" type="button" onClick={() => setCopies(Math.min(100, copies + 1))} disabled={copies >= 100} className="p-2"><Plus size={20} /></Button>
            </div>
            <p className="text-xs mt-2 text-gray-500">Between 1 and 100 copies</p>
          </div>

          {/* Print Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Color Mode" value={colorMode} onChange={(e) => setColorMode(e.target.value as any)}
              options={[{ value: "color", label: "Color" }, { value: "grayscale", label: "Grayscale" }, { value: "black-white", label: "Black & White" }]} />
            <Select label="Orientation" value={orientation} onChange={(e) => setOrientation(e.target.value as any)}
              options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
          </div>

          {/* Description */}
          <div>
            <label className={cn("block text-sm font-medium mb-2", t.textSecondary)}>Description / Notes (Optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add any notes or description for this print job..."
              rows={3} maxLength={500} className={cn("w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400", t.input)} />
            <p className="text-xs mt-1 text-right text-gray-500">{description.length}/500 characters</p>
          </div>

          <Button type="submit" loading={submitMutation.isPending} disabled={!selectedFile || !printer || submitMutation.isPending || isLoadingPrinters}
            icon={submitMutation.isPending ? undefined : Upload} className="w-full py-3 shadow-md hover:shadow-lg">
            {submitMutation.isPending ? "Submitting..." : "Submit Print Job"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

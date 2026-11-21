import { useState } from 'react';
import { Check, Download, Eye, FileText, Printer, Spinner } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import { canPrint, formatBytes, KIND_ACCENT, previewUrl, printFile, saveFile, type OrderFile } from '../../../lib/files';
import { FileTypeIcon } from './FileTypeIcon';

interface FileListProps {
	files: OrderFile[];
	title?: string;
	/** Open the in-app preview; without it, Preview opens the file in a new tab */
	onPreview?: (index: number) => void;
	/** Highlights the file open in the preview */
	activeIndex?: number | null;
}

type RowState = 'idle' | 'saving' | 'saved';

/**
 * The file's picture: a real thumbnail where there is one (images, the first
 * page of a PDF), otherwise an illustration of that kind of file.
 */
function FileTile({ file, dark }: { file: OrderFile; dark: boolean }) {
	const [broken, setBroken] = useState(false);
	const src = previewUrl(file);
	if (src && !broken) {
		return (
			<span className={`relative h-12 w-10 shrink-0 overflow-hidden rounded-md ring-1 ${dark ? 'ring-gray-600 bg-gray-800' : 'ring-gray-200 bg-white'} shadow-sm`}>
				<img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
				<span
					className="absolute bottom-0.5 left-0.5 rounded-[3px] px-1 text-[8px] font-extrabold leading-[12px] tracking-wide text-white"
					style={{ backgroundColor: KIND_ACCENT[file.kind] }}
				>
					{file.ext.slice(0, 4)}
				</span>
			</span>
		);
	}
	return <FileTypeIcon kind={file.kind} ext={file.ext} dark={dark} className="shrink-0" />;
}

/**
 * The files on an order or request, as a list: what each one is, how big,
 * and buttons to preview or download it — or download them all.
 */
export function FileList({ files, title = 'Files', onPreview, activeIndex }: FileListProps) {
	const t = useThemeClasses();
	const [state, setState] = useState<Record<number, RowState>>({});
	const [savingAll, setSavingAll] = useState(false);
	const [printing, setPrinting] = useState<number | null>(null);

	if (files.length === 0) return null;

	const total = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
	const set = (i: number, s: RowState) => setState((prev) => ({ ...prev, [i]: s }));

	const download = async (i: number) => {
		set(i, 'saving');
		await saveFile(files[i]);
		set(i, 'saved');
		setTimeout(() => set(i, 'idle'), 2000);
	};

	const print = async (i: number) => {
		setPrinting(i);
		try {
			await printFile(files[i]);
		} finally {
			setPrinting(null);
		}
	};

	const downloadAll = async () => {
		setSavingAll(true);
		// One after another: browsers block a burst of downloads at once
		for (let i = 0; i < files.length; i++) {
			await download(i);
			await new Promise((r) => setTimeout(r, 300));
		}
		setSavingAll(false);
	};

	const iconBtn = `inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
		t.isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
	}`;

	return (
		<section aria-label={title} className={`rounded-lg border ${t.isDark ? 'border-gray-700' : 'border-gray-200'}`}>
			<header
				className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${
					t.isDark ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'
				} rounded-t-lg`}
			>
				<p className={`flex items-center gap-1.5 text-xs font-semibold ${t.text}`}>
					<FileText size={14} />
					{title}
					<span className={`font-normal ${t.textSecondary}`}>
						· {files.length}
						{total > 0 ? ` · ${formatBytes(total)}` : ''}
					</span>
				</p>
				{files.length > 1 && (
					<button
						type="button"
						onClick={downloadAll}
						disabled={savingAll}
						className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
							t.isDark ? 'text-amber-300 hover:bg-gray-700' : 'text-amber-700 hover:bg-amber-50'
						}`}
					>
						{savingAll ? <Spinner size="sm" /> : <Download size={14} />}
						{savingAll ? 'Downloading…' : 'Download all'}
					</button>
				)}
			</header>

			<ul className={`divide-y ${t.isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
				{files.map((file, i) => {
					const s = state[i] ?? 'idle';
					const meta = [
						file.ext,
						formatBytes(file.size),
						file.width && file.height ? `${file.width}×${file.height}px` : '',
					].filter(Boolean);
					const active = activeIndex === i;
					return (
						<li
							key={`${file.url}-${i}`}
							className={`flex items-center gap-3 px-3 py-2 ${active ? (t.isDark ? 'bg-amber-500/10' : 'bg-amber-50') : ''}`}
						>
							<FileTile file={file} dark={t.isDark} />
							<div className="min-w-0 flex-1">
								<p className={`truncate text-sm font-medium ${t.text}`} title={file.name}>
									{file.name}
								</p>
								<p className={`text-xs ${t.textSecondary}`}>{meta.join(' · ')}</p>
							</div>
							<div className="flex shrink-0 items-center gap-0.5">
								{canPrint(file) && (
									<button
										type="button"
										onClick={() => print(i)}
										disabled={printing !== null}
										aria-label={`Print ${file.name}`}
										title="Print without downloading"
										className={`mr-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
											t.isDark ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-gray-900 text-white hover:bg-gray-700'
										}`}
									>
										{printing === i ? <Spinner size="sm" /> : <Printer size={14} />}
										<span>{printing === i ? 'Preparing…' : 'Print'}</span>
									</button>
								)}
								{onPreview ? (
									<button type="button" onClick={() => onPreview(i)} className={iconBtn} aria-label={`Preview ${file.name}`} title="Preview">
										<Eye size={16} />
									</button>
								) : (
									<a href={file.url} target="_blank" rel="noreferrer" className={iconBtn} aria-label={`Open ${file.name}`} title="Open">
										<Eye size={16} />
									</a>
								)}
								<button
									type="button"
									onClick={() => download(i)}
									disabled={s === 'saving'}
									className={iconBtn}
									aria-label={`Download ${file.name}`}
									title="Download"
								>
									{s === 'saving' ? <Spinner size="sm" /> : s === 'saved' ? <Check size={16} className="text-emerald-500" /> : <Download size={16} />}
								</button>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

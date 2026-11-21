import { useState } from 'react';
import { Check, Download, Eye, FileText, Spinner } from '../../icons';
import { useThemeClasses } from '../../../lib/theme';
import { formatBytes, saveFile, type FileKind, type OrderFile } from '../../../lib/files';

interface FileListProps {
	files: OrderFile[];
	title?: string;
	/** Open the in-app preview; without it, Preview opens the file in a new tab */
	onPreview?: (index: number) => void;
	/** Highlights the file open in the preview */
	activeIndex?: number | null;
}

/** Badge colours per kind, so a print file is recognisable at a glance */
const KIND_STYLE: Record<FileKind, { light: string; dark: string }> = {
	pdf: { light: 'bg-red-50 text-red-700 ring-red-200', dark: 'bg-red-500/15 text-red-300 ring-red-500/30' },
	image: { light: 'bg-sky-50 text-sky-700 ring-sky-200', dark: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
	doc: { light: 'bg-blue-50 text-blue-700 ring-blue-200', dark: 'bg-blue-500/15 text-blue-300 ring-blue-500/30' },
	sheet: { light: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dark: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
	slides: { light: 'bg-orange-50 text-orange-700 ring-orange-200', dark: 'bg-orange-500/15 text-orange-300 ring-orange-500/30' },
	design: { light: 'bg-violet-50 text-violet-700 ring-violet-200', dark: 'bg-violet-500/15 text-violet-300 ring-violet-500/30' },
	archive: { light: 'bg-amber-50 text-amber-800 ring-amber-200', dark: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
	other: { light: 'bg-gray-100 text-gray-600 ring-gray-200', dark: 'bg-gray-700 text-gray-300 ring-gray-600' },
};

type RowState = 'idle' | 'saving' | 'saved';

function FileTile({ file, dark }: { file: OrderFile; dark: boolean }) {
	const [broken, setBroken] = useState(false);
	const style = KIND_STYLE[file.kind];
	if (file.kind === 'image' && !broken) {
		return (
			<img
				src={file.url}
				alt=""
				loading="lazy"
				onError={() => setBroken(true)}
				className={`h-10 w-10 shrink-0 rounded-md object-cover ring-1 ${dark ? 'ring-gray-600' : 'ring-gray-200'}`}
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={`h-10 w-10 shrink-0 rounded-md ring-1 flex items-center justify-center text-[10px] font-bold tracking-wide ${dark ? style.dark : style.light}`}
		>
			{file.ext.slice(0, 4)}
		</span>
	);
}

/**
 * The files on an order or request, as a list: what each one is, how big,
 * and buttons to preview or download it — or download them all.
 */
export function FileList({ files, title = 'Files', onPreview, activeIndex }: FileListProps) {
	const t = useThemeClasses();
	const [state, setState] = useState<Record<number, RowState>>({});
	const [savingAll, setSavingAll] = useState(false);

	if (files.length === 0) return null;

	const total = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
	const set = (i: number, s: RowState) => setState((prev) => ({ ...prev, [i]: s }));

	const download = async (i: number) => {
		set(i, 'saving');
		await saveFile(files[i]);
		set(i, 'saved');
		setTimeout(() => set(i, 'idle'), 2000);
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

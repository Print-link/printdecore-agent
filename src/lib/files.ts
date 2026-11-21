/**
 * Order files as the app shows them: a clean name, what kind of file it is,
 * its size, and a download that saves the file instead of opening it.
 */

/** Any of the shapes files arrive in (uploads, Cloudinary results, requests) */
export interface FileLike {
	url?: string;
	fileUrl?: string;
	secure_url?: string;
	name?: string;
	originalName?: string;
	original_filename?: string;
	publicId?: string;
	type?: string;
	format?: string;
	size?: number;
	bytes?: number;
	width?: number;
	height?: number;
}

export type FileKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'design' | 'archive' | 'other';

/** Each kind's accent, used for the label band and the drawing on the page */
export const KIND_ACCENT: Record<FileKind, string> = {
	pdf: '#DC2626',
	image: '#0284C7',
	doc: '#2563EB',
	sheet: '#16A34A',
	slides: '#EA580C',
	design: '#7C3AED',
	archive: '#CA8A04',
	other: '#64748B',
};

export interface OrderFile {
	url: string;
	name: string;
	/** Upper-case extension, e.g. "PDF" */
	ext: string;
	kind: FileKind;
	size?: number;
	width?: number;
	height?: number;
}

const KIND_BY_EXT: Record<string, FileKind> = {
	jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', heic: 'image', bmp: 'image', tif: 'image', tiff: 'image',
	pdf: 'pdf',
	doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc', txt: 'doc',
	xls: 'sheet', xlsx: 'sheet', csv: 'sheet', ods: 'sheet',
	ppt: 'slides', pptx: 'slides', odp: 'slides', key: 'slides',
	ai: 'design', psd: 'design', eps: 'design', indd: 'design', cdr: 'design', sketch: 'design', fig: 'design',
	zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
};

const extOf = (s?: string) => {
	const m = s?.split(/[?#]/)[0].match(/\.([a-z0-9]{1,5})$/i);
	return m ? m[1].toLowerCase() : '';
};

const extFromMime = (mime?: string) => {
	if (!mime) return '';
	if (mime === 'application/pdf') return 'pdf';
	if (mime.startsWith('image/')) return mime.slice(6).replace('jpeg', 'jpg').replace('svg+xml', 'svg');
	if (mime.includes('wordprocessing') || mime === 'application/msword') return 'docx';
	if (mime.includes('spreadsheet') || mime.includes('excel')) return 'xlsx';
	if (mime.includes('presentation') || mime.includes('powerpoint')) return 'pptx';
	if (mime.includes('zip')) return 'zip';
	return '';
};

/** One normalised file, or null when there's nothing to open */
export function toOrderFile(raw: unknown, index = 0): OrderFile | null {
	if (!raw || typeof raw !== 'object') return typeof raw === 'string' && raw ? toOrderFile({ url: raw }, index) : null;
	const f = raw as FileLike;
	const url = f.url || f.fileUrl || f.secure_url || '';
	if (!url) return null;
	const fromUrl = decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() || '');
	let name = f.name || f.originalName || f.original_filename || f.publicId?.split('/').pop() || fromUrl || `File ${index + 1}`;
	const ext = extOf(name) || (f.format || '').toLowerCase() || extFromMime(f.type) || extOf(url);
	if (ext && !extOf(name)) name = `${name}.${ext}`;
	return {
		url,
		name,
		ext: ext.toUpperCase() || 'FILE',
		kind: KIND_BY_EXT[ext] ?? (f.type?.startsWith('image/') ? 'image' : 'other'),
		size: f.size ?? f.bytes,
		width: f.width,
		height: f.height,
	};
}

export const toOrderFiles = (raw: unknown): OrderFile[] =>
	Array.isArray(raw) ? raw.map(toOrderFile).filter((f): f is OrderFile => !!f) : [];

export function formatBytes(bytes?: number): string {
	if (!bytes || bytes <= 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Cloudinary serves a file as a download when asked to */
const asAttachment = (url: string) =>
	/res\.cloudinary\.com/.test(url) && url.includes('/upload/') && !url.includes('fl_attachment')
		? url.replace('/upload/', '/upload/fl_attachment/')
		: url;

/**
 * Save a file under its own name. Fetches it so the browser downloads rather
 * than opens it; if the host won't allow that, asks the host for a download
 * instead (or opens it in a new tab as a last resort).
 */
export async function saveFile(file: Pick<OrderFile, 'url' | 'name'>): Promise<void> {
	try {
		const res = await fetch(file.url, { mode: 'cors' });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const blob = await res.blob();
		const href = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = href;
		a.download = file.name;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(href), 1000);
	} catch {
		const a = document.createElement('a');
		a.href = asAttachment(file.url);
		a.target = '_blank';
		a.rel = 'noopener';
		a.download = file.name;
		document.body.appendChild(a);
		a.click();
		a.remove();
	}
}

/** PDFs can go straight to the printer from the app */
export const canPrint = (file: Pick<OrderFile, 'kind'>) => file.kind === 'pdf';

let printFrame: HTMLIFrameElement | null = null;

/**
 * Open the browser's print dialog for a PDF without downloading it: the file
 * is loaded into a hidden frame from memory and printed from there. If the
 * host won't hand the file over (or the browser can't print a frame), the PDF
 * opens in a new tab, where it prints with the viewer's print button.
 */
export async function printFile(file: Pick<OrderFile, 'url' | 'name'>): Promise<'printed' | 'opened'> {
	try {
		const res = await fetch(file.url, { mode: 'cors' });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.blob();
		// Only print a real PDF (a missing file can come back as an HTML page)
		if ((await data.slice(0, 5).text()) !== '%PDF-') throw new Error('Not a PDF');
		const blob = new Blob([data], { type: 'application/pdf' });
		const href = URL.createObjectURL(blob);

		printFrame?.remove();
		const frame = document.createElement('iframe');
		frame.title = `Print ${file.name}`;
		frame.setAttribute('aria-hidden', 'true');
		// Off screen but laid out: some browsers won't print a display:none frame
		Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0' });
		printFrame = frame;

		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('Timed out loading the PDF')), 20000);
			frame.onload = () => {
				clearTimeout(timer);
				// Give the PDF viewer a moment to render before printing
				setTimeout(() => {
					try {
						frame.contentWindow?.focus();
						frame.contentWindow?.print();
						resolve();
					} catch (e) {
						reject(e);
					}
				}, 400);
			};
			frame.src = href;
			document.body.appendChild(frame);
		});
		// Keep the file around while the dialog is open; free it later
		setTimeout(() => URL.revokeObjectURL(href), 60_000);
		return 'printed';
	} catch {
		window.open(file.url, '_blank', 'noopener');
		return 'opened';
	}
}

/**
 * A small picture of the file: images as themselves, and PDFs stored on
 * Cloudinary as their first page. Null when there's nothing to show.
 */
export function previewUrl(file: Pick<OrderFile, 'url' | 'kind'>): string | null {
	if (file.kind === 'image') return file.url;
	if (file.kind === 'pdf' && /res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(file.url)) {
		return file.url.replace('/image/upload/', '/image/upload/pg_1,w_120,h_144,c_fill,g_north,f_jpg/').replace(/\.pdf(?=$|[?#])/i, '.jpg');
	}
	return null;
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from '../icons';

interface ErrorBoundaryProps {
	children: ReactNode;
	/** Changing this (e.g. the page's path) clears the error, so navigating recovers */
	resetKey?: string;
	/** A card inside the app's layout, instead of a full page */
	inline?: boolean;
}

interface ErrorBoundaryState {
	error: Error | null;
}

const RELOADED = 'pd:chunk-reload';

/** A page's code failed to download — usually a new version was deployed */
const isChunkError = (error: Error) =>
	/Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
		error.message,
	);

/**
 * Catches a screen that crashes while drawing, so staff see what happened and
 * a way out — with the menu still there — instead of a blank page. After a
 * deploy, a page whose old code is gone is fixed by reloading once, by itself.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('Screen crashed:', error, info.componentStack);
		if (isChunkError(error)) {
			try {
				if (!sessionStorage.getItem(RELOADED)) {
					sessionStorage.setItem(RELOADED, '1');
					window.location.reload();
				}
			} catch {
				/* storage blocked: show the card */
			}
		}
	}

	componentDidUpdate(prev: ErrorBoundaryProps) {
		if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
	}

	render() {
		const { error } = this.state;
		if (!error) return this.props.children;
		const update = isChunkError(error);

		return (
			<div
				role="alert"
				className={`flex items-center justify-center px-4 ${
					this.props.inline ? 'py-16' : 'min-h-screen bg-gray-50 dark:bg-gray-900'
				}`}
			>
				<div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
					<span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
						<AlertTriangle size={26} />
					</span>
					<h1 className="text-base font-semibold text-gray-900 dark:text-white">
						{update ? 'A new version of Printdecore is ready' : 'This page ran into a problem'}
					</h1>
					<p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
						{update
							? 'Reload to get the latest version.'
							: 'Nothing was lost — your orders are safe. Reload the page, or go back to Home.'}
					</p>
					{!update && import.meta.env.DEV && (
						<pre className="mt-4 max-h-32 overflow-auto rounded-md bg-gray-100 p-2 text-left text-[11px] text-red-700 dark:bg-gray-900 dark:text-red-300">
							{error.message}
						</pre>
					)}
					<div className="mt-5 flex justify-center gap-2">
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-amber-400 dark:text-black dark:hover:bg-amber-300"
						>
							<RefreshCw size={16} /> Reload
						</button>
						{!update && (
							<a
								href="/app/home"
								className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
							>
								<Home size={16} /> Home
							</a>
						)}
					</div>
				</div>
			</div>
		);
	}
}

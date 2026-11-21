import { Link, Navigate, useLocation } from 'react-router-dom';
import { Home, Search } from '../../components/icons';

/**
 * A link outside /app (an old bookmark like /orders) goes to the same page
 * inside the app; anything else gets a clear "not found" with a way back.
 */
export function LegacyRedirect() {
	const { pathname, search } = useLocation();
	if (!pathname.startsWith('/app')) return <Navigate to={`/app${pathname}${search}`} replace />;
	return <NotFoundPage />;
}

export default function NotFoundPage() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4" role="status">
			<div className="w-full max-w-md text-center">
				<span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
					<Search size={24} />
				</span>
				<p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Page not found</p>
				<h1 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">We couldn't find that page</h1>
				<p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
					The link may be old, or the page may have moved. Everything you need is in the menu.
				</p>
				<Link
					to="/app/home"
					className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-amber-400 dark:text-black dark:hover:bg-amber-300"
				>
					<Home size={16} /> Go to Home
				</Link>
			</div>
		</div>
	);
}

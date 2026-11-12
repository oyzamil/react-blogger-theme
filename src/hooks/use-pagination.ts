import { useEffect, useMemo, useState } from "react";

import {
	buildPageHref,
	fetchPageBoundary,
	fetchPostRank,
	fetchTotalPosts,
	getPageRange,
	getPerPage,
	hasPagingParams,
	type PageRangeOptions,
} from "@/lib/blogger";

import { useBlogger } from "@/contexts/blogger";

export interface PaginationPageItem {
	type: "page";
	page: number;
	/** null while the URL is still being resolved. */
	href: string | null;
	current: boolean;
}

export interface PaginationEllipsisItem {
	type: "ellipsis";
	key: "start-ellipsis" | "end-ellipsis";
}

export type PaginationItem = PaginationPageItem | PaginationEllipsisItem;

export interface UsePaginationOptions extends PageRangeOptions {
	/**
	 * `true`: numbered pages (needs a few small feed requests).
	 * `false`: only Blogger's own newer/older links, no extra requests.
	 */
	numbers?: boolean;
}

export type PaginationStatus =
	/** Everything fits on one page: render nothing. */
	| "single"
	/** Numbers are being resolved. Prev/next already work. */
	| "loading"
	| "ready"
	/** Feed requests failed: fall back to prev/next only. */
	| "error";

export interface UsePaginationResult {
	status: PaginationStatus;
	/** Current page, null until known. */
	page: number | null;
	totalPages: number | null;
	perPage: number;
	/** true: template has no `json:pager`, numbers come from the feed only. */
	derived: boolean;
	/** Newer posts (previous page). */
	prevHref: string | null;
	/** Older posts (next page). */
	nextHref: string | null;
	items: PaginationItem[];
}

interface Resolved {
	page: number;
	totalPages: number;
	hrefs: Record<number, string>;
}

/**
 * Headless pagination state for the current Blogger listing page.
 * Use it to build any UI; `<Pagination />` is one example.
 */
export function usePagination({
	numbers = true,
	siblings = 1,
	boundaries = 1,
}: UsePaginationOptions = {}): UsePaginationResult {
	const { data } = useBlogger();
	const { pager } = data;

	// No json:pager in the template: everything comes from the feed, and the
	// neighbours (page +-1) are always resolved so prev/next work in any variant.
	const derived = !!pager.derived;
	const perPage = getPerPage(pager, data.blog.homepageUrl, data.view.url);
	const single = !derived && !pager.newer && !pager.older;
	const wantFeed = !single && (numbers || derived);
	const sib = Math.max(1, siblings);

	const [resolved, setResolved] = useState<Resolved | null>(null);
	const [failed, setFailed] = useState(false);

	// Reset whenever the listing page changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: view.url is the page identity
	useEffect(() => {
		setResolved(null);
		setFailed(false);
	}, [data.view.url]);

	// 1. total pages + current page
	useEffect(() => {
		if (!wantFeed) return;
		const controller = new AbortController();
		const { signal } = controller;

		(async () => {
			try {
				const total = await fetchTotalPosts(data, signal);
				const totalPages = Math.max(1, Math.ceil(total / perPage));

				// First page = no newer link (or, derived: no paging params in the URL).
				const isFirst = derived
					? !hasPagingParams(data.view.url, data.blog.homepageUrl)
					: !pager.newer;

				let page = 1;
				if (!isFirst) {
					const first = Object.values(data.posts)[0];
					if (first) {
						const rank = await fetchPostRank(data, first.published, signal);
						page = Math.min(
							totalPages,
							Math.max(1, Math.floor((rank - 1) / perPage) + 1),
						);
					}
				}
				if (!derived && !pager.older) page = totalPages;

				const hrefs: Record<number, string> = {};
				const firstHref = buildPageHref(data, 1, perPage);
				if (firstHref) hrefs[1] = firstHref;
				hrefs[page] = data.view.url;

				setResolved({ page, totalPages, hrefs });
			} catch (error) {
				if ((error as Error).name !== "AbortError") setFailed(true);
			}
		})();

		return () => controller.abort();
	}, [data, perPage, pager.newer, pager.older, derived, wantFeed]);

	const { page, totalPages } = resolved ?? { page: null, totalPages: null };

	// 2. URLs of the pages that are actually shown (+ neighbours)
	const [hrefs, setHrefs] = useState<Record<number, string>>({});

	const visible = useMemo(
		() =>
			page && totalPages
				? getPageRange(page, totalPages, { siblings: sib, boundaries })
				: [],
		[page, totalPages, sib, boundaries],
	);

	useEffect(() => {
		setHrefs(resolved?.hrefs ?? {});
		if (!resolved) return;

		const controller = new AbortController();
		const wanted = new Set<number>(
			visible.filter((p): p is number => typeof p === "number"),
		);
		wanted.add(resolved.page - 1);
		wanted.add(resolved.page + 1);

		for (const p of wanted) {
			if (p < 2 || p > resolved.totalPages || resolved.hrefs[p]) continue;
			fetchPageBoundary(data, p, perPage, controller.signal)
				.then((boundary) => {
					const href = buildPageHref(data, p, perPage, boundary);
					if (href) setHrefs((prev) => ({ ...prev, [p]: href }));
				})
				.catch((error) => {
					if ((error as Error).name !== "AbortError") setFailed(true);
				});
		}

		return () => controller.abort();
	}, [resolved, visible, data, perPage]);

	const items = useMemo<PaginationItem[]>(
		() =>
			visible.map((item) =>
				typeof item === "number"
					? {
							type: "page",
							page: item,
							href: hrefs[item] ?? null,
							current: item === page,
						}
					: { type: "ellipsis", key: item },
			),
		[visible, hrefs, page],
	);

	// Derived: prev/next come from the resolved neighbours, otherwise from Blogger.
	const prevHref = derived ? (page && page > 1 ? (hrefs[page - 1] ?? null) : null) : pager.newer;
	const nextHref = derived
		? page && totalPages && page < totalPages
			? (hrefs[page + 1] ?? null)
			: null
		: pager.older;

	return {
		status: single || (derived && totalPages === 1)
			? "single"
			: !wantFeed
				? "ready"
				: failed
					? "error"
					: resolved
						? "ready"
						: "loading",
		page,
		totalPages,
		perPage,
		derived,
		prevHref,
		nextHref,
		items,
	};
}

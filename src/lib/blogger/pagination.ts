import type { BloggerData, Pager } from "./types";

/* -------------------------------------------------------------------------- */
/*  Page range (which numbers to show)                                        */
/* -------------------------------------------------------------------------- */

export type PageRangeItem = number | "start-ellipsis" | "end-ellipsis";

export interface PageRangeOptions {
	/** Pages shown on each side of the current page. */
	siblings?: number;
	/** Pages always shown at the start and at the end. */
	boundaries?: number;
}

const range = (start: number, end: number): number[] =>
	end < start ? [] : Array.from({ length: end - start + 1 }, (_, i) => start + i);

/**
 * `1 … 4 5 [6] 7 8 … 20`
 *
 * Pure function, no Blogger knowledge. Always returns the same number of slots
 * for a given `siblings`/`boundaries` so the control does not jump around.
 */
export function getPageRange(
	current: number,
	total: number,
	{ siblings = 1, boundaries = 1 }: PageRangeOptions = {},
): PageRangeItem[] {
	if (total < 1) return [];

	const startPages = range(1, Math.min(boundaries, total));
	const endPages = range(
		Math.max(total - boundaries + 1, boundaries + 1),
		total,
	);

	const siblingsStart = Math.max(
		Math.min(current - siblings, total - boundaries - siblings * 2 - 1),
		boundaries + 2,
	);
	const siblingsEnd = Math.min(
		Math.max(current + siblings, boundaries + siblings * 2 + 2),
		endPages.length > 0 ? (endPages[0] as number) - 2 : total - 1,
	);

	return [
		...startPages,
		...(siblingsStart > boundaries + 2
			? (["start-ellipsis"] as const)
			: boundaries + 1 < total - boundaries
				? [boundaries + 1]
				: []),
		...range(siblingsStart, siblingsEnd),
		...(siblingsEnd < total - boundaries - 1
			? (["end-ellipsis"] as const)
			: total - boundaries > boundaries
				? [total - boundaries]
				: []),
		...endPages,
	];
}

/* -------------------------------------------------------------------------- */
/*  Blogger URLs                                                              */
/* -------------------------------------------------------------------------- */

/** Query params Blogger uses for paging. Removed when building a page URL. */
const PAGING_PARAMS = [
	"updated-max",
	"updated-min",
	"published-max",
	"published-min",
	"start",
	"by-date",
	"reverse-paginate",
	"max-results",
] as const;

/**
 * Posts per page. Blogger puts `max-results` in its own newer/older links, so
 * read it from there; fall back to the number of posts on this page.
 */
export function getPerPage(
	pager: Pager,
	base: string,
	viewUrl?: string,
): number {
	for (const link of [pager.older, pager.newer, viewUrl]) {
		if (!link) continue;
		const value = Number(new URL(link, base).searchParams.get("max-results"));
		if (Number.isInteger(value) && value > 0) return value;
	}
	return Math.max(pager.count, 1);
}

/** true when the URL is a later page (carries one of Blogger's paging params). */
export function hasPagingParams(url: string, base: string): boolean {
	const { searchParams } = new URL(url, base);
	return ["updated-max", "updated-min", "start", "reverse-paginate"].some((p) =>
		searchParams.has(p),
	);
}

/**
 * `updated-max` as Blogger expects it: seconds precision, offset kept.
 * Dropping the milliseconds makes the bound slightly *earlier* than the post,
 * so the boundary post itself is excluded from the next page.
 */
export function toUpdatedMax(iso: string): string {
	const m = iso.match(
		/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
	);
	return m ? `${m[1]}${m[2]}` : iso;
}

/**
 * URL of page `page`.
 *
 * Uses Blogger's own newer/older link as a template, so the path, `q`, label
 * and any other parameter Blogger adds are preserved without us knowing about
 * them. `boundary` is the `published` time of the last post of page `page - 1`.
 */
export function buildPageHref(
	data: BloggerData,
	page: number,
	perPage: number,
	boundary?: string,
): string | null {
	// Without json:pager there are no newer/older links: use the page's own URL.
	const template =
		data.pager.older ?? data.pager.newer ?? (data.pager.derived ? data.view.url : null);
	if (!template) return null;

	const base = data.blog.homepageUrl;
	const url = new URL(template, base);
	// Blogger pages the homepage through /search.
	if (page > 1 && url.pathname === "/") url.pathname = "/search";
	const hadStart = url.searchParams.has("start");
	const hadByDate = url.searchParams.get("by-date");

	for (const param of PAGING_PARAMS) url.searchParams.delete(param);

	if (page <= 1) {
		// Page 1 of the whole blog is the homepage, not `/search`.
		if (url.pathname === "/search" && !url.search) {
			return new URL("/", base).toString();
		}
		return url.toString();
	}

	if (!boundary) return null;

	url.searchParams.set("updated-max", toUpdatedMax(boundary));
	url.searchParams.set("max-results", String(perPage));
	if (hadStart) url.searchParams.set("start", String((page - 1) * perPage));
	if (hadByDate !== null) url.searchParams.set("by-date", hadByDate);

	return url.toString();
}

/* -------------------------------------------------------------------------- */
/*  Blogger feed (page count, current page, page boundaries)                  */
/* -------------------------------------------------------------------------- */

interface FeedJson {
	feed: {
		"openSearch$totalResults"?: { $t: string };
		entry?: { published: { $t: string } }[];
	};
}

interface FeedScope {
	path: string;
	params: Record<string, string>;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Which posts the current listing page is paging through. */
export function getFeedScope(data: BloggerData): FeedScope {
	const { view } = data;
	const search = view.search;

	if (search?.type === "label") {
		return {
			path: `/feeds/posts/summary/-/${encodeURIComponent(search.label)}`,
			params: {},
		};
	}

	if (search?.type === "query") {
		return { path: "/feeds/posts/summary", params: { q: search.query } };
	}

	if (view.isArchive) {
		// /2026/01/ or /2026/01/15/. Best effort: bounds are in the blog's time zone.
		const m = new URL(view.url).pathname.match(
			/^\/(\d{4})\/(\d{2})(?:\/(\d{2}))?/,
		);
		if (m) {
			const [, y, mo, d] = m;
			const start = new Date(Date.UTC(+y!, +mo! - 1, d ? +d : 1));
			const end = new Date(start);
			if (d) end.setUTCDate(end.getUTCDate() + 1);
			else end.setUTCMonth(end.getUTCMonth() + 1);
			const fmt = (x: Date) =>
				`${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}T00:00:00`;
			return {
				path: "/feeds/posts/summary",
				params: { "published-min": fmt(start), "published-max": fmt(end) },
			};
		}
	}

	return { path: "/feeds/posts/summary", params: {} };
}

const feedCache = new Map<string, Promise<FeedJson["feed"]>>();

function fetchFeed(
	data: BloggerData,
	extra: Record<string, string>,
	signal?: AbortSignal,
): Promise<FeedJson["feed"]> {
	const scope = getFeedScope(data);
	const url = new URL(scope.path, data.blog.homepageUrl);
	url.searchParams.set("alt", "json");
	url.searchParams.set("orderby", "published");
	for (const [k, v] of Object.entries({ ...scope.params, ...extra })) {
		url.searchParams.set(k, v);
	}

	const key = url.toString();
	let promise = feedCache.get(key);

	if (!promise) {
		// Not tied to one caller's signal: the result is shared through the cache.
		promise = fetch(key)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Feed request failed (${response.status})`);
				}
				return response.json() as Promise<FeedJson>;
			})
			.then((json) => json.feed)
			.catch((error) => {
				feedCache.delete(key);
				throw error;
			});
		feedCache.set(key, promise);
	}

	return signal
		? new Promise((resolve, reject) => {
				signal.addEventListener("abort", () =>
					reject(new DOMException("Aborted", "AbortError")),
				);
				promise.then(resolve, reject);
			})
		: promise;
}

const totalOf = (feed: FeedJson["feed"]): number =>
	Number(feed["openSearch$totalResults"]?.$t ?? 0);

/** Total posts in the current scope (label / search / archive / whole blog). */
export async function fetchTotalPosts(
	data: BloggerData,
	signal?: AbortSignal,
): Promise<number> {
	return totalOf(await fetchFeed(data, { "max-results": "1" }, signal));
}

/**
 * 1-based position of a post in the scope (newest = 1).
 * = number of posts published at or after it.
 */
export async function fetchPostRank(
	data: BloggerData,
	published: string,
	signal?: AbortSignal,
): Promise<number> {
	const feed = await fetchFeed(
		data,
		{ "max-results": "1", "published-min": published },
		signal,
	);
	return totalOf(feed);
}

/** `published` of the last post of page `page - 1` (= post number `(page-1)*perPage`). */
export async function fetchPageBoundary(
	data: BloggerData,
	page: number,
	perPage: number,
	signal?: AbortSignal,
): Promise<string> {
	const feed = await fetchFeed(
		data,
		{ "max-results": "1", "start-index": String((page - 1) * perPage) },
		signal,
	);
	const published = feed.entry?.[0]?.published.$t;
	if (!published) throw new Error(`No boundary post for page ${page}`);
	return published;
}

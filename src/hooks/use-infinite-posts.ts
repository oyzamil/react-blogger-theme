import { useCallback, useEffect, useRef, useState } from "react";

import {
	buildPageHref,
	fetchBlogger,
	fetchPageBoundary,
	type Post,
	type PostMinimal,
} from "@/lib/blogger";

import { useBlogger } from "@/contexts/blogger";
import { usePagination } from "@/hooks/use-pagination";

export interface UseInfinitePostsOptions {
	/** Start loading when the sentinel is this close to the viewport. */
	rootMargin?: string;
	/** `false`: never load by scrolling, call `loadMore()` yourself (button). */
	auto?: boolean;
}

export interface UseInfinitePostsResult {
	/** Posts loaded AFTER the ones of the current page (those are rendered by the page). */
	posts: (PostMinimal | Post)[];
	status: "idle" | "loading" | "error" | "done";
	/** More pages exist. */
	hasMore: boolean;
	loadMore: () => void;
	/** Attach to an element placed after the list. */
	sentinelRef: (node: Element | null) => void;
}

/**
 * Headless infinite scroll for any Blogger listing page.
 * Follows the same pages `<Pagination />` would link to, but appends their
 * posts instead of navigating.
 */
export function useInfinitePosts({
	rootMargin = "600px",
	auto = true,
}: UseInfinitePostsOptions = {}): UseInfinitePostsResult {
	const { data } = useBlogger();
	// numbers are not needed: only the next link / next page number
	const pagination = usePagination({ numbers: false });
	const derived = !!data.pager.derived;

	const [posts, setPosts] = useState<(PostMinimal | Post)[]>([]);
	const [status, setStatus] = useState<UseInfinitePostsResult["status"]>("idle");

	// Where the next page is. null = no more pages (or not known yet).
	const cursor = useRef<{ href: string | null; page: number } | null>(null);
	const seen = useRef(new Set<string>(Object.keys(data.posts)));
	const busy = useRef(false);
	// cursor is a ref (no re-render): this tells the scroll trigger it can start
	const [ready, setReady] = useState(false);
	// +1 after every finished load: re-arms the observer even when `status`
	// ends up unchanged (a fast load can go idle -> loading -> idle in one tick)
	const [loads, setLoads] = useState(0);

	// first cursor: ready as soon as the pager (or the feed, if derived) answered
	useEffect(() => {
		if (cursor.current || pagination.status === "loading") return;

		if (pagination.status === "single") {
			cursor.current = { href: null, page: 1 };
			setStatus("done");
			return;
		}
		if (pagination.status === "error") {
			setStatus("error");
			return;
		}

		// derived: the link to the next page is fetched after the page count
		const waiting =
			derived &&
			pagination.page !== null &&
			pagination.totalPages !== null &&
			pagination.page < pagination.totalPages &&
			!pagination.nextHref;
		if (waiting) return;

		cursor.current = { href: pagination.nextHref, page: pagination.page ?? 1 };
		if (pagination.nextHref) setReady(true);
		else setStatus("done");
	}, [
		derived,
		pagination.status,
		pagination.nextHref,
		pagination.page,
		pagination.totalPages,
	]);

	const loadMore = useCallback(async () => {
		const current = cursor.current;
		if (busy.current || !current?.href) return;

		busy.current = true;
		setStatus("loading");

		try {
			const next = await fetchBlogger(current.href, {
				mobile: data.blog.isMobileRequest ? "force" : "ignore",
				content: false,
			}).asData();

			const fresh = Object.values(next.posts).filter(
				(post) => !seen.current.has(post.id),
			);
			for (const post of fresh) seen.current.add(post.id);
			setPosts((prev) => [...prev, ...fresh]);

			const page = current.page + 1;
			let href: string | null;

			if (!derived) {
				// the loaded page carries Blogger's own link to the one after it
				href = next.pager.older;
			} else if (pagination.totalPages && page < pagination.totalPages) {
				const boundary = await fetchPageBoundary(
					data,
					page + 1,
					pagination.perPage,
				);
				href = buildPageHref(data, page + 1, pagination.perPage, boundary);
			} else {
				href = null;
			}

			cursor.current = { href, page };
			setStatus(href && fresh.length > 0 ? "idle" : "done");
			setLoads((n) => n + 1);
		} catch {
			setStatus("error");
		} finally {
			busy.current = false;
		}
	}, [data, derived, pagination.totalPages, pagination.perPage]);

	// scroll trigger
	const [node, setNode] = useState<Element | null>(null);
	useEffect(() => {
		if (!auto || !node || !ready) return;
		if (status === "loading" || status === "done" || status === "error") return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) void loadMore();
			},
			{ rootMargin },
		);
		observer.observe(node);
		return () => observer.disconnect();
		// re-observed after every load: a sentinel that is still in view
		// (short page, tall screen) triggers the next load
	}, [auto, node, ready, status, loads, rootMargin, loadMore]);

	return {
		posts,
		status,
		hasMore: status !== "done",
		loadMore: () => void loadMore(),
		sentinelRef: setNode,
	};
}

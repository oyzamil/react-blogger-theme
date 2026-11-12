import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";

import type { Post, PostMinimal } from "@/lib/blogger";

import { useBlogger } from "@/contexts/blogger";
import { useInfinitePosts } from "@/hooks/use-infinite-posts";
import { type UsePaginationOptions, usePagination } from "@/hooks/use-pagination";

import {
	Pagination as PaginationRoot,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

import PostCard from "./PostCard";

export interface PaginationProps
	extends Omit<ComponentProps<"nav">, "children">,
		UsePaginationOptions {
	/**
	 * `numbers`: `‹ 1 … 4 [5] 6 … 20 ›` (a few small feed requests).
	 * `simple`: `‹ Newer · Older ›` using only Blogger's own links.
	 * `infinite`: renders the posts of the NEXT pages below the list you already
	 * render, loading them while you scroll (or on a button, see `trigger`).
	 */
	variant?: "numbers" | "simple" | "infinite";
	/** Label of the previous-page (newer posts) button. */
	prevLabel?: ReactNode;
	/** Label of the next-page (older posts) button. */
	nextLabel?: ReactNode;
	/** Render `Page 5 of 20` under the numbers. */
	showSummary?: boolean;

	/* ---- variant="infinite" ---- */
	/** `scroll`: load automatically. `button`: load on click. Default `scroll`. */
	trigger?: "scroll" | "button";
	/** Start loading this far before the end of the list. Default `600px`. */
	rootMargin?: string;
	/** Render one loaded post. Default: `<PostCard />`. */
	renderPost?: (post: PostMinimal | Post) => ReactNode;
	/** Shown while loading. */
	loader?: ReactNode;
	/** Shown after the last page. `null` hides it. */
	endMessage?: ReactNode;
	/** Label of the button (`trigger="button"`) and of the retry button. */
	loadMoreLabel?: ReactNode;
}

/**
 * Pagination for any Blogger listing page (home, search, label, archive).
 * Reads everything it needs from the current page's Blogger data.
 */
export default function Pagination(props: PaginationProps) {
	const { data } = useBlogger();

	if (props.variant === "infinite") {
		// key: start over when the listing page changes
		return <InfinitePagination key={data.view.url} {...props} />;
	}

	return <PagedPagination {...props} />;
}

function PagedPagination({
	variant = "numbers",
	siblings,
	boundaries,
	prevLabel,
	nextLabel,
	showSummary = false,
	className,
	...props
}: PaginationProps) {
	const numbers = variant === "numbers";
	const { status, page, totalPages, items, prevHref, nextHref, derived } =
		usePagination({ numbers, siblings, boundaries });

	if (status === "single") return null;
	// no json:pager: nothing is known until the feed answers (avoids a flash)
	if (derived && status !== "ready") return null;

	// numbers failed to load: degrade to newer / older
	const showNumbers = numbers && status !== "error";
	const prev = prevLabel ?? (showNumbers ? "Previous" : "Newer");
	const next = nextLabel ?? (showNumbers ? "Next" : "Older");

	return (
		<div className="flex flex-col items-center gap-2">
			<PaginationRoot className={cn("mt-2", className)} {...props}>
				<PaginationContent>
					<PaginationItem>
						<PaginationLink
							asChild
							size="default"
							disabled={!prevHref}
							aria-label="Go to previous page"
							className="gap-1 px-2.5"
						>
							{prevHref ? (
								<Link prefetch="intent" to={prevHref} rel="prev">
									<ChevronLeftIcon />
									<span className="hidden sm:inline">{prev}</span>
								</Link>
							) : (
								<span>
									<ChevronLeftIcon />
									<span className="hidden sm:inline">{prev}</span>
								</span>
							)}
						</PaginationLink>
					</PaginationItem>

					{showNumbers && status === "loading" && <PaginationSkeleton />}

					{showNumbers &&
						items.map((item) =>
							item.type === "ellipsis" ? (
								<PaginationItem key={item.key}>
									<PaginationEllipsis />
								</PaginationItem>
							) : (
								<PaginationItem key={item.page}>
									<PaginationLink
										asChild
										isActive={item.current}
										disabled={!item.href}
										aria-label={`Go to page ${item.page}`}
									>
										{item.href && !item.current ? (
											<Link prefetch="intent" to={item.href}>
												{item.page}
											</Link>
										) : (
											<span>{item.page}</span>
										)}
									</PaginationLink>
								</PaginationItem>
							),
						)}

					<PaginationItem>
						<PaginationLink
							asChild
							size="default"
							disabled={!nextHref}
							aria-label="Go to next page"
							className="gap-1 px-2.5"
						>
							{nextHref ? (
								<Link prefetch="intent" to={nextHref} rel="next">
									<span className="hidden sm:inline">{next}</span>
									<ChevronRightIcon />
								</Link>
							) : (
								<span>
									<span className="hidden sm:inline">{next}</span>
									<ChevronRightIcon />
								</span>
							)}
						</PaginationLink>
					</PaginationItem>
				</PaginationContent>
			</PaginationRoot>

			{showSummary && showNumbers && page && totalPages && (
				<p className="text-muted-foreground text-xs">
					Page {page} of {totalPages}
				</p>
			)}
		</div>
	);
}

function PaginationSkeleton() {
	return (
		<>
			{[0, 1, 2].map((i) => (
				<PaginationItem key={i} aria-hidden>
					<span className="block size-8 animate-pulse rounded-lg bg-muted" />
				</PaginationItem>
			))}
		</>
	);
}

function InfinitePagination({
	trigger = "scroll",
	rootMargin,
	renderPost = (post) => <PostCard key={post.id} post={post} />,
	loader,
	endMessage = "You've reached the end.",
	loadMoreLabel,
	className,
}: PaginationProps) {
	const { posts, status, hasMore, loadMore, sentinelRef } = useInfinitePosts({
		rootMargin,
		auto: trigger === "scroll",
	});

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{posts.map((post) => renderPost(post))}

			{/* observed: when it comes near the viewport the next page loads */}
			<div ref={sentinelRef} aria-hidden className="h-px" />

			<div
				aria-live="polite"
				className="flex min-h-10 items-center justify-center text-muted-foreground text-sm"
			>
				{status === "loading" &&
					(loader ?? (
						<span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
					))}

				{status === "error" && (
					<Button variant="outline" size="sm" onClick={loadMore}>
						{loadMoreLabel ?? "Could not load. Try again"}
					</Button>
				)}

				{status === "idle" && trigger === "button" && (
					<Button variant="outline" size="sm" onClick={loadMore}>
						{loadMoreLabel ?? "Load more"}
					</Button>
				)}

				{!hasMore && posts.length > 0 && endMessage}
			</div>
		</div>
	);
}

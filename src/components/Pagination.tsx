import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";

import { type UsePaginationOptions, usePagination } from "@/hooks/use-pagination";

import {
	Pagination as PaginationRoot,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
} from "@/components/ui/pagination";
import { cn } from "@/utils/cn";

export interface PaginationProps
	extends Omit<ComponentProps<"nav">, "children">,
		UsePaginationOptions {
	/**
	 * `numbers`: `‹ 1 … 4 [5] 6 … 20 ›` (a few small feed requests).
	 * `simple`: `‹ Newer · Older ›` using only Blogger's own links.
	 */
	variant?: "numbers" | "simple";
	/** Label of the previous-page (newer posts) button. */
	prevLabel?: ReactNode;
	/** Label of the next-page (older posts) button. */
	nextLabel?: ReactNode;
	/** Render `Page 5 of 20` under the numbers. */
	showSummary?: boolean;
}

/**
 * Pagination for any Blogger listing page (home, search, label, archive).
 * Reads everything it needs from the current page's Blogger data.
 */
export default function Pagination({
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

import { MessageSquarePlusIcon, RefreshCwIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { type CommentSort, flattenCommentTree } from "@/lib/blogger";

import { Button, buttonVariants } from "@/components/ui/button";
import { CommentsContext } from "@/contexts/comments";
import { useComments } from "@/hooks/use-comments";
import { cn } from "@/utils/cn";

import CommentFrame from "./CommentFrame";
import CommentItem from "./CommentItem";

export interface CommentsProps {
	className?: string;
	/** Order of top-level comments. Replies are always oldest first. */
	defaultSort?: CommentSort;
	/** Top-level comments shown before "Show more". */
	pageSize?: number;
	/** Replies move right up to this depth, deeper ones keep the same indent. */
	maxDepth?: number;
	/** Height of Blogger's comment form (it cannot be measured, see CommentFrame). */
	frameHeight?: number;
	/** `collapsed`: a button opens the form (nothing loads until then). */
	formMode?: "collapsed" | "open";
	/** Replaces the title Blogger provides (`12 comments`). */
	heading?: ReactNode;
	emptyMessage?: ReactNode;
}

/**
 * Multi-level comments for the current post / page, with Blogger's own comment
 * form for new comments and replies. Renders nothing when comments are off.
 */
export default function Comments({
	className,
	defaultSort = "oldest",
	pageSize = 20,
	maxDepth = 4,
	frameHeight = 420,
	formMode = "collapsed",
	heading,
	emptyMessage = "No comments yet. Be the first.",
}: CommentsProps) {
	const { comments, tree, sort, setSort, refresh, refreshing } = useComments({
		defaultSort,
	});

	const [replyingTo, setReplyingTo] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(formMode === "open");
	const [visible, setVisible] = useState(pageSize);
	const [highlightId, setHighlightId] = useState<string | null>(null);

	// a comment was (probably) just sent: give Blogger a moment, then reload
	const onSubmitted = useCallback(() => {
		window.setTimeout(() => void refresh(), 1500);
	}, [refresh]);

	// `#c123` links: open, scroll to and highlight that comment
	const ids = useMemo(
		() => tree.map((root) => new Set(flattenCommentTree([root]).map((n) => n.id))),
		[tree],
	);
	useEffect(() => {
		const apply = () => {
			const id = window.location.hash.match(/^#c(\d+)$/)?.[1];
			if (!id) return;
			const rootIndex = ids.findIndex((set) => set.has(id));
			if (rootIndex < 0) return;
			setVisible((count) => Math.max(count, rootIndex + 1));
			setHighlightId(id);
			requestAnimationFrame(() =>
				document.getElementById(`c${id}`)?.scrollIntoView?.({ block: "center" }),
			);
		};
		apply();
		window.addEventListener("hashchange", apply);
		return () => window.removeEventListener("hashchange", apply);
	}, [ids]);

	if (
		!comments ||
		comments.setting === "disabled" ||
		comments.setting === "hidden"
	) {
		return null;
	}

	const location = comments.location;
	const canReply = comments.setting === "allowed" && !!location;
	const embedded = canReply && location.type === "embedded";
	const formUrl = embedded ? location.url : null;
	const fallbackUrl = canReply && !embedded ? location.url : null;

	return (
		<CommentsContext.Provider
			value={{
				formUrl,
				fallbackUrl,
				canReply,
				maxDepth,
				frameHeight,
				replyingTo,
				setReplyingTo,
				onSubmitted,
				highlightId,
			}}
		>
			<section
				id="comments"
				aria-labelledby="comments-title"
				className={cn("flex scroll-mt-20 flex-col gap-6", className)}
			>
				<header className="flex flex-wrap items-center justify-between gap-2">
					<h2 id="comments-title" className="font-semibold text-xl">
						{heading ?? comments.title}
					</h2>

					<div className="flex items-center gap-1">
						{tree.length > 1 && (
							<div role="group" aria-label="Sort comments" className="flex gap-1">
								{(["oldest", "newest"] as const).map((value) => (
									<Button
										key={value}
										size="sm"
										variant={sort === value ? "secondary" : "ghost"}
										aria-pressed={sort === value}
										onClick={() => setSort(value)}
									>
										{value === "oldest" ? "Oldest" : "Newest"}
									</Button>
								))}
							</div>
						)}
						<Button
							size="icon-sm"
							variant="ghost"
							aria-label="Reload comments"
							disabled={refreshing}
							onClick={() => void refresh()}
						>
							<RefreshCwIcon className={cn(refreshing && "animate-spin")} />
						</Button>
					</div>
				</header>

				{/* new top-level comment */}
				{embedded && location ? (
					formOpen ? (
						<CommentFrame
							url={location.url}
							height={frameHeight}
							title="Write a comment"
							onSubmitted={onSubmitted}
						/>
					) : (
						<div>
							<Button variant="outline" onClick={() => setFormOpen(true)}>
								<MessageSquarePlusIcon />
								Write a comment
							</Button>
						</div>
					)
				) : fallbackUrl ? (
					<div>
						<a
							href={fallbackUrl}
							rel="noopener noreferrer"
							target="_blank"
							className={buttonVariants({ variant: "outline" })}
						>
							<MessageSquarePlusIcon />
							Write a comment
						</a>
					</div>
				) : (
					comments.setting === "readonly" && (
						<p className="text-muted-foreground text-sm">Comments are closed.</p>
					)
				)}

				{tree.length === 0 ? (
					<p className="text-muted-foreground text-sm">{emptyMessage}</p>
				) : (
					<ol className="flex flex-col gap-6">
						{tree.slice(0, visible).map((node) => (
							<CommentItem key={node.id} node={node} />
						))}
					</ol>
				)}

				{tree.length > visible && (
					<div>
						<Button
							variant="outline"
							onClick={() => setVisible((count) => count + pageSize)}
						>
							Show more comments ({tree.length - visible})
						</Button>
					</div>
				)}
			</section>
		</CommentsContext.Provider>
	);
}

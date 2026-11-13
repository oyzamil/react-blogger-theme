import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	buildCommentTree,
	type CommentNode,
	type CommentSort,
	type Comments,
	fetchBlogger,
} from "@/lib/blogger";

import { useBlogger } from "@/contexts/blogger";

export interface UseCommentsOptions {
	/** Order of top-level comments. Replies are always oldest first. */
	defaultSort?: CommentSort;
}

export interface UseCommentsResult {
	/** null: this page has no comments data (not a post / page, or old template). */
	comments: Comments | null;
	/** Threads, any depth. */
	tree: CommentNode[];
	sort: CommentSort;
	setSort: (sort: CommentSort) => void;
	/** Load the comments again (after someone posted one). */
	refresh: () => Promise<void>;
	refreshing: boolean;
}

/** Comments of the current post / page, as threads, plus a way to reload them. */
export function useComments({
	defaultSort = "oldest",
}: UseCommentsOptions = {}): UseCommentsResult {
	const { data } = useBlogger();

	// reloaded comments belong to one page: ignore them after navigating away
	const [fresh, setFresh] = useState<{ url: string; comments: Comments } | null>(
		null,
	);
	const comments =
		fresh && fresh.url === data.view.url ? fresh.comments : (data.comments ?? null);

	const [sort, setSort] = useState<CommentSort>(defaultSort);
	const tree = useMemo(
		() => (comments ? buildCommentTree(comments.items, { sort }) : []),
		[comments, sort],
	);

	const [refreshing, setRefreshing] = useState(false);
	const alive = useRef(true);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);

	const refresh = useCallback(async () => {
		setRefreshing(true);
		try {
			const mobile = data.blog.isMobileRequest ? "force" : "ignore";
			// the post body is not needed; fall back in case the light view has no comments
			let next = await fetchBlogger(data.view.url, {
				mobile,
				content: false,
			}).asData();
			if (!next.comments) {
				next = await fetchBlogger(data.view.url, { mobile }).asData();
			}
			if (next.comments && alive.current) {
				setFresh({ url: data.view.url, comments: next.comments });
			}
		} finally {
			if (alive.current) setRefreshing(false);
		}
	}, [data]);

	return { comments, tree, sort, setSort, refresh, refreshing };
}

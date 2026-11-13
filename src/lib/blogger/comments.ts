import type { Comment } from "./types";

/* -------------------------------------------------------------------------- */
/*  Thread tree                                                               */
/* -------------------------------------------------------------------------- */

export interface CommentNode extends Comment {
	/** 0 = top-level comment, 1 = reply, 2 = reply to a reply, ... */
	depth: number;
	replies: CommentNode[];
	/** Replies at any depth below this comment. */
	descendants: number;
}

export type CommentSort = "oldest" | "newest";

/**
 * Blogger keeps comments flat (`id` + `inReplyTo`). This rebuilds the threads,
 * at any depth.
 *
 * - A reply whose parent is missing (removed, or outside the loaded batch)
 *   becomes a top-level comment instead of disappearing.
 * - Top-level comments follow `sort`; replies are always oldest first, so a
 *   conversation reads in order.
 * - Bad data (a comment that is its own ancestor) cannot loop forever.
 */
export function buildCommentTree(
	items: Comment[],
	{ sort = "oldest" }: { sort?: CommentSort } = {},
): CommentNode[] {
	const nodes = new Map<string, CommentNode>();
	for (const item of items) {
		nodes.set(item.id, { ...item, depth: 0, replies: [], descendants: 0 });
	}

	const roots: CommentNode[] = [];
	for (const node of nodes.values()) {
		const parent = node.inReplyTo ? nodes.get(node.inReplyTo) : undefined;
		if (parent && parent !== node) parent.replies.push(node);
		else roots.push(node);
	}

	const byTime = (a: CommentNode, b: CommentNode) =>
		a.timestampMs - b.timestampMs;

	// depth + descendants, walking down from the roots
	const seen = new Set<string>();
	const walk = (node: CommentNode, depth: number): number => {
		seen.add(node.id);
		node.depth = depth;
		// drop links back to nodes already placed (cycles), so the result is a real tree
		node.replies = node.replies.filter((r) => !seen.has(r.id)).sort(byTime);
		let count = 0;
		for (const reply of node.replies) {
			count += 1 + walk(reply, depth + 1);
		}
		node.descendants = count;
		return count;
	};
	for (const root of roots) walk(root, 0);

	// anything not reached is part of a cycle: show it rather than lose it
	for (const node of nodes.values()) {
		if (seen.has(node.id)) continue;
		node.inReplyTo = null;
		roots.push(node);
		walk(node, 0);
	}

	roots.sort(sort === "newest" ? (a, b) => byTime(b, a) : byTime);
	return roots;
}

/**
 * Templates from before multi-level comments sent top-level comments with their
 * replies nested inside (`replies`, 2 levels, no `inReplyTo` on the parents).
 * Flatten that into the current shape so nothing disappears before the template
 * is re-uploaded.
 */
export function normalizeComments(items: unknown[]): Comment[] {
	const out: Comment[] = [];
	for (const raw of items as (Comment & { replies?: Comment[] })[]) {
		const { replies, ...item } = raw;
		out.push({ ...item, inReplyTo: item.inReplyTo ?? null });
		for (const reply of replies ?? []) {
			out.push({ ...reply, inReplyTo: reply.inReplyTo ?? item.id });
		}
	}
	return out;
}

/** All nodes of a tree, parents before children. */
export function flattenCommentTree(nodes: CommentNode[]): CommentNode[] {
	return nodes.flatMap((node) => [node, ...flattenCommentTree(node.replies)]);
}

/* -------------------------------------------------------------------------- */
/*  Comment form (blogger.com/comment/frame)                                  */
/* -------------------------------------------------------------------------- */

/**
 * URL of Blogger's comment form.
 * `base` is the form URL the template gives for this post
 * (`https://www.blogger.com/comment/frame/BLOG_ID?po=POST_ID&...`);
 * a reply is the same URL plus `parentID=<comment id>`.
 */
export function getCommentFormUrl(base: string, parentId?: string | null): string {
	const url = new URL(base);
	if (parentId) url.searchParams.set("parentID", parentId);
	else url.searchParams.delete("parentID");
	return url.toString();
}

/* -------------------------------------------------------------------------- */
/*  Display helpers                                                           */
/* -------------------------------------------------------------------------- */

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600],
	["month", 30 * 24 * 3600],
	["week", 7 * 24 * 3600],
	["day", 24 * 3600],
	["hour", 3600],
	["minute", 60],
];

/** `3 days ago`, `just now`. Falls back to nothing if the date is invalid. */
export function formatRelativeTime(
	timestampMs: number,
	now: number = Date.now(),
	locale?: string,
): string {
	if (!Number.isFinite(timestampMs)) return "";
	const seconds = Math.round((timestampMs - now) / 1000);
	const abs = Math.abs(seconds);
	if (abs < 45) return "just now";

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	for (const [unit, size] of UNITS) {
		if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
	}
	return rtf.format(Math.round(seconds / 60), "minute");
}

/** Blogger gives `//host/...` or a blank placeholder when there is no photo. */
export function getAvatarSrc(image: string | null): string | null {
	if (!image) return null;
	if (/\/img\/blank\.gif/i.test(image)) return null;
	return image.startsWith("//") ? `https:${image}` : image;
}

export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	const first = parts[0] as string;
	const last = parts.length > 1 ? (parts[parts.length - 1] as string) : "";
	return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

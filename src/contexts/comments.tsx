import { createContext, useContext } from "react";

export interface CommentsContextValue {
	/** Blogger's comment form for this post, when it can be embedded. */
	formUrl: string | null;
	/** Where to send people when the form cannot be embedded (popup / full page). */
	fallbackUrl: string | null;
	/** New comments and replies are accepted. */
	canReply: boolean;
	/** Replies deeper than this stop moving to the right. */
	maxDepth: number;
	/**
	 * Levels of replies allowed. A comment at depth `d` gets a Reply button only
	 * while `d < maxReplyDepth`. 1 = replies to top-level comments only.
	 */
	maxReplyDepth: number;
	frameHeight: number;
	/** Comment whose reply form is open. */
	replyingTo: string | null;
	setReplyingTo: (id: string | null) => void;
	/** Called when a comment was (probably) just sent. */
	onSubmitted: () => void;
	/** Called when the delete window was closed: reload the comments. */
	onDeleted: () => void;
	/** Comment opened through a `#c123` link. */
	highlightId: string | null;
}

export const CommentsContext = createContext<CommentsContextValue | null>(null);

export function useCommentsContext(): CommentsContextValue {
	const value = useContext(CommentsContext);
	if (!value) throw new Error("CommentItem must be used inside <Comments />");
	return value;
}

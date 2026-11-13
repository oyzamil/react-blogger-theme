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
	frameHeight: number;
	/** Comment whose reply form is open. */
	replyingTo: string | null;
	setReplyingTo: (id: string | null) => void;
	/** Called when a comment was (probably) just sent. */
	onSubmitted: () => void;
	/** Comment opened through a `#c123` link. */
	highlightId: string | null;
}

export const CommentsContext = createContext<CommentsContextValue | null>(null);

export function useCommentsContext(): CommentsContextValue {
	const value = useContext(CommentsContext);
	if (!value) throw new Error("CommentItem must be used inside <Comments />");
	return value;
}

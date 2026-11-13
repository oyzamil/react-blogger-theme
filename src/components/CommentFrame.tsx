import { useMemo, useRef, useState } from "react";

import { getCommentFormUrl } from "@/lib/blogger";

import { cn } from "@/utils/cn";

export interface CommentFrameProps {
	/** Blogger comment form URL of the post (`comments.location.url`). */
	url: string;
	/** Id of the comment being answered. Omit for a new top-level comment. */
	parentId?: string | null;
	height?: number;
	title: string;
	/** Fired when the form was (probably) submitted. See note below. */
	onSubmitted?: () => void;
	className?: string;
}

/**
 * Blogger's own comment form (blogger.com/comment/frame) in an iframe.
 *
 * The frame is another origin: its height cannot be read and it does not tell
 * the page when a comment was saved. Sending the form navigates the frame, so a
 * second `load` event is treated as "submitted" (it can also fire after a
 * sign-in; reloading the comments then is harmless).
 */
export default function CommentFrame({
	url,
	parentId = null,
	height = 420,
	title,
	onSubmitted,
	className,
}: CommentFrameProps) {
	const src = useMemo(() => getCommentFormUrl(url, parentId), [url, parentId]);
	const loads = useRef(0);
	const [loaded, setLoaded] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	const handleLoad = () => {
		loads.current += 1;
		setLoaded(true);
		if (loads.current >= 2) {
			setSubmitted(true);
			onSubmitted?.();
		}
	};

	return (
		<div
			className={cn(
				"relative w-full overflow-hidden rounded-xl border bg-white",
				className,
			)}
			style={{ minHeight: height }}
		>
			{!loaded && (
				<div
					aria-hidden
					className="absolute inset-0 animate-pulse bg-muted"
					data-slot="comment-frame-skeleton"
				/>
			)}

			<iframe
				// a new key per target: replying to another comment starts a fresh form
				key={src}
				src={src}
				title={title}
				height={height}
				loading="lazy"
				onLoad={handleLoad}
				className="relative block w-full border-0"
				style={{ height }}
			/>

			{submitted && (
				<p
					role="status"
					className="border-t bg-muted px-4 py-2 text-muted-foreground text-xs"
				>
					Comment sent. If this blog moderates comments, it appears after
					approval.
				</p>
			)}
		</div>
	);
}

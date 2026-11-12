import { useBlogger } from "@/contexts/blogger";

import Pagination, { type PaginationProps } from "./Pagination";
import PostCard from "./PostCard";

export interface PostListProps {
	/** Props forwarded to the pagination under the list. `false` hides it. */
	pagination?: PaginationProps | false;
	empty?: string;
}

/** Posts of the current listing page followed by pagination. */
export default function PostList({
	pagination = {},
	empty = "No posts found.",
}: PostListProps) {
	const { data } = useBlogger();
	const posts = Object.values(data.posts);

	return (
		<div className="flex flex-col gap-4">
			{posts.length === 0 ? (
				<p className="text-muted-foreground text-sm">{empty}</p>
			) : (
				posts.map((post) => <PostCard key={post.id} post={post} />)
			)}
			{pagination !== false && <Pagination {...pagination} />}
		</div>
	);
}

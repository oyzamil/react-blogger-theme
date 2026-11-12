import { resizeImage } from "blogr-plugins";
import { HashIcon } from "lucide-react";
import { Link } from "react-router";

import type { PostMinimal } from "@/lib/blogger";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function PostCard({ post }: { post: PostMinimal }) {
	return (
		<div className="flex flex-col rounded-md border p-4">
			<Link
				prefetch="viewport"
				className="mb-1 font-semibold text-lg hover:underline"
				to={post.url}
			>
				{post.title}
			</Link>
			<div
				className="mb-2 text-muted-foreground text-sm"
				dangerouslySetInnerHTML={{ __html: post.summary }}
			/>
			<div className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
				<div className="flex items-center gap-x-1.5">
					<Avatar className="size-5 rounded-full">
						{post.author.image && (
							<AvatarImage
								alt={post.author.name}
								src={resizeAvatarImage(post.author.image, 35)}
							/>
						)}
						<AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
					</Avatar>
					<span>{post.author.name}</span>
				</div>
				<Separator orientation="vertical" className="h-4!" />
				<span>{post.publishedTimestamp}</span>
			</div>
			{post.labels.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-2">
					{post.labels.map((label) => (
						<Badge
							asChild
							key={label}
							variant="secondary"
							className="flex items-center gap-x-1"
						>
							<Link
								prefetch="viewport"
								to={`/search/label/${encodeURI(label)}`}
							>
								<HashIcon className="size-3" />
								{label}
							</Link>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}

function resizeAvatarImage(source: string, size: number) {
	return resizeImage(source, {
		height: size,
		width: size,
	});
}

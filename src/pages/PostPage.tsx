import { tocify } from "blogr-plugins";
import { BookOpenTextIcon, LibraryBigIcon } from "lucide-react";
import { useEffect } from "react";

import { type Post } from "@/lib/blogger";

import ArticleContent from "@/components/ArticleContent";
import Breadcrumbs from "@/components/Breadcrumbs";
import Comments from "@/components/Comments";
import Thumbnail from "@/components/Thumbnail";

import { useBlogger } from "@/contexts/blogger";

export default function PostPage() {
	const { data } = useBlogger();
	const post = data.post as Post;

	useEffect(() => {
		const toc = tocify("#toc", { content: "article", headings: "h2,h3" });
		return () => {
			toc.destroy();
		};
	}, []);

	return (
		<main className="flex flex-col gap-5">
			<Thumbnail
				title={post.title}
				description={post.summary}
				logo={post.author.image || data.meta.favicon.src}
				organization={data.post?.author.name || data.blog.title}
			/>

			<Breadcrumbs
				items={[
					{ label: "Posts", icon: LibraryBigIcon },
					{ label: post.title, icon: BookOpenTextIcon },
				]}
			/>

			{/* <h1 className="font-heading font-black text-3xl">{post.title}</h1> */}

			<article className="prose">
				<ArticleContent html={post.content} />
			</article>

			<Comments />
		</main>
	);
}

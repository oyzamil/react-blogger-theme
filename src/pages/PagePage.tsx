import { BookTextIcon, FileTextIcon } from "lucide-react";

import type { Post } from "@/lib/blogger";

import ArticleContent from "@/components/ArticleContent";
import Breadcrumbs from "@/components/Breadcrumbs";
import Comments from "@/components/Comments";

import { useBlogger } from "@/contexts/blogger";

export default function PagePage() {
	const { data } = useBlogger();
	const page = data.page as Post;

	return (
		<div className="flex flex-col gap-5">
			<Breadcrumbs
				items={[
					{ label: "Pages", icon: BookTextIcon },
					{ label: page.title, icon: FileTextIcon },
				]}
			/>

			<h1 className="font-semibold text-3xl">{page.title}</h1>
			<article className="prose">
				<ArticleContent html={page.content} />
			</article>

			<Comments />
		</div>
	);
}

import { TagIcon, TagsIcon } from "lucide-react";

import type { LabelSearch } from "@/lib/blogger";

import Breadcrumbs from "@/components/Breadcrumbs";
import PostList from "@/components/PostList";

import { useBlogger } from "@/contexts/blogger";

export default function LabelSearchPage() {
	const { data } = useBlogger();
	const search = data.view.search as LabelSearch;

	return (
		<div className="flex flex-col gap-4">
			<Breadcrumbs
				items={[
					{ label: "Labels", icon: TagsIcon },
					{ label: search.label, icon: TagIcon },
				]}
			/>

			<h2 className="font-medium text-xl">{search.label}</h2>

			<PostList />
		</div>
	);
}

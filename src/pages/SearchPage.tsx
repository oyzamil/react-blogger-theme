import { SearchIcon } from "lucide-react";

import type { QuerySearch } from "@/lib/blogger";

import Breadcrumbs from "@/components/Breadcrumbs";
import PostList from "@/components/PostList";

import { useBlogger } from "@/contexts/blogger";

export default function SearchPage() {
	const { data } = useBlogger();
	const search = data.view.search as QuerySearch;

	return (
		<div className="flex flex-col gap-5">
			<Breadcrumbs items={[{ label: "Search", icon: SearchIcon }]} />

			<h2 className="font-medium text-xl">Results for “{search.query}”</h2>

			<PostList />
		</div>
	);
}

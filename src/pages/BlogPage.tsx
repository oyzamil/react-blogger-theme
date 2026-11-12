import { LibraryBigIcon } from "lucide-react";

import Breadcrumbs from "@/components/Breadcrumbs";
import PostList from "@/components/PostList";

export default function BlogPage() {
	return (
		<div className="flex flex-col gap-5">
			<Breadcrumbs items={[{ label: "Blog", icon: LibraryBigIcon }]} />

			<PostList />
		</div>
	);
}

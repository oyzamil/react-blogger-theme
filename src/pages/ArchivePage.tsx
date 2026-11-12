import { ArchiveIcon } from "lucide-react";

import Breadcrumbs from "@/components/Breadcrumbs";
import PostList from "@/components/PostList";

export default function ArchivePage() {
	return (
		<div className="flex flex-col gap-5">
			<Breadcrumbs items={[{ label: "Archive", icon: ArchiveIcon }]} />

			<PostList />
		</div>
	);
}

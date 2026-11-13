import Pagination from "@/components/Pagination";
import PostCard from "@/components/PostCard";
import StructuredData from "@/components/StructuredData";

import { useBlogger } from "@/contexts/blogger";
import Hero from "./sections/Hero";

export default function HomePage() {
	const { data } = useBlogger();

	return (
		<>
			<StructuredData
				data={{
					"@context": "https://schema.org",
					"@type": "WebSite",
					url: data.blog.canonicalHomepageUrl,
					name: data.blog.title,
					alternateName: data.blog.title,
					potentialAction: {
						"@type": "SearchAction",
						target: `${data.blog.searchUrl}?q={search_term_string}`,
						"query-input": "required name=search_term_string",
					},
				}}
			/>
			<Hero />
			<div className="mt-4 flex flex-col gap-4">
				{data.featured && (
					<>
						<h2 className="font-bold text-xl">🔥 Featured post</h2>
						<PostCard post={data.featured.post} />
					</>
				)}
				<h2 className="font-bold text-xl">Latest posts</h2>
				{Object.values(data.posts).map((post) => (
					<PostCard key={post.id} post={post} />
				))}
				<Pagination />

				{/* <h2 className="font-bold text-xl">Blog authors</h2>
				<div className="flex flex-col gap-5">
					{data.authors.map((author) => (
						<BlogAuthorCard key={author.id} author={author} />
					))}
				</div> */}
			</div>
		</>
	);
}

// function BlogAuthorCard({ author }: { author: BlogAuthor }) {
// 	return (
// 		<div className="flex items-center gap-3 rounded-md border p-4">
// 			<Avatar>
// 				{author.image && (
// 					<AvatarImage
// 						className="object-cover object-center"
// 						alt={author.name}
// 						src={resizeAvatarImage(author.image, 40)}
// 					/>
// 				)}
// 				<AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
// 			</Avatar>
// 			<div>{author.name}</div>
// 		</div>
// 	);
// }

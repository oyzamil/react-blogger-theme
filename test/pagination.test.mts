import { hasPagingParams, buildPageHref, fetchPageBoundary, fetchPostRank, fetchTotalPosts, getPageRange, getPerPage, toUpdatedMax, getFeedScope } from "../src/lib/blogger/pagination.ts";

let fails = 0;
const eq = (name: string, a: unknown, b: unknown) => {
	const ok = JSON.stringify(a) === JSON.stringify(b);
	if (!ok) { fails++; console.log("FAIL", name, "\n  got ", JSON.stringify(a), "\n  want", JSON.stringify(b)); }
	else console.log("ok  ", name);
};

/* ---- getPageRange ---- */
eq("range total 1", getPageRange(1, 1), [1]);
eq("range 5 pages", getPageRange(3, 5), [1, 2, 3, 4, 5]);
eq("range 7 pages fits all slots", getPageRange(1, 7), [1, 2, 3, 4, 5, 6, 7]);
eq("range 20, cur 1", getPageRange(1, 20), [1, 2, 3, 4, 5, "end-ellipsis", 20]);
eq("range 20, cur 10", getPageRange(10, 20), [1, "start-ellipsis", 9, 10, 11, "end-ellipsis", 20]);
eq("range 20, cur 20", getPageRange(20, 20), [1, "start-ellipsis", 16, 17, 18, 19, 20]);
eq("range 20, cur 4 (no start gap)", getPageRange(4, 20), [1, 2, 3, 4, 5, "end-ellipsis", 20]);
eq("range siblings 2", getPageRange(10, 30, { siblings: 2 }), [1, "start-ellipsis", 8, 9, 10, 11, 12, "end-ellipsis", 30]);
eq("slots constant", [1, 5, 10, 19, 20].map((c) => getPageRange(c, 20).length), [7, 7, 7, 7, 7]);

/* ---- helpers ---- */
eq("toUpdatedMax drops ms", toUpdatedMax("2026-01-04T10:20:30.123+05:00"), "2026-01-04T10:20:30+05:00");
eq("toUpdatedMax Z", toUpdatedMax("2026-01-04T10:20:30.000Z"), "2026-01-04T10:20:30Z");
eq("toUpdatedMax no ms", toUpdatedMax("2026-01-04T10:20:30-08:00"), "2026-01-04T10:20:30-08:00");

const BASE = "https://example.blogspot.com/";
eq("perPage from older", getPerPage({ older: BASE + "search?updated-max=x&max-results=5", newer: null, count: 5 }, BASE), 5);
eq("perPage from newer", getPerPage({ older: null, newer: BASE + "search?max-results=7&reverse-paginate=true", count: 3 }, BASE), 7);
eq("perPage fallback count", getPerPage({ older: null, newer: null, count: 4 }, BASE), 4);

/* ---- fake blog: 23 posts, newest first, published every hour ---- */
const N = 23, PER = 5;
const t0 = Date.parse("2026-03-01T12:00:00.000Z");
const posts = Array.from({ length: N }, (_, i) => ({ id: String(i + 1), published: new Date(t0 - i * 3600_000 - i * 7).toISOString().replace("Z", "+00:00") }));
// posts[0] newest. published has ms noise (i*7) to prove ms-dropping works.
const ts = (iso: string) => Date.parse(iso);

(globalThis as any).fetch = async (input: string) => {
	const u = new URL(String(input));
	const max = Number(u.searchParams.get("max-results") ?? 25);
	const start = Number(u.searchParams.get("start-index") ?? 1);
	const pmin = u.searchParams.get("published-min");
	let list = posts;
	if (pmin) list = list.filter((p) => ts(p.published) >= ts(pmin));
	const entry = list.slice(start - 1, start - 1 + max).map((p) => ({ published: { $t: p.published } }));
	return { ok: true, json: async () => ({ feed: { "openSearch$totalResults": { $t: String(list.length) }, entry } }) };
};

const htmlPostsFor = (updatedMax: string | null) => {
	// Blogger semantics for HTML listing: posts strictly older than updated-max, newest first
	const list = updatedMax ? posts.filter((p) => ts(p.published) < ts(updatedMax)) : posts;
	return list.slice(0, PER);
};

const mk = (pageNo: number, boundaryIso?: string) => {
	const shown = pageNo === 1 ? htmlPostsFor(null) : htmlPostsFor(toUpdatedMax(boundaryIso!));
	const older = shown.at(-1)!;
	const hasOlder = posts.indexOf(older) < N - 1;
	const hasNewer = pageNo > 1;
	return {
		blog: { homepageUrl: BASE, canonicalHomepageUrl: BASE },
		view: { url: BASE, search: undefined, isArchive: false },
		posts: Object.fromEntries(shown.map((p) => [p.id, { id: p.id, published: p.published }])),
		pager: {
			older: hasOlder ? `${BASE}search?updated-max=${encodeURIComponent(toUpdatedMax(older.published))}&max-results=${PER}&start=${pageNo * PER}&by-date=false` : null,
			newer: hasNewer ? `${BASE}search?updated-max=${encodeURIComponent(toUpdatedMax(shown[0]!.published))}&max-results=${PER}&reverse-paginate=true` : null,
			count: shown.length,
		},
	} as any;
};

const totalPages = Math.ceil(N / PER); // 5
let data = mk(1);
eq("total posts", await fetchTotalPosts(data), N);
eq("total pages", Math.ceil((await fetchTotalPosts(data)) / PER), totalPages);

// build every page URL from page 1's data, then "open" it and verify the right posts show
for (let p = 1; p <= totalPages; p++) {
	const boundary = p > 1 ? await fetchPageBoundary(data, p, PER) : undefined;
	const href = buildPageHref(data, p, PER, boundary)!;
	const um = new URL(href).searchParams.get("updated-max");
	const shown = p === 1 ? htmlPostsFor(null) : htmlPostsFor(um);
	const wantFirst = String((p - 1) * PER + 1);
	eq(`page ${p}: first post id`, shown[0]!.id, wantFirst);
	eq(`page ${p}: href`, p === 1 ? href : { has: href.includes("max-results=5") && href.includes("start=" + (p - 1) * PER) }, p === 1 ? "https://example.blogspot.com/" : { has: true });
	// rank -> page, as the hook computes it
	const first = shown[0]!;
	const rank = await fetchPostRank(data, first.published);
	eq(`page ${p}: rank->page`, Math.floor((rank - 1) / PER) + 1, p);
}
// last page has 3 posts; still correct
data = mk(5, await fetchPageBoundary(data, 5, PER));
eq("last page: older null", data.pager.older, null);
eq("last page: perPage from newer", getPerPage(data.pager, BASE), 5);
eq("scope default", getFeedScope(data), { path: "/feeds/posts/summary", params: {} });
eq("scope label", getFeedScope({ ...data, view: { search: { type: "label", label: "C# & stuff" } } }), { path: "/feeds/posts/summary/-/C%23%20%26%20stuff", params: {} });
eq("scope query", getFeedScope({ ...data, view: { search: { type: "query", query: "hello world" } } }), { path: "/feeds/posts/summary", params: { q: "hello world" } });
eq("scope archive", getFeedScope({ ...data, view: { url: BASE + "2026/01/", isArchive: true } }), { path: "/feeds/posts/summary", params: { "published-min": "2026-01-01T00:00:00", "published-max": "2026-02-01T00:00:00" } });
// label page template keeps path + other params
const labelData = { ...data, pager: { older: `${BASE}search/label/js?updated-max=2026-02-01T10:00:00%2B00:00&max-results=5`, newer: null, count: 5 } } as any;
eq("label href p2", buildPageHref(labelData, 2, 5, "2026-01-30T09:08:07.123+00:00"), `${BASE}search/label/js?updated-max=2026-01-30T09%3A08%3A07%2B00%3A00&max-results=5`);
eq("label href p1", buildPageHref(labelData, 1, 5), `${BASE}search/label/js`);
const qData = { ...data, pager: { older: `${BASE}search?q=react&updated-max=2026-02-01T10:00:00%2B00:00&max-results=5`, newer: null, count: 5 } } as any;
eq("query href p1 keeps q", buildPageHref(qData, 1, 5), `${BASE}search?q=react`);

/* ---- derived (template without json:pager) ---- */
const dHome = { blog: { homepageUrl: BASE }, view: { url: BASE }, pager: { older: null, newer: null, count: 5, derived: true } } as any;
eq("derived home p1", buildPageHref(dHome, 1, 5), BASE);
eq("derived home p3 via /search", buildPageHref(dHome, 3, 5, "2026-01-30T09:08:07.123+00:00"), `${BASE}search?updated-max=2026-01-30T09%3A08%3A07%2B00%3A00&max-results=5`);
const dLabel = { blog: { homepageUrl: BASE }, view: { url: `${BASE}search/label/js?updated-max=2026-02-01T10:00:00%2B00:00&max-results=5` }, pager: { older: null, newer: null, count: 5, derived: true } } as any;
eq("derived label p1", buildPageHref(dLabel, 1, 5), `${BASE}search/label/js`);
eq("derived label p4", buildPageHref(dLabel, 4, 5, "2026-01-01T00:00:01.000+00:00"), `${BASE}search/label/js?updated-max=2026-01-01T00%3A00%3A01%2B00%3A00&max-results=5`);
eq("getPerPage from view url", getPerPage({ older: null, newer: null, count: 2, derived: true }, BASE, `${BASE}search?updated-max=x&max-results=7`), 7);
eq("hasPagingParams home", hasPagingParams(BASE, BASE), false);
eq("hasPagingParams later page", hasPagingParams(`${BASE}search?updated-max=x&max-results=5`, BASE), true);
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);

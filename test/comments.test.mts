// node --experimental-strip-types test/comments.test.mts
import { normalizeComments, buildCommentTree, flattenCommentTree, formatRelativeTime, getAvatarSrc, getCommentFormUrl, getInitials } from "../src/lib/blogger/comments.ts";

let fails = 0;
const eq = (name: string, a: unknown, b: unknown) => {
	const ok = JSON.stringify(a) === JSON.stringify(b);
	if (!ok) { fails++; console.log("FAIL", name, "\n  got ", JSON.stringify(a), "\n  want", JSON.stringify(b)); }
	else console.log("ok  ", name);
};
const c = (id: string, inReplyTo: string | null, t: number) => ({
	id, inReplyTo, timestampMs: t, body: id, timestamp: "", isDeleted: false, deleteUrl: "", adminClass: "",
	author: { name: id, url: null, image: null, isAnonymous: false, isPostAuthor: false },
}) as any;
const shape = (nodes: any[]): any => nodes.map((n) => (n.replies.length ? { [n.id]: shape(n.replies) } : n.id));

// 5 levels deep + siblings, given out of order
const items = [c("5", "4", 50), c("1", null, 10), c("3", "2", 30), c("2", "1", 20), c("4", "3", 40), c("6", "1", 25), c("7", null, 60)];
const tree = buildCommentTree(items);
eq("deep tree (5 levels)", shape(tree), [{ "1": [{ "2": [{ "3": [{ "4": ["5"] }] }] }, "6"] }, "7"]);
eq("depths", flattenCommentTree(tree).map((n) => `${n.id}:${n.depth}`), ["1:0", "2:1", "3:2", "4:3", "5:4", "6:1", "7:0"]);
eq("descendants", flattenCommentTree(tree).map((n) => `${n.id}:${n.descendants}`), ["1:5", "2:3", "3:2", "4:1", "5:0", "6:0", "7:0"]);
eq("newest first (roots only)", buildCommentTree(items, { sort: "newest" }).map((n) => n.id), ["7", "1"]);
eq("replies stay oldest-first when newest", shape(buildCommentTree(items, { sort: "newest" })), ["7", { "1": [{ "2": [{ "3": [{ "4": ["5"] }] }] }, "6"] }]);
eq("orphan reply becomes top-level", buildCommentTree([c("a", null, 1), c("b", "gone", 2)]).map((n) => n.id), ["a", "b"]);
eq("self reply does not loop", buildCommentTree([c("a", "a", 1)]).map((n) => [n.id, n.depth]), [["a", 0]]);
{
	const cyc = buildCommentTree([c("a", "b", 1), c("b", "a", 2), c("z", null, 0)]);
	eq("cycle: nothing lost, no hang", flattenCommentTree(cyc).map((n) => n.id).sort(), ["a", "b", "z"]);
}
eq("empty", buildCommentTree([]), []);
eq("input not mutated", items[0].replies, undefined);

eq("form url: new", getCommentFormUrl("https://www.blogger.com/comment/frame/123?po=456&hl=en&saa=85391&origin=https%3A%2F%2Fx.blogspot.com"), "https://www.blogger.com/comment/frame/123?po=456&hl=en&saa=85391&origin=https%3A%2F%2Fx.blogspot.com");
eq("form url: reply adds parentID, keeps the rest", getCommentFormUrl("https://www.blogger.com/comment/frame/123?po=456&hl=en&origin=https%3A%2F%2Fx.blogspot.com", "789"), "https://www.blogger.com/comment/frame/123?po=456&hl=en&origin=https%3A%2F%2Fx.blogspot.com&parentID=789");
eq("form url: parentID replaced, not duplicated", getCommentFormUrl("https://www.blogger.com/comment/frame/1?po=2&parentID=9", "7"), "https://www.blogger.com/comment/frame/1?po=2&parentID=7");
eq("form url: parentID removed for top-level", getCommentFormUrl("https://www.blogger.com/comment/frame/1?po=2&parentID=9"), "https://www.blogger.com/comment/frame/1?po=2");

const now = Date.parse("2026-03-10T12:00:00Z");
eq("time: just now", formatRelativeTime(now - 10_000, now, "en"), "just now");
eq("time: minutes", formatRelativeTime(now - 5 * 60_000, now, "en"), "5 minutes ago");
eq("time: hours", formatRelativeTime(now - 3 * 3600_000, now, "en"), "3 hours ago");
eq("time: yesterday", formatRelativeTime(now - 24 * 3600_000, now, "en"), "yesterday");
eq("time: days", formatRelativeTime(now - 4 * 86400_000, now, "en"), "4 days ago");
eq("time: months", formatRelativeTime(now - 70 * 86400_000, now, "en"), "2 months ago");
eq("time: bad input", formatRelativeTime(NaN, now), "");
eq("avatar: blank placeholder", getAvatarSrc("//img1.blogblog.com/img/blank.gif"), null);
eq("avatar: protocol-relative fixed", getAvatarSrc("//lh3.googleusercontent.com/a/s35/p.jpg"), "https://lh3.googleusercontent.com/a/s35/p.jpg");
eq("avatar: null", getAvatarSrc(null), null);
eq("initials", [getInitials("Ada Lovelace"), getInitials("madonna"), getInitials("  "), getInitials("Jean Claude Van Damme")], ["AL", "M", "?", "JD"]);

// legacy template shape: nested replies, parents without inReplyTo
{
	const legacy = [{ ...c("1", null, 1), inReplyTo: undefined, replies: [c("2", "1", 2), c("3", "1", 3)] }, { ...c("4", null, 4), inReplyTo: undefined, replies: [] }];
	const flat = normalizeComments(legacy);
	eq("legacy: flattened, inReplyTo filled in", flat.map((n) => [n.id, n.inReplyTo]), [["1", null], ["2", "1"], ["3", "1"], ["4", null]]);
	eq("legacy: no leftover replies field", flat.every((n: any) => !("replies" in n)), true);
	eq("legacy: reply without inReplyTo gets its parent", normalizeComments([{ ...c("1", null, 1), replies: [{ ...c("2", null, 2), inReplyTo: undefined }] }]).map((n) => n.inReplyTo), [null, "1"]);
	eq("current shape passes through", normalizeComments([c("1", null, 1), c("2", "1", 2)]).map((n) => [n.id, n.inReplyTo]), [["1", null], ["2", "1"]]);
}
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);

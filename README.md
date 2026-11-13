## @themes/react-theme

An experimental Blogger theme built with React as part of the `blogger-themes` monorepo.

The goal of `@themes/react-theme` is to explore how modern frontend technologies can improve Blogger theme development while remaining compatible with the Blogger platform.

> [!WARNING]
> This theme is experimental and not yet recommended for production blogs.

**Demo**

- Live demo: https://react-template.blogspot.com


## Build without GitHub hosting (inline)

```
npm run build        # normal: JS/CSS loaded from jsDelivr (needs dist/ pushed to GitHub)
npm run build:inline # JS + CSS copied INTO dist/template.xml, nothing to host
```

`build:inline` = `vite build --mode inline` + `scripts/inline-bundle.mjs`. Upload `dist/template.xml` (or `template.min.xml`) and you are done. Mode `inline` swaps things that need a hosted file:

- shiki worker + `onig.wasm` -> main-thread shiki, JS regex engine: `src/utils/shiki/inline/*`. Edit `languages.ts` to add/remove grammars (each one adds bytes to every page).
- `@fontsource` woff2 -> Google Fonts: `src/styles/inline-fonts.css`.
- one JS + one CSS file (`inlineDynamicImports`, `cssCodeSplit: false`), XML-illegal chars escaped, `]]>` safe.
- Windows: output path `virtual:` -> `virtual_` (colon is illegal in Windows paths).

Cost: the template grows to ~1.5 MB (~350 KB gzip) and is re-sent with every page (no browser cache for inline JS). Normal build is lighter per page view.

## Comments

`<Comments />` (`src/components/Comments.tsx`) is on `PostPage` and `PagePage`. Multi-level threads (any depth), Blogger's own comment form for new comments and replies.

```tsx
<Comments />
<Comments defaultSort="newest" pageSize={10} maxDepth={3} formMode="open" frameHeight={460} />
```

- Template: `json:comments` now emits a FLAT `items` list with `inReplyTo` (the old one built 2 levels and dropped deeper replies). **Re-upload the template.** Until then the old shape has no `inReplyTo`, so every comment shows top-level.
- `buildCommentTree()` (`src/lib/blogger/comments.ts`) rebuilds the threads. A reply whose parent is gone becomes top-level instead of vanishing.
- Form = `https://www.blogger.com/comment/frame/BLOG_ID?po=POST_ID`. Reply = the same URL plus `&parentID=COMMENT_ID`. It is the same form Blogger shows (Google sign-in, name/URL, anonymous), loaded in an iframe only when someone clicks "Write a comment" / "Reply".
- The frame is another origin, so its height cannot be read (`frameHeight`, default 420) and it does not report a saved comment. The 2nd `load` of the frame (the form navigates when sent) is treated as "submitted": a note shows and the comments reload after 1.5 s. The reload button does the same by hand.
- Comments set to popup / full page (Settings > Comments): no inline form, buttons link to Blogger's page in a new tab; replies cannot be threaded from there.
- Per-comment `#c123` permalinks scroll to and highlight the comment.
- Blogger only loads the first 200 comments of a post into the template.
- `useComments()` (`src/hooks/use-comments.ts`) is the headless version.

## Pagination

`<Pagination />` (`src/components/Pagination.tsx`) works on every listing page: home, `/search`, label, search, archive.

```tsx
<Pagination />                                  {/* ‹ Previous 1 … 4 [5] 6 … 20 Next › */}
<Pagination variant="simple" />                 {/* ‹ Newer · Older ›, no extra requests */}
<Pagination siblings={2} boundaries={2} showSummary />
<PostList pagination={{ variant: "simple" }} /> {/* posts + pagination */}
```

- Template: `json:pager` (Blog widget) exposes Blogger's own `newerPageUrl` / `olderPageUrl`. Re-upload the template. If it is not re-uploaded yet, pagination still works: it is worked out from the public feed (`pager.derived`).
- Nothing shows when the blog has no more posts than fit on one page.

### Infinite scroll

```tsx
<PostList pagination={{ variant: "infinite" }} />

// or by hand: the page keeps rendering ITS posts, the component adds the next pages below
{posts.map((p) => <PostCard key={p.id} post={p} />)}
<Pagination variant="infinite" />
<Pagination variant="infinite" trigger="button" loadMoreLabel="Show more" />
<Pagination variant="infinite" rootMargin="1000px" endMessage={null}
            renderPost={(post) => <MyCard post={post} />} loader={<Spinner />} />
```

- Loads the next page when the end of the list comes within `rootMargin` (default `600px`). `trigger="button"` loads on click instead.
- Each page is fetched like a normal navigation (`fetchBlogger`, no post bodies), de-duplicated by post id, appended in order.
- Failed load shows a retry button. After the last page it shows `endMessage`.
- Resets when the listing page changes (new search, label, ...). Going to a post and back starts again from the first page.
- `useInfinitePosts()` (`src/hooks/use-infinite-posts.ts`) is the headless version.
- `usePagination()` (`src/hooks/use-pagination.ts`) is the headless version, build any UI on it.
- `src/lib/blogger/pagination.ts` holds the pure logic: `getPageRange`, `buildPageHref`, feed helpers.
- Numbers use the public feed (`/feeds/posts/summary`): 1 request for the total, 1 for the current page, up to ~6 tiny ones for page links. Results are cached. If a request fails the control falls back to Newer/Older.
- Test the pure logic: `node --experimental-strip-types test/pagination.test.mts`

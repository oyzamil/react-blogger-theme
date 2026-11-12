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

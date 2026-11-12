import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import blogger from "blogger-plugin/vite";
import { rm } from "node:fs/promises";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * blogger-plugin builds a virtual HTML entry (`virtual:blogger-plugin/*.html`),
 * lets Rollup write it to dist, then deletes it. Windows cannot create a folder
 * with ":" in its name (ENOENT on mkdir). Rename the output path to a safe one;
 * the bundle key stays the same so blogger-plugin still finds the asset.
 * Only needed for the inline build.
 */
function windowsSafeVirtualOutput(): Plugin {
	const safeDirs = new Set<string>();
	let outDir = "dist";
	return {
		name: "windows-safe-virtual-output",
		apply: "build",
		enforce: "post",
		configResolved(config) {
			outDir = path.resolve(config.root, config.build.outDir);
		},
		generateBundle: {
			order: "post",
			handler(_, bundle) {
				for (const file of Object.values(bundle)) {
					if (!file.fileName.includes(":")) continue;
					file.fileName = file.fileName.replaceAll(":", "_");
					safeDirs.add(file.fileName.split("/")[0] as string);
				}
			},
		},
		async closeBundle() {
			for (const dir of safeDirs) {
				await rm(path.join(outDir, dir), { recursive: true, force: true });
			}
		},
	};
}

/**
 * `vite build --mode inline` (npm run build:inline):
 * JS + CSS are copied into the template by scripts/inline-bundle.mjs, so no
 * GitHub / jsDelivr hosting is needed. Things that need a hosted file are
 * swapped for inline-friendly versions.
 */
export default defineConfig(({ mode }) => {
	const inline = mode === "inline";
	const src = (file: string) => path.resolve(__dirname, "src", file);

	return {
		// inline: nothing is loaded from a URL, base only matters for the dev server
		base:
			mode === "development" || inline
				? "/"
				: `https://cdn.jsdelivr.net/gh/oyzamil/docs-blogger-theme/dist/`,

		resolve: {
			alias: inline
				? [
						// shiki worker + oniguruma wasm (2.5 MB + 0.5 MB, need hosting)
						//   -> main-thread shiki with the JS regex engine
						{
							find: /^@\/utils\/shiki\/worker$/,
							replacement: src("utils/shiki/inline/highlight.ts"),
						},
						// @fontsource woff2 files need hosting -> Google Fonts
						{
							find: /^@fontsource-variable\/inclusive-sans$/,
							replacement: src("styles/inline-fonts.css"),
						},
						{
							find: /^@fontsource-variable\/fira-code$/,
							replacement: src("styles/inline-empty.css"),
						},
					]
				: [],
		},

		plugins: [
			react(),
			tailwindcss(),
			tsconfigPaths(),
			...(inline ? [windowsSafeVirtualOutput()] : []),
			blogger({
				proxyBlog: "https://observekit.blogspot.com/",
				modules: ["src/index.tsx"],
				styles: ["src/styles/globals.css"],
				template: "src/template.xml",
				xml: {
					tags: true,
					minify: true,
				},
			}),
		],

		build: {
			sourcemap: false,
			...(inline && {
				// one JS + one CSS file: import() would resolve against the blog URL and 404
				cssCodeSplit: false,
				assetsInlineLimit: 0,
				rollupOptions: { output: { inlineDynamicImports: true } },
			}),
		},
	};
});

// this.input = `__blogger_plugin_virtual__/${this.name}.html`;

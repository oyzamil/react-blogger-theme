import type { CodeToHastOptions } from "shiki/core";

import type { HighlightOptions, HighlightResult } from "../lib/types";

import { processShikiHtml } from "../lib/utils";
import { transformers } from "../transformers";
import { getHighlighter } from "./highlighter";
import { resolveLang } from "./languages";

export type { HighlightOptions, HighlightResult } from "../lib/types";

/**
 * Drop-in for `@/utils/shiki/worker`: same signature, runs on the main thread.
 * `vite.config.ts` swaps it in when building with `--mode inline`.
 */
export async function highlight(
	code: string,
	lang: string,
	options: HighlightOptions = {},
): Promise<HighlightResult> {
	const highlighter = await getHighlighter();

	const opts: CodeToHastOptions = {
		lang: resolveLang(lang),
		themes: {
			light: "github-light",
			dark: "github-dark",
		},
		defaultColor: false,
		...options,
		transformers,
	};

	const html = highlighter.codeToHtml(code, opts);

	if (opts.structure === "inline") {
		return { html, props: {} };
	}

	return processShikiHtml(html);
}

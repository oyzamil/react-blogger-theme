import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import { themes } from "../themes";
import { languages } from "./languages";

let highlighterPromise: Promise<HighlighterCore> | undefined;

/**
 * JS regex engine: no oniguruma wasm and no web worker, so the whole
 * highlighter fits inside the template. `forgiving` skips regexes the JS
 * engine cannot translate instead of throwing.
 */
export function getHighlighter(): Promise<HighlighterCore> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighterCore({
			themes,
			langs: languages,
			engine: createJavaScriptRegexEngine({ forgiving: true }),
		});
	}

	return highlighterPromise;
}

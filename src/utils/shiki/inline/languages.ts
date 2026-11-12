import css from "@shikijs/langs/css";
import html from "@shikijs/langs/html";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import markdown from "@shikijs/langs/markdown";
import shellscript from "@shikijs/langs/shellscript";
import typescript from "@shikijs/langs/typescript";
import yaml from "@shikijs/langs/yaml";
import type { LanguageInput } from "shiki/core";

/**
 * Only used by `npm run build:inline`.
 * Every grammar here is copied into the Blogger template, so each one costs
 * bytes on every page view. Add more only if you need them
 * (rough size before minify: tsx/jsx ~185 KB each, php ~120 KB, cpp ~530 KB).
 */
export const languages: LanguageInput[] = [
	html,
	css,
	javascript,
	typescript,
	json,
	yaml,
	shellscript,
	markdown,
];

/** Ids/aliases of the grammars above. */
export const LOADED = new Set([
	"html",
	"css",
	"javascript",
	"js",
	"typescript",
	"ts",
	"json",
	"yaml",
	"yml",
	"shellscript",
	"bash",
	"sh",
	"shell",
	"zsh",
	"markdown",
	"md",
]);

/** Languages that are not loaded are shown with the closest loaded grammar. */
export const FALLBACKS: Record<string, string> = {
	jsx: "javascript",
	tsx: "typescript",
	mjs: "javascript",
	cjs: "javascript",
	mts: "typescript",
	cts: "typescript",
	jsonc: "json",
	json5: "json",
	xml: "html",
	svg: "html",
	vue: "html",
	svelte: "html",
	astro: "html",
	scss: "css",
	less: "css",
	console: "shellscript",
	powershell: "shellscript",
	ps1: "shellscript",
	mdx: "markdown",
};

export function resolveLang(lang: string): string {
	const id = lang.toLowerCase();
	if (LOADED.has(id)) return id;
	return FALLBACKS[id] ?? "text";
}

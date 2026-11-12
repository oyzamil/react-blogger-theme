// Copies the built JS + CSS INTO dist/template*.xml, so nothing has to be hosted
// on GitHub / jsDelivr. Run after `vite build --mode inline` (see `build:inline`).
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = "dist";
const TEMPLATES = ["template.xml", "template.min.xml", "template.tags.xml"];

// blogger-plugin writes: <script type='module' ... src='/assets/x.js'></script>
//                        <link rel='stylesheet' ... href='/assets/y.css'/>
const SCRIPT_RE =
	/<script\b[^>]*\bsrc=(['"])([^'"]*\/assets\/[^'"]+\.js)\1[^>]*?(?:\/>|><\/script>)/g;
const LINK_RE =
	/<link\b[^>]*\bhref=(['"])([^'"]*\/assets\/[^'"]+\.css)\1[^>]*?\/?>/g;
const PRELOAD_RE = /<link\b[^>]*\brel=(['"])modulepreload\1[^>]*?\/?>/g;

// XML 1.0 forbids raw control chars and U+FFFE/U+FFFF; minifiers emit them
// literally (e.g. inside shiki). A \uXXXX escape means the same inside JS strings.
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g;
const esc = (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
// "]]>" would end the CDATA block early.
const cdataSafe = (s) => s.replace(ILLEGAL, esc).replaceAll("]]>", "]]\\u003E");

const files = new Map(); // asset path -> text
const read = async (assetPath) => {
	const name = assetPath.slice(assetPath.indexOf("/assets/") + 1);
	if (!files.has(assetPath)) {
		files.set(assetPath, (await readFile(join(DIST, name), "utf8")).trim());
	}
	return files.get(assetPath);
};

let warned = false;
const warn = (msg) => {
	warned = true;
	console.warn(`WARN: ${msg}`);
};

for (const name of TEMPLATES) {
	const path = join(DIST, name);
	let xml;
	try {
		xml = await readFile(path, "utf8");
	} catch {
		continue;
	}

	let scripts = 0;
	let styles = 0;

	// collect first (replace callbacks cannot await)
	const jsPaths = [...xml.matchAll(SCRIPT_RE)].map((m) => m[2]);
	const cssPaths = [...xml.matchAll(LINK_RE)].map((m) => m[2]);
	for (const p of [...jsPaths, ...cssPaths]) await read(p);

	let out = xml
		.replace(SCRIPT_RE, (_, _q, src) => {
			scripts++;
			const js = files.get(src);
			if (/\bimport\.meta\.(?!env)/.test(js)) {
				warn(`${src} still uses import.meta.*`);
			}
			return `<script type='module'>/*<![CDATA[*/${cdataSafe(js)}/*]]>*/</script>`;
		})
		.replace(LINK_RE, (_, _q, href) => {
			styles++;
			return `<style>/*<![CDATA[*/${cdataSafe(files.get(href))}/*]]>*/</style>`;
		})
		.replace(PRELOAD_RE, "");

	if (!scripts && !styles) {
		console.log(`${name}: nothing to inline`);
		continue;
	}
	if (/\/assets\//.test(out.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<script type='module'>[\s\S]*?<\/script>/g, ""))) {
		warn(`${name} still references /assets/`);
	}

	await writeFile(path, out, "utf8");
	console.log(
		`${name}: inlined ${scripts} script, ${styles} style -> ${(out.length / 1024).toFixed(0)} KB`,
	);
}

if (!warned) console.log("inline build OK: template needs no hosted files");

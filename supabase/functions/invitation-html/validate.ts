import { parseHTML } from "npm:linkedom@0.18.12";

const embeddedAsset = /^data:(?:image\/(?:png|jpeg|gif|webp|avif)|(?:audio|video|font)\/[\w.+-]+|application\/font-woff);base64,[a-z0-9+/=\s]+$/i;
const urlAttributes = new Set(["href", "src", "action", "formaction", "poster", "background", "cite", "longdesc", "xlink:href", "manifest", "data", "codebase"]);
const blockedTags = new Set(["iframe", "frame", "frameset", "embed", "object", "link", "base", "template", "foreignobject", "animate", "set"]);

function unsafeCss(css: string) {
  const normalized = css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/@import|\\|(?:image-set|image|src)\s*\(/i.test(normalized)) return true;
  const remaining = normalized.replace(/url\s*\(\s*(['"]?)([^)'"]*)\1\s*\)/gi,
    (match, _quote, value) => embeddedAsset.test(value.trim()) || /^#[\w-]+$/.test(value.trim()) ? "" : match);
  return /url\s*\(/i.test(remaining);
}

export function validateHtml(html: string) {
  const errors: { rule: string; detail: string }[] = [];
  const { document } = parseHTML(html);
  if (!document.querySelector("*")) return [{ rule: "empty_html", detail: "Expected an HTML document." }];
  for (const element of document.querySelectorAll("*")) {
    const tag = element.localName.toLowerCase();
    const reject = (rule: string) => errors.push({ rule, detail: "Prohibited reference or element in <" + tag + ">." });
    if (blockedTags.has(tag)) reject("blocked_element");
    if (tag === "meta" && element.getAttribute("http-equiv")?.trim().toLowerCase() === "refresh") reject("redirect");
    if (tag === "style" && unsafeCss(element.textContent ?? "")) reject("external_css");
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (["srcset", "imagesrcset", "ping", "srcdoc"].includes(name)) reject("unsupported_reference");
      if (name === "style" && unsafeCss(value)) reject("external_css");
      if (!urlAttributes.has(name)) continue;
      if (value.startsWith("#") && name.endsWith("href")) continue;
      if (["src", "poster", "background"].includes(name) && tag !== "script" && embeddedAsset.test(value)) continue;
      reject("external_" + name);
    }
    if (errors.length >= 20) break;
  }
  return errors;
}

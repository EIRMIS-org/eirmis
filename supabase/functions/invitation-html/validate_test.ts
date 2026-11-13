import { validateHtml } from "./validate.ts";

Deno.test("rejects outbound DOM and CSS references", () => {
  for (const html of ['<img src="/asset">', '<base href="//evil.test">', '<iframe></iframe>',
    '<form action="post"></form>', '<meta http-equiv="Refresh" content="0;url=/">',
    '<style>body{background:url(//evil.test)}</style>', '<style>@import "bad.css";</style>',
    '<script src="./loader.js"></script>', '<script>import("./loader.js")</script>',
    '<img srcset="https://evil.test 2x">']) {
    if (!validateHtml(html).length) throw new Error("Accepted " + html);
  }
});

Deno.test("accepts a self-contained invitation", () => {
  const html = '<article id="party"><a href="#party">Party</a><img src="data:image/png;base64,AAAA"></article>';
  if (validateHtml(html).length) throw new Error("Rejected self-contained document");
});

/**
 * Builds the shareable PDF versions of the design documents:
 *   docs/pdf/01-System-Design-HLD.pdf
 *   docs/pdf/02-Database-Schema-LLD.pdf
 *   docs/pdf/03-API-Scalability-Tradeoffs.pdf
 *
 *   npm run docs:pdf
 *
 * Markdown → HTML (marked) → Mermaid diagrams rendered to SVG → Chromium print (Playwright).
 * Relative links are rewritten to GitHub URLs so they work outside the repository.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'pdf');
const REPO = 'https://github.com/MONUPRAJAPAT/DSA-Sheet';
const LIVE = 'https://dd2dekdh8uhzz.cloudfront.net';
const AUTHOR = 'MONUPRAJAPAT';
const DATE = new Date().toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Text from a heading (inclusive) up to the next heading matching `until` (exclusive). */
function slice(md, from, until) {
  const start = from ? md.indexOf(from) : 0;
  if (start < 0) throw new Error(`Heading not found: ${from}`);
  const rest = md.slice(start + (from ? from.length : 0));
  const end = until ? rest.search(until) : -1;
  return (from ?? '') + (end >= 0 ? rest.slice(0, end) : rest);
}

/** Drop the document's own H1 (the cover page carries the title). */
const dropH1 = (md) => md.replace(/^# .*\n+/, '');

/** Shift every heading one level down (used when embedding documents as parts). */
const demote = (md) => md.replace(/^(#{1,5}) /gm, '#$1 ');

/** Rewrite repo-relative links (resolved from the source file's folder) to GitHub URLs. */
function absolutizeLinks(md, sourceRel) {
  const dir = path.posix.dirname(sourceRel);
  return md.replace(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g, (_m, target) => {
    const [p, hash] = target.split('#');
    const resolved = path.posix.normalize(path.posix.join(dir, p));
    const isDir = !path.posix.extname(resolved);
    return `](${REPO}/${isDir ? 'tree' : 'blob'}/main/${resolved}${hash ? `#${hash}` : ''})`;
  });
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function render(md) {
  const toc = [];
  let lastHeading = '';
  let figures = 0;
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      code({ text, lang }) {
        if (lang !== 'mermaid') return `<pre><code>${escapeHtml(text)}</code></pre>`;
        // Wide diagrams get a landscape page; the ER diagram gets a full portrait page.
        const kind =
          /%%\s*layout:\s*wide/.test(text) ||
          /^\s*(sequenceDiagram|flowchart\s+LR|graph\s+LR)/.test(text)
            ? 'wide'
            : /^\s*erDiagram/.test(text)
              ? 'full'
              : 'inline';
        figures++;
        return `<figure class="diagram ${kind}"><div class="mermaid">${escapeHtml(text)}</div><figcaption>Figure ${figures}. ${lastHeading}</figcaption></figure>`;
      },
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const id = slug(html);
        lastHeading = html.replace(/<[^>]+>/g, '').replace(/^\d+(\.\d+)*\.?\s+/, '');
        if (depth <= 2) toc.push({ depth, html, id });
        return `<h${depth} id="${id}">${html}</h${depth}>`;
      },
    },
  });
  return { body: marked.parse(md), toc };
}

const css = `
@page { size: A4; margin: 20mm 17mm 18mm; }
@page :first { margin: 0; }
@page wide { size: A4 landscape; margin: 16mm 16mm 15mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Inter', system-ui, sans-serif; color: #1c1f2a; font-size: 10pt; line-height: 1.55; margin: 0; }
a { color: #4338ca; text-decoration: none; }
.cover { height: 297mm; padding: 26mm 22mm; display: flex; flex-direction: column; color: #fff;
  background: radial-gradient(120mm 90mm at 15% 0%, #6366f1 0%, transparent 70%), radial-gradient(110mm 90mm at 100% 100%, #8b5cf6 0%, transparent 70%), #12142a; break-after: page; }
.cover .brand { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13pt; letter-spacing: -0.01em; }
.cover .brand svg { width: 30px; height: 30px; }
.cover .kicker { margin-top: auto; font-size: 10pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #c7d2fe; }
.cover h1 { font-size: 34pt; line-height: 1.08; letter-spacing: -0.03em; margin: 10px 0 14px; font-weight: 700; }
.cover .subtitle { font-size: 12.5pt; color: #dfe3ff; max-width: 150mm; }
.cover .meta { margin-top: 34mm; display: grid; grid-template-columns: 34mm 1fr; gap: 6px 10px; font-size: 9.5pt; color: #e8eaff; }
.cover .meta dt { color: #a5b4fc; }
.cover .meta dd { margin: 0; }
.cover .meta a { color: #fff; }
.cover .scope { margin-top: 14mm; border-top: 1px solid rgba(255,255,255,.18); padding-top: 8mm; font-size: 9pt; color: #c7cbea; }
.toc { break-after: page; }
.toc h2 { border: none; margin-top: 0; }
.toc ol { list-style: none; padding: 0; margin: 0; }
.toc li { padding: 5px 0; border-bottom: 1px dashed #dfe2ee; font-size: 10.5pt; }
.toc li.d1 { font-weight: 700; padding-top: 12px; color: #4338ca; border-bottom: none; }
.toc li.d2 { padding-left: 4mm; }
main h1 { font-size: 20pt; letter-spacing: -0.02em; color: #312e81; margin: 0 0 8px; break-before: page; }
main h1:first-child { break-before: auto; }
h2 { font-size: 14.5pt; letter-spacing: -0.015em; color: #1e1b4b; margin: 22px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #e0e7ff; break-after: avoid; }
h3 { font-size: 11.5pt; color: #312e81; margin: 16px 0 6px; break-after: avoid; }
h4 { font-size: 10.5pt; margin: 12px 0 4px; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
ul, ol { padding-left: 18px; }
li { margin: 2px 0; }
blockquote { margin: 10px 0; padding: 8px 12px; background: #f5f6ff; border-left: 3px solid #6366f1; color: #3b3f58; border-radius: 0 6px 6px 0; }
blockquote p { margin: 0; }
code { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 8.4pt; background: #f1f2f8; padding: 1px 4px; border-radius: 4px; color: #3730a3; }
pre { background: #0f1222; color: #e6e8f5; padding: 10px 12px; border-radius: 8px; font-size: 8.2pt; line-height: 1.45; overflow: hidden; white-space: pre-wrap; word-break: break-word; break-inside: avoid; }
pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 8.6pt; line-height: 1.4; }
thead th { background: #eef0ff; color: #1e1b4b; text-align: left; font-weight: 600; padding: 6px 7px; border-bottom: 1.5px solid #c7cdfa; }
tbody td { padding: 5px 7px; border-bottom: 1px solid #e6e8f2; vertical-align: top; }
tbody tr:nth-child(even) td { background: #fafbff; }
tr { break-inside: avoid; }
thead { display: table-header-group; }
hr { border: none; border-top: 1px solid #e3e5ef; margin: 18px 0; }
figure.diagram { margin: 12px 0 16px; padding: 12px; border: 1px solid #e3e6f5; border-radius: 10px; background: #fcfcff; break-inside: avoid; text-align: center; }
figure.diagram svg { max-width: 100%; height: auto; max-height: 215mm; }
figure.diagram figcaption { margin-top: 8px; font-size: 8.5pt; color: #5b6080; font-weight: 500; }
figure.diagram.wide { page: wide; break-before: page; break-after: page; margin: 0; height: 172mm; display: flex; flex-direction: column; justify-content: center; }
figure.diagram.wide svg { width: 100%; max-width: 100% !important; max-height: 150mm; }
figure.diagram.full { break-before: page; break-after: page; margin: 0; }
figure.diagram.full svg { width: 100%; max-width: 100% !important; max-height: 228mm; }
.part-intro { color: #4b5068; font-size: 10.5pt; }
`;

const logo = `<svg viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#818cf8"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><rect x="7.5" y="16.5" width="4.5" height="8" rx="2.25" fill="#fff" fill-opacity=".55"/><rect x="13.75" y="12" width="4.5" height="12.5" rx="2.25" fill="#fff" fill-opacity=".8"/><rect x="20" y="7.5" width="4.5" height="17" rx="2.25" fill="#fff"/></svg>`;

function page({ kicker, title, subtitle, scope, md }) {
  const { body, toc } = render(md);
  const tocHtml = toc
    .map((t) => `<li class="d${t.depth}"><a href="#${t.id}">${t.html}</a></li>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
<section class="cover">
  <div class="brand">${logo} DSA Sheet</div>
  <div class="kicker">${kicker}</div>
  <h1>${title}</h1>
  <div class="subtitle">${subtitle}</div>
  <dl class="meta">
    <dt>Project</dt><dd>DSA Sheet: plan, track and revise Data Structures &amp; Algorithms (MERN + TypeScript)</dd>
    <dt>Prepared for</dt><dd>Apna College · Technical Team Lead assessment</dd>
    <dt>Author</dt><dd>${AUTHOR}</dd>
    <dt>Date</dt><dd>${DATE}</dd>
    <dt>Live application</dt><dd><a href="${LIVE}">${LIVE}</a></dd>
    <dt>Source code</dt><dd><a href="${REPO}">${REPO}</a></dd>
  </dl>
  <div class="scope">${scope}</div>
</section>
<section class="toc"><h2>Contents</h2><ol>${tocHtml}</ol></section>
<main>${body}</main>
</body></html>`;
}

// ------------------------------------------------------------------ document definitions
const SD = 'docs/SYSTEM_DESIGN.md';
const DB = 'docs/DATABASE_SCHEMA.md';
const API = 'docs/API.md';
const systemDesign = read(SD);
const schema = read(DB);

const docs = [
  {
    file: '01-System-Design-HLD.pdf',
    kicker: 'Document 1 of 3 · High-Level Design',
    title: 'System Design Overview (HLD)',
    subtitle:
      'Architecture from client to server, database and deployment, designed for 10,000–50,000 active students.',
    scope:
      'Covers: architecture diagram (Client → Server → Database → Deployment) · request flow · authentication mechanism · data flow for progress tracking · scalability for concurrent users · deployment &amp; CI/CD · security. Database design is in Document 2; API design, scalability improvements and trade-offs are in Document 3.',
    md: absolutizeLinks(
      dropH1(slice(systemDesign, null, /^## 10\. /m)).replace(
        /^> Companion documents:.*$/m,
        '> Companion documents: **Document 2 — Database Schema (LLD)** and **Document 3 — API Design, Scalability Improvements & Trade-offs**.',
      ),
      SD,
    ),
  },
  {
    file: '02-Database-Schema-LLD.pdf',
    kicker: 'Document 2 of 3 · Low-Level Design',
    title: 'Database Schema (LLD)',
    subtitle:
      'Collections for Users, Topics, Problems and User Progress, with their relationships, indexing strategy and sizing.',
    scope:
      'Covers: the four required collections (Users, Topics, Problems, User Progress) plus Chapters, Sessions, Calendar Events and Study Plans · entity-relationship diagram · relationships · field-level schemas with examples · indexing strategy · sizing at 50,000 students · schema trade-offs.',
    md: absolutizeLinks(dropH1(schema), DB),
  },
  {
    file: '03-API-Scalability-Tradeoffs.pdf',
    kicker: 'Document 3 of 3 · Optional (Bonus)',
    title: 'API Design, Scalability Improvements & Trade-offs',
    subtitle:
      'The REST API contract, measured capacity with a roadmap for further scale, and the reasoning behind each major design decision.',
    scope:
      'Covers: <b>Part A</b> API design (conventions, error model, every endpoint with examples) · <b>Part B</b> scalability: measured load-test results and future improvements · <b>Part C</b> trade-offs: system-level decisions, schema decisions and Architecture Decision Records.',
    md: [
      '# Part A — API design',
      absolutizeLinks(dropH1(read(API)), API),
      '# Part B — Scalability improvements',
      '<p class="part-intro">How the current design scales (see Document 1, section 7) has been measured, and the roadmap below shows what to add as usage grows.</p>',
      '## Measured: load-test results',
      absolutizeLinks(demote(dropH1(read('loadtest/RESULTS.md'))), 'loadtest/RESULTS.md'),
      absolutizeLinks(
        slice(systemDesign, '## 11. Future scalability improvements (bonus)', null).replace(
          '## 11. Future scalability improvements (bonus)',
          '## Roadmap: future scalability improvements',
        ),
        SD,
      ),
      '# Part C — Trade-offs in design decisions',
      absolutizeLinks(
        slice(systemDesign, '## 10. Trade-offs (bonus)', /^## 11\. /m).replace(
          '## 10. Trade-offs (bonus)',
          '## System-level trade-offs',
        ),
        SD,
      ),
      absolutizeLinks(
        slice(schema, '## 5. Design trade-offs', null).replace(
          '## 5. Design trade-offs',
          '## Database schema trade-offs',
        ),
        DB,
      ),
      '## Architecture Decision Records',
      ...fs
        .readdirSync(path.join(ROOT, 'docs/adr'))
        .filter((f) => f.endsWith('.md'))
        .sort()
        .map((f) => absolutizeLinks(demote(demote(read(`docs/adr/${f}`))), `docs/adr/${f}`)),
    ].join('\n\n'),
  },
];

// ------------------------------------------------------------------ render
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const doc of docs) {
  const p = await browser.newPage();
  await p.setContent(page(doc), { waitUntil: 'networkidle' });
  await p.addScriptTag({ path: path.join(ROOT, 'node_modules/mermaid/dist/mermaid.min.js') });
  const failed = await p.evaluate(async () => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: {
        primaryColor: '#eef0ff',
        primaryBorderColor: '#6366f1',
        primaryTextColor: '#1e1b4b',
        lineColor: '#6b7194',
        fontSize: '13px',
        clusterBkg: '#f8f9ff',
        clusterBorder: '#c7cdfa',
      },
      flowchart: { htmlLabels: true, curve: 'basis' },
      sequence: {
        mirrorActors: false,
        useMaxWidth: true,
        messageFontSize: 14,
        actorFontSize: 14,
        noteFontSize: 13,
        wrap: false,
      },
      er: { useMaxWidth: true },
    });
    // Render diagrams one by one so a failure names the exact diagram and reason.
    const errors = [];
    const nodes = [...document.querySelectorAll('.mermaid')];
    for (const [i, el] of nodes.entries()) {
      const source = el.textContent;
      try {
        await mermaid.run({ nodes: [el] });
      } catch (e) {
        errors.push(
          `diagram #${i + 1} (${source.trim().split('\n')[0]}): ${e?.message ?? e?.str ?? JSON.stringify(e)}`,
        );
      }
    }
    return errors;
  });
  if (failed.length) throw new Error(`${doc.file}:\n  ${failed.join('\n  ')}`);
  await p.evaluate(() => document.fonts.ready);
  const bodyPdf = await p.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="width:100%;font-size:7.5px;color:#8a8fa8;padding:0 17mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif"><span>DSA Sheet · ${doc.title.replace(/&/g, '&amp;')}</span><span>${AUTHOR}</span></div>`,
    footerTemplate: `<div style="width:100%;font-size:7.5px;color:#8a8fa8;padding:0 17mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif"><span>${REPO}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
  // The cover is printed again without header/footer and laid over page 1, so the cover is clean
  // while every link (cover + contents) of the main render keeps working.
  const coverPdf = await p.pdf({ preferCSSPageSize: true, printBackground: true, pageRanges: '1' });
  const out = await PDFDocument.load(bodyPdf);
  const [cover] = await out.embedPdf(await PDFDocument.load(coverPdf), [0]);
  const first = out.getPage(0);
  first.drawPage(cover, { x: 0, y: 0, width: first.getWidth(), height: first.getHeight() });
  out.setTitle(`DSA Sheet — ${doc.title}`);
  out.setAuthor(AUTHOR);
  out.setSubject(doc.subtitle);
  out.setKeywords(['DSA Sheet', 'MERN', 'system design', 'Apna College']);
  out.setCreator('docs/build-pdf.mjs');
  fs.writeFileSync(path.join(OUT, doc.file), await out.save());
  console.log(`✔ docs/pdf/${doc.file} (${out.getPageCount()} pages)`);
  await p.close();
}
await browser.close();

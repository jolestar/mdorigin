export type BuiltInThemeName = 'paper' | 'atlas' | 'gazette';

export function getBuiltInThemeStyles(theme: BuiltInThemeName): string {
  switch (theme) {
    case 'atlas':
      return buildAtlasThemeStyles();
    case 'gazette':
      return buildGazetteThemeStyles();
    case 'paper':
    default:
      return buildPaperThemeStyles();
  }
}

function buildPaperThemeStyles(): string {
  return `
:root {
  color-scheme: light;
  --bg: #f7f4ee;
  --surface: #fffdf9;
  --text: #1c1a17;
  --muted: #6d655c;
  --border: #ddd3c4;
  --link: #7a3d16;
  --link-hover: #57290f;
  --code-bg: #f1ece3;
  --quote: #8e7f6d;
  --max: 46rem;
}
* { box-sizing: border-box; }
html { font-size: 18px; }
body {
  margin: 0;
  background:
    radial-gradient(circle at top, rgba(255,255,255,0.95), transparent 40%),
    linear-gradient(180deg, #f3eee4 0%, var(--bg) 100%);
  color: var(--text);
  font-family: Charter, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  line-height: 1.75;
}
a { color: var(--link); text-decoration-thickness: 0.08em; text-underline-offset: 0.14em; }
a:hover { color: var(--link-hover); }
.site-header {
  max-width: calc(var(--max) + 4rem);
  margin: 0 auto;
  padding: 1.25rem 2rem 0;
}
.site-header__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem 1.75rem;
  align-items: end;
}
.site-header__brand { min-width: 0; }
.site-header__title { margin: 0; }
.site-header__brand span {
  display: block;
  margin-top: 0.3rem;
  color: var(--muted);
  font-size: 0.95rem;
}
.site-header__title a {
  display: inline-block;
  color: var(--muted);
  text-decoration: none;
  font-size: 0.92rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.site-header__logo {
  display: inline-flex;
  align-items: center;
  margin-right: 0.55rem;
  vertical-align: middle;
}
.site-header__logo img {
  display: block;
  width: 1.4rem;
  height: 1.4rem;
  object-fit: contain;
}
.site-nav ul {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  align-items: center;
  justify-content: flex-end;
}
.site-nav {
  min-width: 0;
}
.site-nav li {
  display: flex;
  align-items: center;
  margin: 0;
}
.site-nav li + li {
  margin-top: 0;
}
.site-nav a {
  color: var(--text);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.1rem;
}
.site-nav a:hover { text-decoration: underline; }
main {
  max-width: calc(var(--max) + 4rem);
  margin: 0 auto;
  padding: 1.25rem 2rem 4rem;
}
.site-footer {
  max-width: calc(var(--max) + 4rem);
  margin: 0 auto;
  padding: 0 2rem 2.5rem;
}
.site-footer__inner {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  color: var(--muted);
}
.site-footer__nav ul,
.site-footer__social {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
}
.site-footer__nav li,
.site-footer__social li {
  margin: 0;
}
.site-footer__social {
  margin-top: 0.9rem;
}
.site-footer__social a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--muted);
}
.site-footer__social svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}
.site-footer__social-label {
  font-size: 0.82rem;
  font-weight: 700;
}
.site-footer__text,
.site-footer__edit-link {
  display: block;
  margin-top: 0.9rem;
}
article {
  background: color-mix(in srgb, var(--surface) 92%, white 8%);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 2.5rem;
  box-shadow: 0 16px 40px rgba(52, 41, 29, 0.07);
}
article > p:first-child {
  margin-top: 0;
  color: var(--muted);
  font-size: 0.95rem;
  font-weight: 600;
}
h1, h2, h3, h4 { line-height: 1.15; letter-spacing: -0.02em; margin: 2rem 0 0.8rem; }
h1 { font-size: clamp(2.1rem, 5vw, 3.2rem); margin-top: 0.2rem; }
h2 { font-size: 1.45rem; }
h3 { font-size: 1.15rem; }
p, ul, ol, pre, table, blockquote { margin: 1rem 0; }
ul, ol { padding-left: 1.3rem; }
li + li { margin-top: 0.35rem; }
img { max-width: 100%; height: auto; border-radius: 12px; }
pre, code { font-family: "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; }
code {
  background: var(--code-bg);
  border-radius: 0.35rem;
  padding: 0.12rem 0.35rem;
  font-size: 0.9em;
}
pre {
  background: #201c17;
  color: #f8f3ea;
  padding: 1rem 1.15rem;
  border-radius: 14px;
  overflow-x: auto;
}
pre code { background: transparent; padding: 0; color: inherit; }
blockquote {
  margin-left: 0;
  padding: 0.2rem 0 0.2rem 1rem;
  border-left: 3px solid var(--border);
  color: var(--quote);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
th, td {
  text-align: left;
  border-bottom: 1px solid var(--border);
  padding: 0.6rem 0.4rem;
}
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
@media (max-width: 720px) {
  html { font-size: 17px; }
  .site-header, main, .site-footer { padding-left: 1rem; padding-right: 1rem; }
  .site-header__inner {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .site-nav {
    margin-top: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--border);
  }
  .site-nav ul { margin-top: 0; }
  .site-nav ul { justify-content: flex-start; }
  article { padding: 1.3rem; border-radius: 16px; }
}

`.trim();
}

function buildAtlasThemeStyles(): string {
  return `
:root {
  color-scheme: light;
  --bg: #eef3f8;
  --surface: #ffffff;
  --surface-alt: #f7fafc;
  --text: #102033;
  --muted: #5a6a7b;
  --border: #d7e1ec;
  --link: #0f5bd7;
  --link-hover: #0a3f98;
  --accent: #dbe9ff;
  --code-bg: #edf3ff;
  --max: 62rem;
}
* { box-sizing: border-box; }
html { font-size: 17px; }
body {
  margin: 0;
  background:
    linear-gradient(180deg, #f8fbff 0%, var(--bg) 52%, #f5f7fb 100%);
  color: var(--text);
  font-family: "Avenir Next", Avenir, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
  line-height: 1.7;
}
a { color: var(--link); text-decoration: none; }
a:hover { color: var(--link-hover); text-decoration: underline; }
.site-header {
  position: sticky;
  top: 0;
  z-index: 1;
  backdrop-filter: blur(14px);
  background: rgba(248, 251, 255, 0.88);
  border-bottom: 1px solid rgba(215, 225, 236, 0.88);
}
.site-header__inner {
  max-width: calc(var(--max) + 4rem);
  margin: 0 auto;
  padding: 1rem 2rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem 2rem;
  align-items: end;
}
.site-header__brand { min-width: 0; }
.site-header__title { margin: 0; }
.site-header__brand span {
  display: block;
  margin-top: 0.25rem;
  color: var(--muted);
  font-size: 0.92rem;
  max-width: 34rem;
}
.site-header__title a {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.site-header__logo img {
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}
.site-nav ul {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 1.05rem;
  margin: 0;
  padding: 0;
  align-items: center;
  justify-content: flex-end;
}
.site-nav li {
  display: flex;
  align-items: center;
  margin: 0;
}
.site-nav li + li {
  margin-top: 0;
}
.site-nav {
  min-width: 0;
}
.site-nav a {
  color: var(--muted);
  font-size: 0.94rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 0.05rem;
  white-space: nowrap;
}
.site-nav a:hover { color: var(--link-hover); }
main {
  max-width: calc(var(--max) + 4rem);
  margin: 0 auto;
  padding: 2rem;
}
.site-footer {
  max-width: calc(var(--max) + 4rem);
  margin: 0 auto;
  padding: 0 2rem 2.5rem;
}
.site-footer__inner {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  color: var(--muted);
}
.site-footer__nav ul,
.site-footer__social {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0;
  padding: 0;
}
.site-footer__nav li,
.site-footer__social li {
  margin: 0;
}
.site-footer__social {
  margin-top: 1rem;
}
.site-footer__social a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  color: var(--muted);
}
.site-footer__social svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}
.site-footer__social-label {
  font-size: 0.82rem;
  font-weight: 700;
}
.site-footer__text,
.site-footer__edit-link {
  display: block;
  margin-top: 0.95rem;
}
article {
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,250,252,0.98));
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 2.25rem 2.4rem;
  box-shadow: 0 24px 50px rgba(15, 34, 58, 0.08);
}
article > p:first-child {
  margin-top: 0;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 600;
}
h1, h2, h3, h4 {
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin: 2rem 0 0.8rem;
  scroll-margin-top: 5rem;
}
h1 { font-size: clamp(2.3rem, 6vw, 3.8rem); margin-top: 0.15rem; }
h2 {
  font-size: 1.45rem;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(215, 225, 236, 0.8);
}
h3 { font-size: 1.1rem; }
p, ul, ol, pre, table, blockquote { margin: 1rem 0; }
ul, ol { padding-left: 1.4rem; }
li + li { margin-top: 0.35rem; }
img { max-width: 100%; height: auto; border-radius: 14px; border: 1px solid var(--border); background: white; }
pre, code { font-family: "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; }
code {
  background: var(--code-bg);
  color: #183f7a;
  border-radius: 0.35rem;
  padding: 0.16rem 0.38rem;
  font-size: 0.88em;
}
pre {
  background: #0f1722;
  color: #eaf1ff;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  overflow-x: auto;
  border: 1px solid rgba(255,255,255,0.06);
}
pre code { background: transparent; color: inherit; padding: 0; }
blockquote {
  margin-left: 0;
  padding: 0.1rem 0 0.1rem 1rem;
  border-left: 3px solid #9fc1ff;
  color: var(--muted);
}
table { width: 100%; border-collapse: collapse; font-size: 0.94rem; }
th, td { text-align: left; border-bottom: 1px solid var(--border); padding: 0.72rem 0.4rem; }
th { color: var(--muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em; }
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
@media (max-width: 720px) {
  .site-header__inner, main, .site-footer { padding-left: 1rem; padding-right: 1rem; }
  .site-header__inner {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 0.5rem;
  }
  .site-nav {
    margin-top: 0.2rem;
    padding-top: 0.8rem;
    border-top: 1px solid rgba(215, 225, 236, 0.88);
  }
  .site-nav ul { justify-content: flex-start; }
  article { padding: 1.3rem; border-radius: 18px; }
}

`.trim();
}

function buildGazetteThemeStyles(): string {
  return `
:root {
  color-scheme: light;
  --bg: #f3eee6;
  --surface: #fffdf8;
  --surface-alt: #efe7db;
  --text: #1b1712;
  --muted: #736558;
  --border: #d8c9b7;
  --link: #8a2d12;
  --link-hover: #5f1d0c;
  --code-bg: #f0e3d0;
  --max: 54rem;
}
* { box-sizing: border-box; }
html { font-size: 18px; }
body {
  margin: 0;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.72), transparent 20%),
    radial-gradient(circle at 100% 0, rgba(177, 109, 68, 0.08), transparent 35%),
    var(--bg);
  color: var(--text);
  font-family: "Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.75;
}
a { color: var(--link); text-decoration-thickness: 0.08em; text-underline-offset: 0.14em; }
a:hover { color: var(--link-hover); }
.site-header {
  max-width: calc(var(--max) + 6rem);
  margin: 0 auto;
  padding: 1.25rem 2rem 0;
}
.site-header__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem 2rem;
  align-items: end;
}
.site-header__brand { min-width: 0; }
.site-header__title { margin: 0; }
.site-header__brand span {
  display: block;
  margin-top: 0.3rem;
  color: var(--muted);
  font-size: 0.95rem;
  max-width: 34rem;
}
.site-header__title a {
  color: var(--text);
  text-decoration: none;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.82rem;
}
.site-header__logo {
  display: inline-flex;
  align-items: center;
  margin-right: 0.55rem;
  vertical-align: middle;
}
.site-header__logo img {
  display: block;
  width: 1.45rem;
  height: 1.45rem;
  object-fit: contain;
}
.site-nav ul {
  list-style: none;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
}
.site-nav {
  min-width: 0;
}
.site-nav li {
  display: flex;
  align-items: center;
  margin: 0;
}
.site-nav li + li {
  margin-top: 0;
}
.site-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.95rem;
}
main {
  max-width: calc(var(--max) + 6rem);
  margin: 0 auto;
  padding: 1.4rem 2rem 4rem;
}
.site-footer {
  max-width: calc(var(--max) + 6rem);
  margin: 0 auto;
  padding: 0 2rem 2.5rem;
}
.site-footer__inner {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  color: var(--muted);
}
.site-footer__nav ul,
.site-footer__social {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
}
.site-footer__nav li,
.site-footer__social li {
  margin: 0;
}
.site-footer__social {
  margin-top: 0.95rem;
}
.site-footer__social a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--muted);
}
.site-footer__social svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}
.site-footer__social-label {
  font-size: 0.82rem;
  font-weight: 700;
}
.site-footer__text,
.site-footer__edit-link {
  display: block;
  margin-top: 0.9rem;
}
article {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,253,248,0.98)),
    var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 2.6rem 2.4rem 2.4rem;
  box-shadow: 0 18px 44px rgba(45, 29, 16, 0.08);
  position: relative;
}
article::before {
  content: "";
  position: absolute;
  inset: 0;
  border-top: 5px solid #b7673c;
  border-radius: 10px;
  pointer-events: none;
}
article > p:first-child {
  margin-top: 0;
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 600;
}
h1, h2, h3, h4 {
  font-family: "Iowan Old Style", Charter, Georgia, serif;
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin: 2rem 0 0.8rem;
}
h1 { font-size: clamp(2.4rem, 5vw, 4.1rem); margin-top: 0.2rem; }
h2 { font-size: 1.6rem; }
h3 { font-size: 1.16rem; }
p, ul, ol, pre, table, blockquote { margin: 1rem 0; }
ul, ol { padding-left: 1.35rem; }
li + li { margin-top: 0.35rem; }
img { max-width: 100%; height: auto; border-radius: 6px; border: 1px solid var(--border); }
pre, code { font-family: "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; }
code {
  background: var(--code-bg);
  border-radius: 0.3rem;
  padding: 0.12rem 0.35rem;
  font-size: 0.88em;
}
pre {
  background: #231a14;
  color: #fff6eb;
  padding: 1rem 1.1rem;
  border-radius: 10px;
  overflow-x: auto;
}
pre code { background: transparent; padding: 0; color: inherit; }
blockquote {
  margin-left: 0;
  padding: 0.1rem 0 0.1rem 1rem;
  border-left: 3px solid #b7673c;
  color: var(--muted);
  font-style: italic;
}
table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
th, td { text-align: left; border-bottom: 1px solid var(--border); padding: 0.7rem 0.45rem; }
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
@media (max-width: 720px) {
  html { font-size: 17px; }
  .site-header, main, .site-footer { padding-left: 1rem; padding-right: 1rem; }
  .site-header__inner {
    grid-template-columns: 1fr;
    align-items: start;
  }
  .site-nav {
    margin-top: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--border);
  }
  .site-nav ul { justify-content: flex-start; }
  article { padding: 1.35rem 1.2rem 1.25rem; }
}

`.trim();
}

import { defineConfig } from "mdorigin";

export default defineConfig({
  siteTitle: "Listing Layout Example",
  plugins: [
    {
      name: "listing-layout",
      renderPage(page, _context, next) {
        if (page.kind !== "listing") {
          return next(page);
        }

        const title = escapeHtml(page.title);
        return [
          "<!doctype html>",
          "<html><body>",
          `<main class="listing-shell"><header><h1>${title}</h1></header>${page.bodyHtml}<section class="listing-grid">${page.listingEntries
            .map(
              (entry) =>
                `<a class="listing-card" href="${escapeHtml(entry.href)}"><strong>${escapeHtml(
                  entry.title,
                )}</strong>${
                  entry.detail ? `<span>${escapeHtml(entry.detail)}</span>` : ""
                }</a>`,
            )
            .join("")}</section></main>`,
          "</body></html>",
        ].join("");
      },
    },
  ],
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

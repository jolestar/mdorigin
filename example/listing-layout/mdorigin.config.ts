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

        return [
          "<!doctype html>",
          "<html><body>",
          `<main class="listing-shell"><header><h1>${page.title}</h1></header>${page.bodyHtml}<section class="listing-grid">${page.listingEntries
            .map(
              (entry) =>
                `<a class="listing-card" href="${entry.href}"><strong>${entry.title}</strong>${
                  entry.detail ? `<span>${entry.detail}</span>` : ""
                }</a>`,
            )
            .join("")}</section></main>`,
          "</body></html>",
        ].join("");
      },
    },
  ],
});

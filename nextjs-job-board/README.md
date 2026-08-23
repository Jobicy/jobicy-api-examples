# Jobicy Next.js Job Board

A small, production-shaped remote job board using Next.js App Router, TypeScript, server rendering, hourly caching, and original Jobicy application links.

## Start locally

```bash
cd nextjs-job-board
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Node.js 20.9 or newer is required.

```bash
npm run typecheck
npm run build
npm start
```

## Filtering and pagination

Use the keyword, location slug, and industry slug fields. The application forwards these as the official Jobicy API `tag`, `geo`, and `industry` query parameters. Discover current [location slugs](https://jobicy.com/api/v2/remote-jobs?get=locations) and [industry slugs](https://jobicy.com/api/v2/remote-jobs?get=industries).

One API response contains at most 100 jobs. The application deduplicates listing IDs, renders 12 jobs per page, and paginates that response locally. Filter and page state live in shareable URL query parameters. Upstream responses are cached and revalidated once per hour.

Each card displays the employer, optional logo, remote location, employment type, categories, publication date, optional salary, short excerpt, and canonical Jobicy URL. HTML-bearing descriptions are not rendered or republished. Separate loading, empty, and error states remain accessible on narrow screens.

Every public interface includes **[Jobs powered by Jobicy](https://jobicy.com/)** attribution. Keep this attribution and the original listing URLs when adapting the project.

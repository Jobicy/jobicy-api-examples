interface PaginationProps {
  nextCursor: string | null;
  isContinuation: boolean;
  keyword: string;
  geo: string;
  industry: string;
}

export function pageHref(cursor: string | null, { keyword, geo, industry }: Pick<PaginationProps, "keyword" | "geo" | "industry">): string {
  const query = new URLSearchParams();
  if (keyword) query.set("q", keyword);
  if (geo) query.set("geo", geo);
  if (industry) query.set("industry", industry);
  if (cursor) query.set("cursor", cursor);
  const encoded = query.toString();
  return encoded ? `/?${encoded}` : "/";
}

export default function Pagination({ nextCursor, isContinuation, keyword, geo, industry }: PaginationProps) {
  if (!nextCursor && !isContinuation) return null;
  const filters = { keyword, geo, industry };

  return (
    <nav className="pagination" aria-label="Job listing pages">
      {isContinuation ? (
        <a href={pageHref(null, filters)} className="pagination__link">← Latest listings</a>
      ) : (
        <span className="pagination__link pagination__link--disabled">← Latest listings</span>
      )}
      {nextCursor ? (
        <a href={pageHref(nextCursor, filters)} className="pagination__link">Older listings →</a>
      ) : (
        <span className="pagination__link pagination__link--disabled">End of available listings</span>
      )}
    </nav>
  );
}

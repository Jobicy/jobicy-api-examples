interface PaginationProps {
  currentPage: number;
  totalPages: number;
  keyword: string;
  geo: string;
  industry: string;
}

function pageHref(page: number, { keyword, geo, industry }: Omit<PaginationProps, "currentPage" | "totalPages">): string {
  const query = new URLSearchParams();
  if (keyword) query.set("q", keyword);
  if (geo) query.set("geo", geo);
  if (industry) query.set("industry", industry);
  if (page > 1) query.set("page", String(page));
  const encoded = query.toString();
  return encoded ? `/?${encoded}` : "/";
}

export default function Pagination({ currentPage, totalPages, keyword, geo, industry }: PaginationProps) {
  if (totalPages <= 1) return null;

  const filters = { keyword, geo, industry };

  return (
    <nav className="pagination" aria-label="Job listing pages">
      {currentPage > 1 ? (
        <a href={pageHref(currentPage - 1, filters)} className="pagination__link">← Newer listings</a>
      ) : (
        <span className="pagination__link pagination__link--disabled">← Newer listings</span>
      )}
      <span className="pagination__position">Page {currentPage} of {totalPages}</span>
      {currentPage < totalPages ? (
        <a href={pageHref(currentPage + 1, filters)} className="pagination__link">Older listings →</a>
      ) : (
        <span className="pagination__link pagination__link--disabled">Older listings →</span>
      )}
    </nav>
  );
}

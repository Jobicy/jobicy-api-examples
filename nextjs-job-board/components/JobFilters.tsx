interface JobFiltersProps {
  keyword: string;
  geo: string;
  industry: string;
}

export default function JobFilters({ keyword, geo, industry }: JobFiltersProps) {
  return (
    <form action="/" className="filters" aria-label="Filter remote jobs">
      <label className="filter-field">
        <span>Role or keyword</span>
        <input type="search" name="q" defaultValue={keyword} placeholder="Python, design, product" autoComplete="off" />
      </label>
      <label className="filter-field">
        <span>Location slug</span>
        <input type="text" name="geo" defaultValue={geo} placeholder="usa, canada, europe" autoComplete="off" />
      </label>
      <label className="filter-field">
        <span>Industry slug</span>
        <input type="text" name="industry" defaultValue={industry} placeholder="engineering, marketing" autoComplete="off" />
      </label>
      <button type="submit" className="filter-submit">Find jobs</button>
    </form>
  );
}

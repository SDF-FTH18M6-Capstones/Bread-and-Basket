import { Search } from "lucide-react";

export default function SearchInput({
  id,
  value,
  onChange,
  placeholder = "Search products or campaigns...",
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search campaigns
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10"
      />
    </div>
  );
}

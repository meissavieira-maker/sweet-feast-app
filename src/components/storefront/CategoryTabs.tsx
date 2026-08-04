import type { CategoryRow } from "@/hooks/use-categories";

export function CategoryTabs({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryRow[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-3xl px-4">
        <div className="no-scrollbar flex gap-6 overflow-x-auto">
          {categories.map((c) => {
            const isActive = c.slug === active;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.slug)}
                className={`relative whitespace-nowrap py-3.5 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm ${
                  isActive ? "text-brand" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
                <span
                  className={`absolute inset-x-0 -bottom-px h-[3px] rounded-full transition-opacity ${
                    isActive ? "bg-brand opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

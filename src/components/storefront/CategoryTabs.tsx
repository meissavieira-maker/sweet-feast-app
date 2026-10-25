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
    <div className="border-b border-border/80 bg-card/95 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl px-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto py-2">
          {categories.map((c) => {
            const isActive = c.slug === active;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => onSelect(c.slug)}
                aria-current={isActive ? "true" : undefined}
                className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${isActive
                  ? "bg-brand text-brand-foreground shadow-soft"
                  : "bg-muted/70 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

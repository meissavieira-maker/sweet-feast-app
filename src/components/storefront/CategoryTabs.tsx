import { categories } from "@/lib/products";

export function CategoryTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-5 sm:mx-0 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
          {categories.map((c) => {
            const isActive = c.id === active;
            return (
              <button
                key={c.id}
                onClick={() => onChange(c.id)}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
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

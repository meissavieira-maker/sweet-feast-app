import { categories } from "@/lib/products";

export function CategoryTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl px-4">
        <div className="no-scrollbar flex gap-6 overflow-x-auto">
          {categories.map((c) => {
            const isActive = c.id === active;
            return (
              <button
                key={c.id}
                onClick={() => onChange(c.id)}
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

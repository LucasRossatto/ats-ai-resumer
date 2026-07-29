import { cn } from "@/lib/utils";

interface VersionSwitcherVersion {
  _id: string;
  label: string;
}

interface VersionSwitcherProps {
  versions: VersionSwitcherVersion[];
  activeId?: string;
  onChange: (id: string) => void;
}

export function VersionSwitcher({ versions, activeId, onChange }: VersionSwitcherProps) {
  if (!versions?.length) return null;
  return (
    <div className="inline-flex items-center gap-1 bg-[var(--muted)] border border-[var(--border)] p-1 rounded-full">
      {versions.map((v) => (
        <button
          key={v._id}
          onClick={() => onChange(v._id)}
          className={cn(
            "h-8 px-3 text-xs font-medium rounded-full transition-colors tabular",
            activeId === v._id
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-card"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

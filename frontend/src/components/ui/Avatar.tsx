import { cn } from "@/lib/utils";

function initials(name = ""): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--primary-strong)] font-semibold overflow-hidden ring-2 ring-[var(--card)]",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials(name) || "?"}</span>
      )}
    </div>
  );
}

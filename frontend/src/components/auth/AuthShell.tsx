import { motion } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BrandCardMarquee } from "./BrandCardMarquee";

const NOISE_DATA_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='0.9'/></svg>\")";

interface AuthShellProps {
  children: ReactNode;
  headline: ReactNode;
  subhead: ReactNode;
}

export function AuthShell({ children, headline, subhead }: AuthShellProps) {
  return (
    <div className="min-h-dvh flex bg-[var(--background)] p-3 sm:p-4 gap-0 lg:gap-4">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>

      {/* Right — brand panel (desktop only) */}
      <BrandPanel headline={headline} subhead={subhead} />
    </div>
  );
}

function BrandPanel({ headline, subhead }: { headline: ReactNode; subhead: ReactNode }) {
  return (
    <div className="hidden lg:block flex-1 relative rounded-[28px] overflow-hidden isolate">
      <div className="absolute inset-0 bg-[#14162F]" />

      {/* Noise grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: NOISE_DATA_URI }}
      />

      {/* Soft inner vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 120px 20px rgba(0,0,0,0.35)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between pt-10 xl:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="px-10 xl:px-16"
        >
          <h2
            className="font-display text-[38px] xl:text-[48px] leading-[1.06] font-semibold tracking-tight text-white max-w-[560px]"
          >
            {headline}
          </h2>

          <p className="text-white/65 text-base xl:text-lg mt-6 max-w-md leading-relaxed">
            {subhead}
          </p>
        </motion.div>

        <div className="pb-8 xl:pb-0">
          <BrandCardMarquee />
        </div>
      </div>
    </div>
  );
}

interface AuthFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  extra?: ReactNode;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  icon?: LucideIcon;
  enterKeyHint?: "next" | "go" | "done";
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  extra,
  autoComplete,
  required = true,
  minLength,
  icon: Icon,
  enterKeyHint,
}: AuthFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block mb-1.5 text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          enterKeyHint={enterKeyHint}
          required={required}
          minLength={minLength}
          className={`peer w-full h-11 ${
            Icon ? "pl-11 pr-4" : "px-4"
          } rounded-xl border border-[var(--border)] bg-[var(--card)] text-base text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 outline-none transition-all duration-200 focus:border-[var(--primary)]/40 focus:ring-4 focus:ring-[var(--primary)]/10`}
        />
        {Icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]/55 peer-focus:text-[var(--primary-strong)] peer-[:not(:placeholder-shown)]:text-[var(--primary-strong)] transition-colors">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
      {extra && <div className="mt-2 flex justify-end">{extra}</div>}
    </div>
  );
}

interface AuthPrimaryButtonProps extends ComponentProps<typeof motion.button> {
  children: ReactNode;
}

export function AuthPrimaryButton({ children, disabled, ...props }: AuthPrimaryButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      disabled={disabled}
      className="w-full h-11 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-base flex items-center justify-center gap-2 transition-colors duration-200 hover:bg-[var(--primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)]/25 disabled:opacity-60 disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function AuthErrorBanner({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Brings the error into view, so it is not hidden behind the keyboard or the fold.
  useEffect(() => {
    if (children) ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [children]);
  if (!children) return null;
  return (
    <motion.div
      ref={ref}
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-base text-[var(--destructive)] bg-[#F8E3E0] rounded-2xl px-4 py-2.5 leading-snug"
    >
      {children}
    </motion.div>
  );
}

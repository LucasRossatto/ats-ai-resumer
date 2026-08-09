import { cva, type VariantProps } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-tight tabular-nums",
  {
    variants: {
      tone: {
        neutral:
          "bg-[#F0F0F0]/80 border-[#D9D9D9] text-[#646464] dark:bg-[#272A2D] dark:border-[#3A3D40] dark:text-[#B9BABD]",
        success:
          "bg-[#E9F6E9]/80 border-[#B2DDB5] text-[#218358] dark:bg-[#132D21] dark:border-[#113B29] dark:text-[#A0DCB8]",
        info:
          "bg-[#E1F0FF]/80 border-[#B7D9F8] text-[#0D74CE] dark:bg-[#0D2847] dark:border-[#003362] dark:text-[#9EC0DA]",
        highlight:
          "bg-[#FBEBFB]/80 border-[#E9C2E7] text-[#953EA3] dark:bg-[#37172F] dark:border-[#4B143D] dark:text-[#D5ACC4]",
        warning:
          "bg-[#FFE9D9]/80 border-[#FFC182] text-[#CC4E00] dark:bg-[#462100] dark:border-[#562800] dark:text-[#E1C0A2]",
        danger:
          "bg-[#FEEBEC]/80 border-[#F4A9AA] text-[#CE2C31] dark:bg-[#3B1219] dark:border-[#611623] dark:text-[#FF9592]",
        accent:
          "bg-[var(--accent)]/80 border-transparent text-[var(--primary-strong)] dark:bg-[var(--accent)] dark:text-[var(--primary-strong)]",
        ink:
          "bg-[var(--foreground)]/80 border-transparent text-[var(--background)] dark:bg-[var(--foreground)] dark:text-[var(--background)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
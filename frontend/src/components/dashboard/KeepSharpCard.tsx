import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function KeepSharpCard() {
  const { t } = useTranslation("dashboard");
  return (
    <Card className="h-full flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-[var(--accent)] text-[var(--primary-strong)] flex items-center justify-center mb-3">
        <Sparkles size={22} />
      </div>
      <div className="font-display text-base font-semibold tracking-tight">
        {t("keepSharp.title")}
      </div>
      <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[180px]">
        {t("keepSharp.desc")}
      </p>
      <Button variant="accent" size="sm" className="mt-4">
        {t("keepSharp.reanalyze")}
      </Button>
    </Card>
  );
}

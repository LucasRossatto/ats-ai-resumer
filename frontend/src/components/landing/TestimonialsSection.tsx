import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { SectionHeader } from "./FeaturesSection";

const TESTIMONIALS = [
  {
    quote:
      "I'd been ghosted by 40+ companies. Ran my resume through Roaster, fixed 6 issues, and landed 3 onsites in two weeks.",
    name: "Priya Raman",
    role: "Senior Frontend Engineer",
    company: "fintech scale-up",
    initials: "PR",
  },
  {
    quote:
      "The rewrites actually sound like me. No 'leveraged' or 'spearheaded' garbage. My ATS score jumped from 58 to 89.",
    name: "Marcus Chen",
    role: "Backend Engineer",
    company: "dev-tools startup",
    initials: "MC",
  },
  {
    quote:
      "As a new grad, I had no idea recruiters were filtering me out before a human saw the resume. Brutal — but fixable in one afternoon.",
    name: "Sofia Ruiz",
    role: "CS Senior, UIUC",
    company: "intern, project-mgmt SaaS",
    initials: "SR",
  },
  {
    quote:
      "I wish this existed when I switched from full-stack to ML. Keyword optimization alone was worth the signup.",
    name: "Daniel Park",
    role: "ML Engineer",
    company: "AI research lab",
    initials: "DP",
  },
  {
    quote:
      "The diff view is what sold me. I could see exactly what changed and why — not some black-box rewrite.",
    name: "Aisha Hassan",
    role: "Product Designer",
    company: "design-tools company",
    initials: "AH",
  },
  {
    quote:
      "Used it the night before applying to FAANG. Got my first response in 36 hours. Sample size of one, but I'll take it.",
    name: "Jordan Blake",
    role: "Full-Stack Developer",
    company: "freelance",
    initials: "JB",
  },
];

export function TestimonialsSection() {
  return (
    <section
      className="px-3 sm:px-6 mt-28 sm:mt-36"
      style={{ maxWidth: 1240, marginLeft: "auto", marginRight: "auto" }}
    >
      <SectionHeader
        title={<>Loved by engineers who've been there.</>}
        sub="From new grads sweating their first SWE role to senior ICs switching domains."
      />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.05 }}
            className="rounded-[22px] bg-[var(--card)] border border-[var(--border)] shadow-card hover:shadow-hover transition-all p-5 sm:p-6 flex flex-col"
          >
            <div className="flex gap-0.5 text-[var(--primary)] mb-3">
              {Array.from({ length: 5 }).map((_, k) => (
                <Star key={k} size={13} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="text-[14px] text-[var(--foreground)] leading-relaxed flex-1">
              "{t.quote}"
            </p>
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[var(--border)]">
              <div className="h-9 w-9 rounded-full bg-[var(--primary-strong)] text-white flex items-center justify-center font-display text-[12px] font-semibold tabular">
                {t.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                  {t.name}
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)] truncate">
                  {t.role} · {t.company}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

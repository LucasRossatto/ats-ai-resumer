import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { ArrowRight, Play, X } from "lucide-react";
import { DarkPanel } from "./DarkPanel";
import { HeroDashboardPreview } from "./HeroDashboardPreview";

const VIDEO_ID = "D35Ocy91y3Q";

export function HeroSection() {
  const { t } = useTranslation("landing");
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** The iframe only exists while open, so closing the modal also stops the video. */
  const [open, setOpen] = useState(false);
  return (
    <section className="relative w-full">
      <DarkPanel
        className="w-full min-h-[660px] 2xl:min-h-[820px]"
        radius="rounded-b-[40px] sm:rounded-b-[56px]"
      >
        <div
          className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center px-6 sm:px-10 lg:px-16 pt-32 sm:pt-16 2xl:pt-36 pb-16 lg:pb-24"
          style={{ maxWidth: 1280, marginLeft: "auto", marginRight: "auto" }}
        >
          {/* Copy */}
          <div className="text-white">


            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="font-display text-[4.5vh] md:text-[6.5vh] lg:text-[8.1vh] xl:text-[10vh] 2xl:text-[64px] leading-[0.98] tracking-tight "
            >
              {t("hero.titleLine1")}
              <br />
              {t("hero.titleLine2Muted")}{" "}
              <span style={{ color: "#6B93FF" }}>
                {t("hero.titleHighlight")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-white/65 text-[1.8vh] md:text-[2.3vh] lg:text-[2.7vh] xl:text-[3.5vh] 2xl:text-[19px] mt-6 max-w-[540px] leading-relaxed"
            >
              {t("hero.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="flex flex-nowrap sm:flex-wrap items-center gap-2 sm:gap-3 mt-8"
            >
              <Link
                to="/register"
                className="group inline-flex flex-1 sm:flex-none justify-center whitespace-nowrap items-center gap-2 h-12 px-3 sm:px-5 rounded-full font-semibold text-[1.4vh] md:text-[1.8vh] lg:text-[1.8vh] xl:text-[2.3vh] 2xl:text-[14px] text-white bg-[#5360FF] shadow-[0_10px_30px_-8px_rgba(83,96,255,0.5)] transition-all hover:bg-[#4750E0] hover:shadow-[0_14px_36px_-8px_rgba(83,96,255,0.7)] active:scale-[0.98]"
              >
                {t("hero.ctaPrimary")}
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  dialogRef.current?.showModal();
                }}
                className="inline-flex flex-1 sm:flex-none justify-center whitespace-nowrap items-center gap-2 h-12 px-3 sm:px-5 rounded-full font-medium text-[1.4vh] md:text-[1.8vh] lg:text-[1.8vh] xl:text-[2.3vh] 2xl:text-[14px] text-white bg-white/8 border border-white/12 hover:bg-white/12 transition-colors"
              >
                <Play size={13} fill="currentColor" />
                {t("hero.ctaSecondary")}
              </button>
            </motion.div>


          </div>

          {/* Visual */}
          <div className="relative">
            <HeroDashboardPreview />
          </div>
        </div>
      </DarkPanel>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        aria-label={t("hero.ctaSecondary")}
        className="m-auto w-[min(92vw,960px)] p-0 bg-transparent backdrop:bg-black/70 backdrop:backdrop-blur-sm overflow-visible"
      >
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t("common:actions.close")}
          className="absolute -top-11 right-0 grid place-items-center size-9 rounded-full text-white bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
          {open && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
              title={t("hero.ctaSecondary")}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="size-full"
            />
          )}
        </div>
      </dialog>
    </section>
  );
}

import { useEffect, useState } from "react";

/** Contagem regressiva em segundos: `left` > 0 enquanto durar a espera. */
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const active = left > 0;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);

  function start(seconds: number) {
    const n = Date.now();
    setNow(n);
    setUntil(n + seconds * 1000);
  }

  return { left, start };
}

import type { TFunction } from "i18next";
import type { ApiError } from "@/types/common";

export const MIN_PASSWORD = 8;
/** Espera padrão após um 429, usada se faltar `Retry-After`. */
export const DEFAULT_RETRY_SECONDS = 30;

/** O backend responde em inglês; aqui cada caso conhecido vira texto traduzido. */
export function authErrorMessage(
  e: Partial<ApiError> | undefined,
  t: TFunction<"auth">,
  flow: "login" | "register"
): string {
  if (e?.status === 401 && flow === "login") return t("errors.invalidCredentials");
  if (e?.status === 409) return t("errors.emailTaken");
  if (e?.status === 400 || e?.code === "VALIDATION_ERROR") {
    return t(flow === "register" ? "errors.invalidRegister" : "errors.invalidLogin");
  }
  // 5xx e rede já chegam traduzidos pelo client.
  return e?.message || t(`${flow}.errorFallback`);
}

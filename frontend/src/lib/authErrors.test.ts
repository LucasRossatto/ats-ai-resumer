import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrors";

// t de mentira: devolve a chave, para checar qual mensagem foi escolhida.
const t = ((k: string) => k) as never;

describe("authErrorMessage", () => {
  it.each([
    [{ status: 401 }, "login", "errors.invalidCredentials"],
    [{ status: 409 }, "register", "errors.emailTaken"],
    [{ status: 400 }, "register", "errors.invalidRegister"],
    [{ code: "VALIDATION_ERROR" }, "login", "errors.invalidLogin"],
    [{ status: 503, message: "Servidor indisponível" }, "login", "Servidor indisponível"],
    [undefined, "register", "register.errorFallback"],
  ] as const)("%j em %s", (err, flow, expected) => {
    expect(authErrorMessage(err, t, flow)).toBe(expected);
  });
});

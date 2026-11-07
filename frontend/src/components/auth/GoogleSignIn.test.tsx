import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import { GoogleSignIn } from "./GoogleSignIn";

describe("GoogleSignIn", () => {
  it("is a link to the backend Google entry point, not a button that fetches", () => {
    render(<GoogleSignIn />);
    const link = screen.getByRole("link", { name: "Continue with Google" });
    expect(link).toHaveAttribute("href", "/api/v1/auth/google");
  });

  it("is translated", async () => {
    await i18n.changeLanguage("pt-BR");
    render(<GoogleSignIn />);
    expect(screen.getByRole("link", { name: "Continuar com o Google" })).toBeInTheDocument();
    expect(screen.getByText("ou")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ErrorScreen } from "./ErrorScreen";

// @testing-library/react only registers its automatic between-test cleanup
// when the test runner exposes globals (`globals: true`). This project runs
// vitest without them — deliberately, since the existing calculation tests
// import describe/it/expect explicitly — so each rendered tree has to be
// torn down here. Without this, `screen` keeps querying the previous
// test's DOM and assertions about absent elements silently pass or fail
// for the wrong reason.
afterEach(cleanup);

describe("ErrorScreen", () => {
  it("shows the recovery actions and calls retry when tapped", () => {
    const retry = vi.fn();
    render(<ErrorScreen onRetry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Volver a Hoy" })).toHaveAttribute("href", "/");
  });

  it("shows the digest so a failure can be matched against server logs", () => {
    render(<ErrorScreen digest="abc123" />);
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
  });

  it("never renders the raw error message", () => {
    // Regression guard for the rule this component exists to enforce:
    // production error text can carry internal detail, so the fallback UI
    // only ever shows our own copy plus the digest.
    render(<ErrorScreen digest="abc123" />);
    expect(screen.queryByText(/at Object\.|stack|SUPABASE|postgres/i)).not.toBeInTheDocument();
  });

  it("lets a flow override the copy and the escape hatch", () => {
    render(
      <ErrorScreen
        title="No hemos podido completar el registro"
        description="Puedes reintentarlo."
        secondaryHref="/registrar/manual"
        secondaryLabel="Registrar a mano"
      />,
    );
    expect(screen.getByRole("heading", { name: "No hemos podido completar el registro" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrar a mano" })).toHaveAttribute(
      "href",
      "/registrar/manual",
    );
  });

  it("hides the retry button when the boundary cannot offer a retry", () => {
    render(<ErrorScreen />);
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });
});

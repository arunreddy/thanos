import { render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./index";
import { vi, describe, beforeEach, it, expect } from "vitest";

describe("ThemeProvider", () => {
  const TestComponent = () => {
    const { theme } = useTheme();
    return (
      <div>
        <p data-testid="current-theme">{theme}</p>
      </div>
    );
  };

  beforeEach(() => {
    document.documentElement.className = "";
  });

  it("always uses dark theme", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.className).toBe("dark");
  });

  it("throws an error when useTheme is used outside ThemeProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      const InvalidComponent = () => {
        useTheme();
        return <div />;
      };
      render(<InvalidComponent />);
    }).toThrowError("useTheme must be used within a ThemeProvider");

    consoleError.mockRestore();
  });
});

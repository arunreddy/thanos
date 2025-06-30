import { render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./index";
import userEvent from "@testing-library/user-event";
import { vi, describe, beforeEach, it, beforeAll, afterAll, expect } from "vitest";

describe("ThemeProvider", () => {
  const TestComponent = () => {
    const { theme, setTheme } = useTheme();
    return (
      <div>
        <p data-testid="current-theme">{theme}</p>
        <button onClick={() => setTheme("light")}>Set Light Theme</button>
        <button onClick={() => setTheme("dark")}>Set Dark Theme</button>
      </div>
    );
  };

  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeAll(() => {
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
    });
  });

  afterAll(() => {
    delete (global as any).localStorage;
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("initializes with the saved theme from localStorage", () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.className).toBe("dark");
  });

  it("defaults to 'system' theme if no saved theme exists", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("system");
    expect(document.documentElement.className).toBe("system");
  });

  it("updates the theme and saves it to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByText("Set Light Theme"));
    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.className).toBe("light");

    await user.click(screen.getByText("Set Dark Theme"));
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.className).toBe("dark");
  });

  it("throws an error when useTheme is used outside ThemeProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const InvalidComponent = () => {
      expect(() => useTheme()).toThrowError(
        "useTheme must be used within a ThemeProvider"
      );
      return <div />;
    };

    render(<InvalidComponent />);

    consoleError.mockRestore();
  });
});

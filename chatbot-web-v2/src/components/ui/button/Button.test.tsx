import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";
import "@testing-library/jest-dom";
import Button from ".";

describe("Button Component", () => {
  test("renders the button with the correct label", () => {
    render(<Button label="Click me" />);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  test("calls the onClick function when clicked", () => {
    const handleClick = vi.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("applies primary variant classes by default", () => {
    render(<Button label="Default" />);
    const button = screen.getByText("Default");
    expect(button).toHaveClass(
      "bg-primary",
      "text-foreground",
      "hover:bg-primary/90"
    );
  });

  test.each([
    ["muted", "bg-muted hover:bg-muted/80 text-muted-foreground"],
    ["primary", "bg-primary text-foreground hover:bg-primary/90"],
    ["secondary", "bg-secondary text-secondary-foreground hover:bg-secondary/80"],
    ["outline", "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"],
    ["ghost", "hover:bg-accent hover:text-accent-foreground"]
  ])('applies correct classes for %s variant', (variant, expectedClass) => {
    render(<Button label="Test" variant={variant as any} />);
    const button = screen.getByText("Test");
    expect(button).toHaveClass(expectedClass);
  });

  test("applies additional className when provided", () => {
    render(<Button label="Custom" className="custom-class" />);
    expect(screen.getByText("Custom")).toHaveClass("custom-class");
  });

  test("renders icon when provided", () => {
    const TestIcon = () => <span data-testid="test-icon">🔍</span>;
    render(<Button label="With Icon" icon={<TestIcon />} />);
    
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    expect(screen.getByTestId("test-icon").parentElement).toHaveClass("mr-2");
  });

  test("applies base classes to all variants", () => {
    render(<Button label="Base" />);
    const button = screen.getByText("Base");
    
    expect(button).toHaveClass(
      "inline-flex",
      "items-center",
      "cursor-pointer",
      "justify-center",
      "rounded-md",
      "font-medium",
      "transition-colors",
      "focus-visible:outline-none",
      "focus-visible:ring-1",
      "focus-visible:ring-ring",
      "disabled:pointer-events-none",
      "disabled:opacity-50",
      "h-9",
      "px-4",
      "py-2"
    );
  });
});

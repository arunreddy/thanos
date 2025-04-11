import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import ChatMessage from "./ChatMessage";

describe("ChatMessage Component", () => {
  const mockOnButtonClick = vi.fn();
  const mockTimestamp = "2025-04-04T14:30:00Z";

  beforeEach(() => {
    mockOnButtonClick.mockClear();
  });

  test("renders user message correctly", () => {
    render(
      <ChatMessage
        role="user"
        content="Hello world"
        timestamp={mockTimestamp}
      />
    );

    const message = screen.getByText("Hello world");
    expect(message).toBeInTheDocument();
    expect(message.parentElement).toHaveClass("bg-secondary", "text-secondary-foreground");
    expect(screen.getByText("2:30 PM")).toBeInTheDocument();
  });

  test("renders assistant message correctly", () => {
    render(
      <ChatMessage
        role="assistant"
        content="How can I help you?"
        timestamp={mockTimestamp}
      />
    );

    const message = screen.getByText("How can I help you?");
    expect(message).toBeInTheDocument();
    expect(message.parentElement).toHaveClass("bg-background", "border-border");
    expect(screen.getByText("2:30 PM")).toBeInTheDocument();
  });

  test("renders buttons when provided", () => {
    const buttons = [
      { title: "Option 1", payload: "payload1" },
      { title: "Option 2", payload: "payload2" },
    ];

    render(
      <ChatMessage
        role="assistant"
        content="Please choose an option:"
        buttons={buttons}
        onButtonClick={mockOnButtonClick}
      />
    );

    const buttonElements = screen.getAllByRole("button");
    expect(buttonElements).toHaveLength(2);
    expect(buttonElements[0]).toHaveTextContent("Option 1");
    expect(buttonElements[1]).toHaveTextContent("Option 2");
  });

  test("calls onButtonClick with correct payload", () => {
    const buttons = [{ title: "Option 1", payload: "payload1" }];

    render(
      <ChatMessage
        role="assistant"
        content="Please choose:"
        buttons={buttons}
        onButtonClick={mockOnButtonClick}
      />
    );

    // Use a function matcher to find the button with Option 1 text
    const optionButton = screen.getByRole('button', { name: /Option 1/i });
    fireEvent.click(optionButton);
    expect(mockOnButtonClick).toHaveBeenCalledWith("payload1");
  });

  test("handles messages without timestamp", () => {
    render(<ChatMessage role="user" content="Hello" />);

    expect(screen.queryByText(/\d+:\d+ [AP]M/)).not.toBeInTheDocument();
  });

  test("preserves whitespace in content", () => {
    const multilineContent = `Line 1\nLine 2\n  Indented line`;
    render(
      <ChatMessage
        role="user"
        content={multilineContent}
        timestamp="2023-01-01T00:00:00Z"
      />
    );

    const messageContainer = screen.getByText((content) => content.includes("Line 1"));
    expect(messageContainer.textContent?.trim()).toBe(multilineContent);
    expect(messageContainer).toHaveClass("whitespace-pre-wrap");
  });
});

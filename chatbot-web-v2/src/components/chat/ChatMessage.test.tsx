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
    expect(message.parentElement).toHaveClass("bg-blue-500", "text-white");
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
    expect(message.parentElement).toHaveClass("bg-white", "border-gray-200");
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

    fireEvent.click(screen.getByText("Option 1"));
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

    const message = screen.getByText((content, element) => {
      return element?.textContent === multilineContent;
    });
    expect(message).toHaveClass("whitespace-pre-wrap");
  });
});

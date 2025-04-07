import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import ChatContent from "./index";

// Mock the API functions
vi.mock("../../../lib/api", () => ({
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
}));

// Mock child components
vi.mock("../ChatMessage", () => ({
  default: ({ role, content, buttons, onButtonClick }: any) => (
    <div data-testid="chat-message" data-role={role}>
      <div>{content}</div>
      {buttons?.map((btn: any, i: number) => (
        <button key={i} onClick={() => onButtonClick(btn.payload)}>
          {btn.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../ChatInput", () => ({
  default: ({ onSendMessage, isLoading }: any) => (
    <div data-testid="chat-input">
      <input
        type="text"
        data-testid="message-input"
        disabled={isLoading}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSendMessage((e.target as HTMLInputElement).value);
          }
        }}
      />
    </div>
  ),
}));

vi.mock("../topnav", () => ({
  default: ({ title }: any) => <div data-testid="top-nav">{title}</div>,
}));

import { getConversation, sendMessage } from "../../../lib/api";

describe("ChatContent Component", () => {
  const mockSetActiveChatId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getConversation as any).mockReset();
    (sendMessage as any).mockReset();
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders empty state for new chat", () => {
    render(<ChatContent chatId={null} setActiveChatId={mockSetActiveChatId} />);

    expect(screen.getByText("Start a new conversation")).toBeInTheDocument();
    expect(screen.getByTestId("top-nav")).toHaveTextContent("New Chat");
  });

  test("loads existing conversation", async () => {
    const mockMessages = [
      { role: "user", content: "Hello", created_at: "2025-04-04T14:30:00Z" },
      {
        role: "assistant",
        content: "Hi there!",
        created_at: "2025-04-04T14:31:00Z",
      },
    ];

    (getConversation as any).mockResolvedValueOnce({
      messages: mockMessages,
    });

    render(<ChatContent chatId="123" setActiveChatId={mockSetActiveChatId} />);

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(2);
      expect(messages[0]).toHaveTextContent("Hello");
      expect(messages[1]).toHaveTextContent("Hi there!");
    });
  });

  test("handles send message for new conversation", async () => {
    const mockResponse = {
      conversation_id: "456",
      message: {
        role: "assistant",
        content: "Hello! How can I help?",
      },
    };

    (sendMessage as any).mockResolvedValueOnce(mockResponse);

    render(<ChatContent chatId={null} setActiveChatId={mockSetActiveChatId} />);

    const input = screen.getByTestId("message-input");
    fireEvent.keyDown(input, { key: "Enter", target: { value: "Hi there" } });

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(2);
      expect(messages[0]).toHaveAttribute("data-role", "user");
      expect(messages[1]).toHaveAttribute("data-role", "assistant");
    });

    expect(mockSetActiveChatId).toHaveBeenCalledWith("456");
  });

  test("handles send message for existing conversation", async () => {
    const mockResponse = {
      message: {
        role: "assistant",
        content: "I understand",
      },
    };

    (sendMessage as any).mockResolvedValueOnce(mockResponse);

    render(<ChatContent chatId="123" setActiveChatId={mockSetActiveChatId} />);

    const input = screen.getByTestId("message-input");
    fireEvent.keyDown(input, { key: "Enter", target: { value: "Hello" } });

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(2);
    });

    expect(mockSetActiveChatId).not.toHaveBeenCalled();
  });

  test("handles API errors gracefully", async () => {
    (getConversation as any).mockRejectedValueOnce(new Error("API Error"));

    render(<ChatContent chatId="123" setActiveChatId={mockSetActiveChatId} />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load conversation")
      ).toBeInTheDocument();
    });
  });

  test("handles message send errors gracefully", async () => {
    (sendMessage as any).mockRejectedValueOnce(new Error("API Error"));

    render(<ChatContent chatId="123" setActiveChatId={mockSetActiveChatId} />);

    const input = screen.getByTestId("message-input");
    fireEvent.keyDown(input, { key: "Enter", target: { value: "Hello" } });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to send message. Please try again.")
      ).toBeInTheDocument();
    });
  });

  test("handles button clicks in messages", async () => {
    const mockResponse = {
      message: {
        role: "assistant",
        content: "Choose an option:",
        buttons: [{ title: "Option 1", payload: "/option1" }],
      },
    };

    (sendMessage as any).mockResolvedValueOnce(mockResponse);
    (sendMessage as any).mockResolvedValueOnce({
      message: {
        role: "assistant",
        content: "You chose option 1",
      },
    });

    render(<ChatContent chatId="123" setActiveChatId={mockSetActiveChatId} />);

    const input = screen.getByTestId("message-input");
    fireEvent.keyDown(input, {
      key: "Enter",
      target: { value: "Show options" },
    });

    await waitFor(() => {
      const button = screen.getByText("Option 1");
      fireEvent.click(button);
    });

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages[messages.length - 1]).toHaveTextContent(
        "You chose option 1"
      );
    });
  });
});

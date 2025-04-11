import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
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

  test("renders welcome message for new chat", () => {
    render(
      <ChatContent
        chatId={null}
        setActiveChatId={mockSetActiveChatId}
        isNewChat={true}
      />
    );

    expect(
      screen.getByText(/Welcome to the Database Management Assistant/)
    ).toBeInTheDocument();
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

    render(
      <ChatContent
        chatId="123"
        setActiveChatId={mockSetActiveChatId}
        isNewChat={false}
      />
    );

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      // Account for welcome message + user message + assistant message
      expect(messages).toHaveLength(3);
      // Welcome message is at index 0, user message at index 1, assistant at index 2
      expect(messages[1]).toHaveTextContent("Hello");
      expect(messages[2]).toHaveTextContent("Hi there!");
    });
  });

  test("handles empty messages array in response", async () => {
    // Mock an empty response (no messages array)
    (getConversation as any).mockResolvedValueOnce({
      // Empty object with no messages array
    });

    render(
      <ChatContent
        chatId="123"
        setActiveChatId={mockSetActiveChatId}
        isNewChat={false}
      />
    );

    // Since there are no messages in the response, the component should still add the welcome message
    await waitFor(() => {
      // Check for the top nav with the conversation ID
      expect(screen.getByTestId("top-nav")).toHaveTextContent(
        "123 Conversation"
      );

      // Verify that the chat input is rendered
      expect(screen.getByTestId("chat-input")).toBeInTheDocument();

      // The welcome message should be added automatically
      const messages = screen.getAllByTestId("chat-message");
      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages[0]).toHaveAttribute("data-role", "assistant");
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

    render(
      <ChatContent
        chatId={null}
        setActiveChatId={mockSetActiveChatId}
        isNewChat={true}
      />
    );

    const input = screen.getByTestId("message-input");
    fireEvent.keyDown(input, { key: "Enter", target: { value: "Hi there" } });

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      // Account for welcome message + user message + assistant message
      expect(messages).toHaveLength(3);
      // Welcome message is at index 0
      expect(messages[1]).toHaveAttribute("data-role", "user"); // User message
      expect(messages[2]).toHaveAttribute("data-role", "assistant"); // Bot response
    });

    expect(mockSetActiveChatId).toHaveBeenCalledWith("456", true);
  });

  test("does not send empty or whitespace-only messages", async () => {
    // Mock an existing conversation with welcome message already present
    const mockMessages = [
      {
        role: "assistant",
        content: "Welcome to the Database Management Assistant! 👋",
        created_at: "2025-04-04T14:29:00Z",
      },
    ];

    (getConversation as any).mockResolvedValueOnce({
      messages: mockMessages,
    });

    render(
      <ChatContent
        chatId="123"
        setActiveChatId={mockSetActiveChatId}
        isNewChat={false}
      />
    );

    // Wait for the conversation to load
    await waitFor(() => {
      expect(
        screen.getByText(/Welcome to the Database Management Assistant/)
      ).toBeInTheDocument();
    });

    const input = screen.getByTestId("message-input");

    // Empty message
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", target: { value: "" } });
    });
    expect(sendMessage).not.toHaveBeenCalled();

    // Whitespace-only message
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", target: { value: "   " } });
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  test("handles send message for existing conversation", async () => {
    // Mock an existing conversation with welcome message already present
    const mockMessages = [
      {
        role: "assistant",
        content: "Welcome to the Database Management Assistant! 👋",
        created_at: "2025-04-04T14:29:00Z",
      },
    ];

    (getConversation as any).mockResolvedValueOnce({
      messages: mockMessages,
    });

    const mockResponse = {
      message: {
        role: "assistant",
        content: "I understand",
      },
    };

    (sendMessage as any).mockResolvedValueOnce(mockResponse);

    render(
      <ChatContent
        chatId="123"
        setActiveChatId={mockSetActiveChatId}
        isNewChat={false}
      />
    );

    // Wait for the conversation to load
    await waitFor(() => {
      expect(
        screen.getByText(/Welcome to the Database Management Assistant/)
      ).toBeInTheDocument();
    });

    const input = screen.getByTestId("message-input");
    fireEvent.keyDown(input, { key: "Enter", target: { value: "Hello" } });

    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      // Welcome message + user message + assistant message
      expect(messages).toHaveLength(3);
      expect(messages[1]).toHaveAttribute("data-role", "user");
      expect(messages[2]).toHaveAttribute("data-role", "assistant");
      expect(messages[2]).toHaveTextContent("I understand");
    });

    expect(mockSetActiveChatId).not.toHaveBeenCalled();
  });

  test("handles API errors gracefully", async () => {
    (getConversation as any).mockRejectedValueOnce(new Error("API Error"));

    render(
      <ChatContent
        chatId="123"
        setActiveChatId={mockSetActiveChatId}
        isNewChat={false}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load conversation")
      ).toBeInTheDocument();
    });

    // Verify the chat input is still rendered
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
  });

  test("handles message send errors gracefully", async () => {
    // Mock an existing conversation with welcome message already present
    const mockMessages = [
      {
        role: "assistant",
        content: "Welcome to the Database Management Assistant! 👋",
        created_at: "2025-04-04T14:29:00Z",
      },
    ];

    (getConversation as any).mockResolvedValueOnce({
      messages: mockMessages,
    });
    (sendMessage as any).mockRejectedValueOnce(new Error("API Error"));

    render(
      <ChatContent
        chatId="123"
        setActiveChatId={mockSetActiveChatId}
        isNewChat={false}
      />
    );

    // Wait for the conversation to load
    await waitFor(() => {
      expect(
        screen.getByText(/Welcome to the Database Management Assistant/)
      ).toBeInTheDocument();
    });

    const input = screen.getByTestId("message-input");

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", target: { value: "Hello" } });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to send message. Please try again.")
      ).toBeInTheDocument();
    });
  });

  test("handles button clicks in messages", async () => {
    // Mock an existing conversation with welcome message already present
    const mockMessages = [
      {
        role: "assistant",
        content: "Welcome to the Database Management Assistant! 👋",
        created_at: "2025-04-04T14:29:00Z",
      },
    ];

    (getConversation as any).mockResolvedValueOnce({
      messages: mockMessages,
    });

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

    render(
      <ChatContent
        chatId="123"
        setActiveChatId={mockSetActiveChatId}
        isNewChat={false}
      />
    );

    // Wait for the conversation to load
    await waitFor(() => {
      expect(
        screen.getByText(/Welcome to the Database Management Assistant/)
      ).toBeInTheDocument();
    });

    const input = screen.getByTestId("message-input");

    await act(async () => {
      fireEvent.keyDown(input, {
        key: "Enter",
        target: { value: "Show options" },
      });
    });

    // Wait for the button to appear
    let button;
    await waitFor(() => {
      button = screen.getByText("Option 1");
      expect(button).toBeInTheDocument();
    });

    // Click the button
    await act(async () => {
      fireEvent.click(button!);
    });

    // Verify the response
    await waitFor(() => {
      const messages = screen.getAllByTestId("chat-message");
      expect(messages[messages.length - 1]).toHaveTextContent(
        "You chose option 1"
      );
    });
  });
});

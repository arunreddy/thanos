import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import SideNav from "./index";

// Mock the API functions
vi.mock("../../../lib/api", () => ({
  getConversations: vi.fn(),
  deleteConversation: vi.fn(),
}));

// Mock the Button component
vi.mock("../../ui/button", () => ({
  default: ({ label, onClick, children, "data-testid": testId }: any) => (
    <button onClick={onClick} data-testid={testId || "new-chat-button"}>
      {children || label}
    </button>
  ),
}));

// Mock the Dialog components
vi.mock("../../ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? children : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

import { getConversations, deleteConversation } from "../../../lib/api";

describe("SideNav Component", () => {
  const mockOnSelectChat = vi.fn();
  const mockOnNewChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getConversations as any).mockReset();
    (deleteConversation as any).mockReset();
  });

  test("renders loading state initially", async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (getConversations as any).mockReturnValue(promise);

    render(
      <SideNav
        activeChatId={null}
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );

    // Verify loading state
    expect(screen.getByText("Loading conversations...")).toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner")).toHaveClass("animate-spin");
    
    // Resolve the promise to finish loading
    resolvePromise!([]);
    await act(async () => {
      await promise;
    });
  });

  test("renders empty state when no conversations", async () => {
    (getConversations as any).mockResolvedValueOnce([]);

    render(
      <SideNav
        activeChatId={null}
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );

    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });

    await waitFor(() => {
      expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    });
  });

  test("renders list of conversations", async () => {
    const mockChats = [
      { id: "1", title: "Chat 1" },
      { id: "2", title: "Chat 2" },
    ];

    (getConversations as any).mockResolvedValueOnce(mockChats);

    render(
      <SideNav
        activeChatId="1"
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );

    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });

    await waitFor(() => {
      expect(screen.getByText("Chat 1")).toBeInTheDocument();
      expect(screen.getByText("Chat 2")).toBeInTheDocument();
    });

    // Check active chat styling
    const activeChat = screen.getByText("Chat 1").parentElement?.parentElement;
    expect(activeChat).toHaveClass("bg-primary/15");
  });

  test("handles chat selection", async () => {
    const mockChats = [{ id: "1", title: "Chat 1" }];

    (getConversations as any).mockResolvedValueOnce(mockChats);

    render(
      <SideNav
        activeChatId={null}
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );

    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });

    await waitFor(() => {
      const chatItem = screen.getByText("Chat 1").parentElement?.parentElement;
      fireEvent.click(chatItem!);
    });

    expect(mockOnSelectChat).toHaveBeenCalledWith("1");
  });

  test("handles chat deletion", async () => {
    const mockChats = [{ id: "1", title: "Chat 1" }];

    (getConversations as any).mockResolvedValueOnce(mockChats);
    (deleteConversation as any).mockResolvedValueOnce({});

    render(
      <SideNav
        activeChatId="1"
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );

    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });

    // Click delete button and wait for dialog
    const deleteButton = await screen.findByLabelText("Delete conversation");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Find and click confirm button
    const confirmButton = await screen.findByTestId("confirm-delete-button");
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(deleteConversation).toHaveBeenCalledWith("1");
    expect(mockOnNewChat).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByText("Chat 1")).not.toBeInTheDocument();
    });
  });

  test("handles API error gracefully", async () => {
    const mockError = new Error("API Error");
    let rejectPromise: (error: Error) => void;
    const promise = new Promise((_, reject) => {
      rejectPromise = reject;
    });
    (getConversations as any).mockReturnValue(promise);

    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SideNav
        activeChatId={null}
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );

    // First verify loading state
    await screen.findByText("Loading conversations...");
    const loadingSpinner = screen.getByTestId("loading-spinner");
    expect(loadingSpinner).toHaveClass("animate-spin");

    // Reject the promise to trigger error state
    await act(async () => {
      rejectPromise!(mockError);
    });

    try {
      // Wait for error to appear
      await waitFor(() => {
        expect(
          screen.getByText("Failed to load conversations", { exact: true })
        ).toBeInTheDocument();
      });

      // Verify the API was called and error was logged
      expect(getConversations).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    } finally {
      // Clean up console spy
      consoleSpy.mockRestore();
    }
  });

  test("handles delete error gracefully", async () => {
    const mockChats = [{ id: "1", title: "Chat 1" }];

    (getConversations as any).mockResolvedValueOnce(mockChats);
    (deleteConversation as any).mockRejectedValueOnce(
      new Error("Delete Error")
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SideNav
        activeChatId="1"
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );

    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });

    // Click delete button and wait for dialog
    const deleteButton = await screen.findByLabelText("Delete conversation");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Find and click confirm button
    const confirmButton = await screen.findByTestId("confirm-delete-button");
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete chat:",
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });
});

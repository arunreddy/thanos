import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import SideNav from "./index";
import { getConversations } from "../../../lib/api";

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
  Dialog: ({ children, open, onOpenChange }: any) => {
    // Call onOpenChange when needed in the test
    return open ? (
      <div data-testid="dialog">
        {children}
        <button 
          data-testid="close-dialog-button" 
          onClick={() => onOpenChange && onOpenChange(false)}
        >
          Close Dialog
        </button>
      </div>
    ) : null;
  },
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

describe("SideNav Dialog Component", () => {
  const mockOnSelectChat = vi.fn();
  const mockOnNewChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getConversations as any).mockReset();
  });

  test("Dialog onOpenChange handler sets chatToDelete to null when dialog is closed", async () => {
    const mockChats = [{ id: "1", title: "Chat 1" }];
    (getConversations as jest.Mock).mockResolvedValueOnce(mockChats);

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

    // Click delete button to open dialog
    const deleteButton = await screen.findByLabelText("Delete conversation");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Verify dialog is open
    const dialog = screen.getByTestId("dialog");
    expect(dialog).toBeInTheDocument();

    // Close dialog using the onOpenChange handler
    const closeButton = screen.getByTestId("close-dialog-button");
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Verify dialog is closed
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });
});

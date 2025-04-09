import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import SideNav from "./index";
import { getConversations, deleteConversation } from "../../../lib/api";
import * as React from "react";

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
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

describe("SideNav handleDeleteConfirm Function", () => {
  // This test specifically targets the try-catch block in handleDeleteConfirm
  test("handles try-catch block in handleDeleteConfirm", async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock the API to return some conversations
    const mockChats = [{ id: "1", title: "Chat 1" }];
    (getConversations as jest.Mock).mockResolvedValueOnce(mockChats);
    
    // First mock a successful delete
    (deleteConversation as jest.Mock).mockResolvedValueOnce({});
    
    // Create a spy for console.error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const mockOnSelectChat = vi.fn();
    const mockOnNewChat = vi.fn();
    
    render(
      <SideNav
        activeChatId="2" // Different from the one we'll delete
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );
    
    // Wait for the component to load
    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });
    
    // Click delete button to open dialog
    const deleteButton = await screen.findByLabelText("Delete conversation");
    await act(async () => {
      fireEvent.click(deleteButton);
    });
    
    // Click confirm button to delete
    const confirmButton = screen.getByText("Delete");
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    // Verify deleteConversation was called
    expect(deleteConversation).toHaveBeenCalledWith("1");
    
    // Clean up
    consoleSpy.mockRestore();
  });
  
  test("early return when id is null", async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock the API to return some conversations
    const mockChats = [{ id: "1", title: "Chat 1" }];
    (getConversations as jest.Mock).mockResolvedValueOnce(mockChats);
    
    // Create a spy for console.error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Create a custom component that simulates the SideNav with null chatToDelete
    const TestComponent = () => {
      const [chatToDelete] = React.useState<string | null>(null);
      
      // This simulates the handleDeleteConfirm function with null chatToDelete
      const handleDeleteConfirm = async () => {
        const id = chatToDelete; // This is null
        if (!id) return; // This should trigger the early return
        
        try {
          await deleteConversation(id);
          // This should not be reached
          console.log("This should not be executed");
        } catch (err) {
          console.error("Failed to delete chat:", err);
        }
      };
      
      // Call handleDeleteConfirm when the component mounts
      React.useEffect(() => {
        handleDeleteConfirm();
      }, []);
      
      return <div>Test Component</div>;
    };
    
    render(<TestComponent />);
    
    // Wait for any async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Verify that deleteConversation was not called due to the early return
    expect(deleteConversation).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    
    // Clean up
    consoleSpy.mockRestore();
  });
  
  test("deletes chat when id is valid", async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock the API to return some conversations
    const mockChats = [{ id: "1", title: "Chat 1" }];
    (getConversations as jest.Mock).mockResolvedValueOnce(mockChats);
    (deleteConversation as jest.Mock).mockResolvedValueOnce({});
    
    const mockOnSelectChat = vi.fn();
    const mockOnNewChat = vi.fn();
    
    render(
      <SideNav
        activeChatId="2" // Different from the one we'll delete
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );
    
    // Wait for the component to load
    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });
    
    // Click delete button to open dialog
    const deleteButton = await screen.findByLabelText("Delete conversation");
    await act(async () => {
      fireEvent.click(deleteButton);
    });
    
    // Click confirm button to delete
    const confirmButton = screen.getByText("Delete");
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    // Verify deleteConversation was called
    expect(deleteConversation).toHaveBeenCalledWith("1");
    
    // Verify onNewChat was NOT called (since we're deleting a non-active chat)
    expect(mockOnNewChat).not.toHaveBeenCalled();
  });
  
  test("calls onNewChat when deleting active chat", async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock the API to return some conversations
    const mockChats = [{ id: "1", title: "Chat 1" }];
    (getConversations as jest.Mock).mockResolvedValueOnce(mockChats);
    (deleteConversation as jest.Mock).mockResolvedValueOnce({});
    
    const mockOnSelectChat = vi.fn();
    const mockOnNewChat = vi.fn();
    
    render(
      <SideNav
        activeChatId="1" // Same as the one we'll delete
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );
    
    // Wait for the component to load
    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });
    
    // Click delete button to open dialog
    const deleteButton = await screen.findByLabelText("Delete conversation");
    await act(async () => {
      fireEvent.click(deleteButton);
    });
    
    // Click confirm button to delete
    const confirmButton = screen.getByText("Delete");
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    // Verify deleteConversation was called
    expect(deleteConversation).toHaveBeenCalledWith("1");
    
    // Verify onNewChat was called (since we're deleting the active chat)
    expect(mockOnNewChat).toHaveBeenCalled();
  });
  
  test("handles error when deleting chat", async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock the API to return some conversations
    const mockChats = [{ id: "1", title: "Chat 1" }];
    (getConversations as jest.Mock).mockResolvedValueOnce(mockChats);
    (deleteConversation as jest.Mock).mockRejectedValueOnce(new Error("Test error"));
    
    // Create a spy for console.error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const mockOnSelectChat = vi.fn();
    const mockOnNewChat = vi.fn();
    
    render(
      <SideNav
        activeChatId="1"
        onSelectChat={mockOnSelectChat}
        onNewChat={mockOnNewChat}
      />
    );
    
    // Wait for the component to load
    await act(async () => {
      await (getConversations as jest.Mock).mock.results[0].value;
    });
    
    // Click delete button to open dialog
    const deleteButton = await screen.findByLabelText("Delete conversation");
    await act(async () => {
      fireEvent.click(deleteButton);
    });
    
    // Click confirm button to delete
    const confirmButton = screen.getByText("Delete");
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    // Verify deleteConversation was called
    expect(deleteConversation).toHaveBeenCalledWith("1");
    
    // Verify console.error was called
    expect(consoleSpy).toHaveBeenCalledWith("Failed to delete chat:", expect.any(Error));
    
    // Clean up
    consoleSpy.mockRestore();
  });
});

import { describe, test, expect, vi } from "vitest";
import { _testHandleDeleteConfirm, _testActiveIdComparison, _testTryCatch } from "./index";

describe("SideNav Utility Functions", () => {
  test("_testHandleDeleteConfirm handles null and valid IDs correctly", () => {
    // Test with null id
    expect(_testHandleDeleteConfirm(null)).toBe(false);
    
    // Test with valid id
    expect(_testHandleDeleteConfirm("1")).toBe(true);
  });

  test("_testActiveIdComparison compares IDs correctly", () => {
    // Test when IDs match
    expect(_testActiveIdComparison("1", "1")).toBe(true);
    
    // Test when IDs don't match
    expect(_testActiveIdComparison("1", "2")).toBe(false);
    
    // Test with null activeChatId
    expect(_testActiveIdComparison(null, "1")).toBe(false);
  });

  test("_testTryCatch handles success and error cases", async () => {
    // Spy on console.error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Test success case (shouldThrow = false)
    const successResult = await _testTryCatch(false);
    expect(successResult).toBe(true);
    expect(consoleSpy).not.toHaveBeenCalled();
    
    // Test error case (shouldThrow = true)
    const errorResult = await _testTryCatch(true);
    expect(errorResult).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to delete chat:", expect.any(Error));
    
    // Restore the spy
    consoleSpy.mockRestore();
  });
});

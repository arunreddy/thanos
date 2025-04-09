import { describe, test, expect, vi } from "vitest";
import {
  _checkIdExists,
  _testHandleDeleteConfirm,
  _testActiveIdComparison,
  _testTryCatch,
} from "./test-helpers";

describe("Test Helpers", () => {
  test("_checkIdExists handles null and non-null values", () => {
    // Test with null (should return false)
    expect(_checkIdExists(null)).toBe(false);
    
    // Test with valid id (should return true)
    expect(_checkIdExists("1")).toBe(true);
  });
  
  test("_testHandleDeleteConfirm handles null, empty, and valid values", () => {
    // Test with null (should return false)
    expect(_testHandleDeleteConfirm(null)).toBe(false);
    
    // Test with empty string (should return false)
    expect(_testHandleDeleteConfirm("")).toBe(false);
    
    // Test with valid id (should return true)
    expect(_testHandleDeleteConfirm("1")).toBe(true);
  });
  
  test("_testActiveIdComparison correctly compares IDs", () => {
    // Test when activeChatId matches id (should return true)
    expect(_testActiveIdComparison("1", "1")).toBe(true);
    
    // Test when activeChatId is different (should return false)
    expect(_testActiveIdComparison("2", "1")).toBe(false);
    
    // Test when activeChatId is null (should return false)
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

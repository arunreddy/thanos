// Helper functions for testing purposes
export const _checkIdExists = (id: string | null): boolean => {
  return id !== null;
};

// Previously exported functions that were moved here
export const _testHandleDeleteConfirm = (id: string | null): boolean => {
  if (!id) return false;
  return true;
};

export const _testActiveIdComparison = (activeChatId: string | null, id: string): boolean => {
  if (activeChatId === id) return true;
  return false;
};

export const _testTryCatch = async (shouldThrow: boolean): Promise<boolean> => {
  try {
    if (shouldThrow) {
      throw new Error("Test error");
    }
    return true;
  } catch (err) {
    console.error("Failed to delete chat:", err);
    return false;
  }
};

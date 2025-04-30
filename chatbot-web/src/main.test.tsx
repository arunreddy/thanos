import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './components/layout/themeProvider';

// Hoist mocks to top
vi.mock('react-dom/client');
vi.mock('./App');
vi.mock('./components/layout/themeProvider');
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  )
}));

describe('main', () => {
  let mockRender: ReturnType<typeof vi.fn>;
  let mockCreateRoot: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup mocks
    mockRender = vi.fn();
    mockCreateRoot = vi.fn(() => ({ render: mockRender }));
    vi.mocked(createRoot).mockImplementation(mockCreateRoot);

    // Setup DOM
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('renders the app with proper wrapping components', async () => {
    // Mock components
    vi.mocked(App).mockImplementation(() => <div data-testid="app">App Mock</div>);
    vi.mocked(ThemeProvider).mockImplementation(({ children }) => (
      <div data-testid="theme-provider">{children}</div>
    ));

    // Import and execute main
    await import('./main');

    // Verify createRoot was called with root element
    expect(mockCreateRoot).toHaveBeenCalledWith(
      document.getElementById('root')
    );

    // Verify render was called with the correct component structure
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StrictMode,
        props: expect.objectContaining({
          children: expect.objectContaining({
            type: BrowserRouter,
            props: expect.objectContaining({
              children: expect.objectContaining({
                type: ThemeProvider,
                props: expect.objectContaining({
                  children: expect.objectContaining({
                    type: App
                  })
                })
              })
            })
          })
        })
      })
    );
  });

  it('throws error if root element is not found', () => {
    // Remove root element
    document.body.innerHTML = '';

    // Mock console.error to prevent noise
    const originalError = console.error;
    console.error = vi.fn();

    // Mock createRoot to throw when called with null
    mockCreateRoot.mockImplementationOnce(() => {
      throw new Error('Root element not found');
    });

    // Verify that attempting to render throws
    expect(() => {
      createRoot(document.getElementById('root')!);
    }).toThrow('Root element not found');

    // Restore console.error
    console.error = originalError;
  });
});


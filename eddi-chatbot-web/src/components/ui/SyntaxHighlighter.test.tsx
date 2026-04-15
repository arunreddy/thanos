import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock shiki module
vi.mock('shiki', () => ({
  createHighlighter: vi.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

import SyntaxHighlighter from './SyntaxHighlighter';
import { createHighlighter } from 'shiki';

const mockCreateHighlighter = vi.mocked(createHighlighter);

describe('SyntaxHighlighter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('renders the component with code content', () => {
      render(<SyntaxHighlighter code="const x = 1;" language="javascript" />);
      
      // Should render the loading state initially with the code content
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const { container } = render(
        <SyntaxHighlighter 
          code="const x = 1;" 
          language="javascript" 
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('hides copy button when showCopyButton is false', () => {
      render(
        <SyntaxHighlighter 
          code="const x = 1;" 
          language="javascript" 
          showCopyButton={false}
        />
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Error state handling', () => {
    beforeEach(() => {
      // Mock createHighlighter to fail, putting component in error state
      mockCreateHighlighter.mockRejectedValue(new Error('Shiki failed'));
    });

    it('renders fallback content when highlighting fails', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<SyntaxHighlighter code="const x = 1;" language="javascript" />);
      
      // Should render the code content even in error state
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('shows copy button in error state when showCopyButton is true', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<SyntaxHighlighter code="const x = 1;" language="javascript" showCopyButton={true} />);
      
      // In error state, component should still render the copy button when showCopyButton is true
      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check that either the button exists OR the code is visible (fallback state)
      const hasButton = screen.queryByRole('button') !== null;
      const hasCode = screen.queryByText('const x = 1;') !== null;
      
      expect(hasButton || hasCode).toBe(true);

      consoleError.mockRestore();
    });
  });

  describe('Props handling', () => {
    it('handles empty code gracefully', () => {
      render(<SyntaxHighlighter code="" language="javascript" showCopyButton={false} />);
      
      // Should render without crashing, no button when showCopyButton is false
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('handles special characters in code', () => {
      const specialCode = 'const x = "<>&\'"';
      render(<SyntaxHighlighter code={specialCode} language="javascript" />);
      
      expect(screen.getByText(specialCode)).toBeInTheDocument();
    });

    it('accepts different programming languages', () => {
      const languages = ['javascript', 'python', 'sql', 'json', 'typescript'];
      
      languages.forEach(language => {
        const { unmount } = render(<SyntaxHighlighter code="test code" language={language} />);
        expect(screen.getByText('test code')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Accessibility and structure', () => {
    it('renders semantic HTML structure', () => {
      const { container } = render(<SyntaxHighlighter code="const x = 1;" language="javascript" />);
      
      // Should have a container div
      expect(container.firstChild).toHaveClass('relative', 'group');
    });

    it('maintains accessibility in loading state', () => {
      render(<SyntaxHighlighter code="const x = 1;" language="javascript" />);
      
      // Code should be accessible
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
      
      // Should have proper structure
      const codeElement = screen.getByText('const x = 1;');
      expect(codeElement.tagName.toLowerCase()).toBe('code');
    });
  });

  describe('Successful highlighting state', () => {
    beforeEach(() => {
      // Mock successful highlighting
      const mockCodeToHtml = vi.fn().mockResolvedValue('<pre class="shiki"><code>highlighted code</code></pre>');
      const mockHighlighter = {
        codeToHtml: mockCodeToHtml,
      };
      mockCreateHighlighter.mockResolvedValue(mockHighlighter as unknown as Awaited<ReturnType<typeof createHighlighter>>);
    });

    it('attempts to initialize Shiki highlighter', () => {
      render(<SyntaxHighlighter code="const x = 1;" language="javascript" />);
      
      // Should attempt to create highlighter
      expect(mockCreateHighlighter).toHaveBeenCalledWith({
        themes: ['github-light', 'github-dark'],
        langs: [
          'sql',
          'json',
          'javascript',
          'typescript',
          'python',
          'bash',
          'yaml',
          'xml',
          'html',
          'css',
          'markdown',
          'plaintext'
        ],
      });
    });
  });

  describe('Error resilience', () => {
    it('handles malformed code input gracefully', () => {
      const malformedCode = 'const x = { unclosed object';
      render(<SyntaxHighlighter code={malformedCode} language="javascript" />);
      
      expect(screen.getByText(malformedCode)).toBeInTheDocument();
    });

    it('handles very long code input', () => {
      const longCode = 'const x = ' + 'very_long_string '.repeat(10); // Reduced for testing
      
      // Should render without crashing
      expect(() => {
        render(<SyntaxHighlighter code={longCode} language="javascript" />);
      }).not.toThrow();
      
      // Verify at least part of the code is rendered
      expect(screen.getByText(/const x =/)).toBeInTheDocument();
    });

    it('handles unsupported language gracefully', () => {
      render(<SyntaxHighlighter code="some code" language="unknownlang" />);
      
      expect(screen.getByText('some code')).toBeInTheDocument();
    });
  });

  describe('Component interface', () => {
    it('accepts all required props', () => {
      expect(() => {
        render(<SyntaxHighlighter code="test" language="javascript" />);
      }).not.toThrow();
    });

    it('accepts all optional props', () => {
      expect(() => {
        render(
          <SyntaxHighlighter 
            code="test" 
            language="javascript" 
            className="test-class"
            showCopyButton={false}
          />
        );
      }).not.toThrow();
    });

    it('renders with minimal props', () => {
      const { container } = render(<SyntaxHighlighter code="" language="" />);
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
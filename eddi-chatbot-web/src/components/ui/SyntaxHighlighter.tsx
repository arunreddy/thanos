import React, { useEffect, useState } from 'react';
import { createHighlighter, type Highlighter } from 'shiki';
import { Copy, Check } from 'lucide-react';
import { Button } from './button';
import './SyntaxHighlighter.css';

interface SyntaxHighlighterProps {
  code: string;
  language: string;
  className?: string;
  showCopyButton?: boolean;
}

// Cache the highlighter instance
let highlighterInstance: Highlighter | null = null;

const initializeHighlighter = async (): Promise<Highlighter> => {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  highlighterInstance = await createHighlighter({
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

  return highlighterInstance;
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
};

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({
  code,
  language,
  className = '',
  showCopyButton = true,
}) => {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const highlightCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const highlighter = await initializeHighlighter();
        
        // Normalize language name
        const normalizedLang = normalizeLanguage(language);
        
        // Use system theme preference for now - you can enhance this with theme context
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = isDark ? 'github-dark' : 'github-light';
        
        const html = highlighter.codeToHtml(code, {
          lang: normalizedLang,
          theme: theme,
        });
        
        setHighlightedCode(html);
      } catch (err) {
        console.error('Syntax highlighting error:', err);
        setError('Failed to highlight code');
        // Fallback to plain text
        setHighlightedCode(`<pre><code>${escapeHtml(code)}</code></pre>`);
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [code, language]);

  if (isLoading) {
    return (
      <div className={`relative group ${className}`}>
        <pre className="bg-muted p-3 rounded-lg overflow-x-auto border">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative group ${className}`}>
        <pre className="bg-muted p-3 rounded-lg overflow-x-auto border">
          <code>{code}</code>
        </pre>
        {showCopyButton && <CopyButton text={code} />}
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div
        className="shiki-container overflow-x-auto rounded-lg border"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
      {showCopyButton && <CopyButton text={code} />}
    </div>
  );
};

// Helper function to normalize language names to Shiki-supported languages
const normalizeLanguage = (lang: string): string => {
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'sh': 'bash',
    'shell': 'bash',
    'yml': 'yaml',
    'postgres': 'sql',
    'postgresql': 'sql',
    'mysql': 'sql',
    'sqlite': 'sql',
    'tsql': 'sql',
    'plsql': 'sql',
    'text': 'plaintext',
    'txt': 'plaintext',
  };

  const normalized = lang.toLowerCase();
  return langMap[normalized] || normalized;
};

// Helper function to escape HTML
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export default SyntaxHighlighter;
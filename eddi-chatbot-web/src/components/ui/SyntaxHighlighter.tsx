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
    themes: ['github-dark'],
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
        
        const html = highlighter.codeToHtml(code, {
          lang: normalizedLang,
          theme: 'github-dark',
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

  const normalizedLang = normalizeLanguage(language);
  const isSqlBlock = normalizedLang === 'sql';

  return (
    <div className={`relative group ${className}`}>
      {/* Language badge */}
      {language && language !== 'plaintext' && (
        <span
          className="absolute top-2 left-3 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded z-10"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: isSqlBlock ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            color: isSqlBlock ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            letterSpacing: '0.08em',
          }}
        >
          {language.toUpperCase()}
        </span>
      )}
      <div
        className={`shiki-container overflow-x-auto rounded-lg border ${isSqlBlock ? 'sql-dark-block' : ''}`}
        style={isSqlBlock ? { background: '#1E2130', borderColor: '#313447' } : undefined}
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
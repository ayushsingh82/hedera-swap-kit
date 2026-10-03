"use client";

import { useState } from "react";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

type CodeBlockProps = {
  code: string;
  /** Shown in the title bar, for example "app/page.tsx". */
  filename?: string;
  /** "bash" shows the text as is. "tsx" (default) adds line numbers and light highlighting. */
  language?: "tsx" | "bash";
};

const KEYWORDS = new Set(["import", "export", "default", "from", "function", "return", "const"]);
// Strings, words, then any other single character, so the pieces always join back into the source.
const TOKEN = /("[^"]*")|([A-Za-z_]\w*)|(\s+|.)/g;

/** Colors the few token kinds the snippets use. It is not a general highlighter. */
const highlight = (line: string) =>
  Array.from(line.matchAll(TOKEN)).map(([text, string, word], i) => {
    if (string)
      return (
        <span key={i} className="text-success">
          {text}
        </span>
      );
    if (word && KEYWORDS.has(word))
      return (
        <span key={i} className="text-secondary">
          {text}
        </span>
      );
    if (word && /^[A-Z]/.test(word))
      return (
        <span key={i} className="text-primary">
          {text}
        </span>
      );
    return <span key={i}>{text}</span>;
  });

/** A code box with a title bar, line numbers and a copy button. */
export const CodeBlock = ({ code, filename, language = "tsx" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; the code stays selectable.
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-base-300 bg-base-300/40 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-error/70" />
            <span className="h-3 w-3 rounded-full bg-warning/70" />
            <span className="h-3 w-3 rounded-full bg-success/70" />
          </span>
          {filename && <span className="font-mono text-xs opacity-70">{filename}</span>}
        </div>
        <button type="button" className="btn btn-ghost btn-xs gap-1" onClick={copy} aria-label="Copy code">
          {copied ? <CheckIcon className="h-4 w-4 text-success" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono">
          {language === "bash" ? (
            <span className="whitespace-pre">{code}</span>
          ) : (
            code.split("\n").map((line, i) => (
              <span key={i} className="flex">
                <span className="mr-4 w-5 shrink-0 select-none text-right opacity-30">{i + 1}</span>
                <span className="whitespace-pre">{highlight(line)}</span>
              </span>
            ))
          )}
        </code>
      </pre>
    </div>
  );
};

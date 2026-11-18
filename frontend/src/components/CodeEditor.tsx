import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { CompilerDiagnostic } from '../types';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  currentLine?: number | null;
  diagnostics?: CompilerDiagnostic[];
  isExecuting?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  currentLine,
  diagnostics = [],
  isExecuting = false
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom dark theme matching the app
    monaco.editor.defineTheme('cvl-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'type', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'f1f5f9' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#0b0f19',
        'editor.foreground': '#f1f5f9',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#38bdf8',
        'editor.lineHighlightBackground': '#1e293b40',
        'editorCursor.foreground': '#38bdf8',
      }
    });

    monaco.editor.setTheme('cvl-dark');
  };

  // Update decorations (executing line & diagnostics)
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations: any[] = [];

    // 1. Current executing line decoration
    if (currentLine && currentLine > 0) {
      newDecorations.push({
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'executing-line-bg',
          glyphMarginClassName: 'executing-line-glyph',
          hoverMessage: { value: `Currently executing line ${currentLine}` }
        }
      });

      // Reveal line in center
      editor.revealLineInCenterIfOutsideViewport(currentLine);
    }

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    // 2. Set compiler markers (red squiggles for errors, yellow for warnings)
    const model = editor.getModel();
    if (model) {
      const markers = diagnostics.map(d => ({
        startLineNumber: d.line,
        startColumn: d.col,
        endLineNumber: d.line,
        endColumn: d.col + 5,
        message: d.message,
        severity: d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : d.severity === 'warning'
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info
      }));
      monaco.editor.setModelMarkers(model, 'clang', markers);
    }
  }, [currentLine, diagnostics]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0f19]">
      <style>{`
        .executing-line-bg {
          background-color: rgba(56, 189, 248, 0.15) !important;
          border-left: 3px solid #38bdf8 !important;
        }
        .executing-line-glyph {
          background-color: #38bdf8;
          border-radius: 50%;
          transform: scale(0.6);
        }
      `}</style>

      <Editor
        height="100%"
        defaultLanguage="c"
        value={code}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 13,
          fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          glyphMargin: true,
          lineNumbers: 'on',
          automaticLayout: true,
          tabSize: 4,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true }
        }}
      />
    </div>
  );
};

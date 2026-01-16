/**
 * YAML Code Editor component using CodeMirror 6
 */

import { EditorView, basicSetup } from 'codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';
import { useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '../stores/uiStore.js';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  height?: string;
  readOnly?: boolean;
}

/**
 * A CodeMirror-based YAML editor with syntax highlighting.
 * Supports dark mode and external value synchronization.
 */
export function YamlEditor({
  value,
  onChange,
  error,
  height = '500px',
  readOnly = false,
}: YamlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const darkMode = useUiStore((state) => state.darkMode);

  // Create editor on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      basicSetup,
      yaml(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

    // Add dark theme if in dark mode
    if (darkMode) {
      extensions.push(oneDark);
    }

    const view = new EditorView({
      doc: value,
      extensions,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [darkMode, readOnly]); // Recreate editor when dark mode or readOnly changes

  // Sync external value changes
  const syncValue = useCallback((newValue: string) => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (newValue !== currentValue) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: newValue,
          },
        });
      }
    }
  }, []);

  useEffect(() => {
    syncValue(value);
  }, [value, syncValue]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        ref={editorRef}
        style={{
          height,
          border: error ? '1px solid #ff4d4f' : '1px solid #d9d9d9',
          borderRadius: 6,
          overflow: 'auto',
        }}
      />
      {error && (
        <div style={{ color: '#ff4d4f', fontSize: 14 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default YamlEditor;

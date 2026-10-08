import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Heading,
  Code,
  List,
  CheckSquare,
  Quote,
  Eye,
  Edit3,
  Download,
  Copy,
  Check,
  Columns,
  CheckCircle2,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  isSaving: boolean;
  isConnected: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  isSaving,
  isConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('split');
  const [copied, setCopied] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const chars = value.length;
  const readTime = Math.ceil(words / 200);

  const insertSyntax = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const replacement = before + selectedText + after;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Study_Notes_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSimpleMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base font-bold text-brand-700 dark:text-brand-300 mt-4 mb-2 tracking-tight">
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2 border-b border-slate-200 dark:border-slate-800 pb-1">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            {line.replace('# ', '')}
          </h1>
        );
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-brand-500 pl-3.5 py-2 my-3 bg-brand-50 dark:bg-brand-950/40 text-slate-800 dark:text-slate-200 italic rounded-r-xl border border-brand-200/50 dark:border-brand-900/50">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
        const checked = line.startsWith('- [x] ');
        const itemText = line.replace(/- \[[ x]\] /, '');
        return (
          <div key={idx} className="flex items-center space-x-2.5 my-1.5 text-sm text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-700 cursor-default"
            />
            <span className={checked ? 'line-through text-slate-400 dark:text-slate-500' : 'font-medium'}>
              {itemText}
            </span>
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-slate-800 dark:text-slate-200 my-1 leading-relaxed">
            {line.replace(/^[-*]\s+/, '')}
          </li>
        );
      }
      if (line.startsWith('```')) {
        return <div key={idx} className="border-t border-slate-200 dark:border-slate-800 my-2.5" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2.5" />;
      }
      return (
        <p key={idx} className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed my-1.5">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 select-text border-l border-slate-200 dark:border-slate-800">
      {/* Top Formatting Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-2 shrink-0">
        {/* Formatting Buttons */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => insertSyntax('**', '**')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Bold (**text**)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('*', '*')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Italic (*text*)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('### ')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Heading 3"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('`', '`')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Inline Code (`code`)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('- ')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Bulleted List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('- [ ] ')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Checklist Item"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('> ')}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'edit'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            Write
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'split'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Columns className="w-3 h-3" />
            Split
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>

        {/* Persistence Status & Actions */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px]">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isSaving ? 'text-amber-500 animate-spin' : isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isSaving ? 'Saving...' : 'Auto-Saved'}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Copy Note Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Export as Markdown (.md)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body with Pure High Contrast */}
      <div className="flex-1 flex overflow-hidden">
        {(activeTab === 'edit' || activeTab === 'split') && (
          <div className={`h-full ${activeTab === 'split' ? 'w-1/2 border-r border-slate-200 dark:border-slate-800' : 'w-full'}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="# Study Notes&#10;&#10;Type your lecture notes, summaries, or formulas here..."
              className="w-full h-full p-5 bg-white dark:bg-slate-900 font-mono text-sm text-slate-900 dark:text-slate-100 resize-none outline-none focus:ring-0 leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600 overflow-y-auto selection:bg-brand-500/20"
              spellCheck={false}
            />
          </div>
        )}

        {(activeTab === 'preview' || activeTab === 'split') && (
          <div className={`h-full overflow-y-auto p-5 bg-slate-50 dark:bg-slate-950/60 ${activeTab === 'split' ? 'w-1/2' : 'w-full'}`}>
            {value.trim() ? (
              <div className="max-w-2xl mx-auto space-y-1">
                {renderSimpleMarkdown(value)}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Edit3 className="w-8 h-8 mb-2 stroke-[1.5]" />
                Your formatted notes preview will appear here as you type.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
        <div className="flex items-center space-x-3">
          <span>{words} words</span>
          <span>{chars} characters</span>
          <span>~{readTime} min read</span>
        </div>
        <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Synced</span>
        </div>
      </div>
    </div>
  );
};
export default MarkdownEditor;

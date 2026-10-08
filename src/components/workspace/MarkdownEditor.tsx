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
  Sparkles,
  Server,
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
          <h3 key={idx} className="text-base font-bold text-brand-600 dark:text-brand-300 mt-4 mb-2 tracking-tight">
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-bold text-slate-800 dark:text-white mt-5 mb-2 border-b border-black/10 dark:border-white/10 pb-1">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3 border-b border-black/10 dark:border-white/10 pb-2">
            {line.replace('# ', '')}
          </h1>
        );
      }
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-brand-500 pl-3 py-1.5 my-2.5 bg-brand-500/10 text-slate-700 dark:text-slate-300 italic rounded-r-lg">
            {line.replace('> ', '')}
          </blockquote>
        );
      }
      if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
        const checked = line.startsWith('- [x] ');
        const itemText = line.replace(/- \[[ x]\] /, '');
        return (
          <div key={idx} className="flex items-center space-x-2 my-1.5 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="rounded border-slate-300 dark:border-slate-700 text-brand-500"
            />
            <span className={checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
              {itemText}
            </span>
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-slate-700 dark:text-slate-200 my-0.5">
            {line.replace(/^[-*]\s+/, '')}
          </li>
        );
      }
      if (line.startsWith('```')) {
        return <div key={idx} className="border-t border-black/10 dark:border-white/10 my-2" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2.5" />;
      }
      return <p key={idx} className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed my-1">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Liquid Glass Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 liquid-glass border-b border-white/40 dark:border-white/10 gap-2 select-none z-10 shadow-sm">
        {/* Formatting Actions */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => insertSyntax('**', '**')}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('*', '*')}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('## ')}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Heading"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('`', '`')}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />
          <button
            onClick={() => insertSyntax('- ')}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('- [ ] ')}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Task"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSyntax('> ')}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Quote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-white/40 dark:bg-slate-800/60 border border-white/50 dark:border-white/10 p-0.5 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'edit'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            Write
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'split'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Split
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'preview'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>

        {/* Server Sync Indicator & Actions */}
        <div className="flex items-center space-x-2">
          {/* Server Persistence Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white/40 dark:bg-slate-800/60 border border-white/50 dark:border-white/10 text-[11px] shadow-sm">
            <Server className={`w-3 h-3 ${isConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {isSaving ? 'Syncing to Server...' : isConnected ? 'Server Stored' : 'Offline Buffer'}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSaving ? 'bg-amber-400 animate-ping' : isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Copy Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Export Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {(activeTab === 'edit' || activeTab === 'split') && (
          <div className={`h-full ${activeTab === 'split' ? 'w-1/2 border-r border-black/10 dark:border-white/10' : 'w-full'}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="# Research Notes&#10;&#10;Start typing markdown notes here... Real-time persistent server storage."
              className="w-full h-full p-5 bg-transparent font-mono text-sm text-slate-900 dark:text-slate-100 resize-none outline-none focus:ring-0 leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600 overflow-y-auto selection:bg-brand-500/30"
              spellCheck={false}
            />
          </div>
        )}

        {(activeTab === 'preview' || activeTab === 'split') && (
          <div className={`h-full overflow-y-auto p-5 liquid-glass-subtle ${activeTab === 'split' ? 'w-1/2' : 'w-full'}`}>
            {value.trim() ? (
              <div className="max-w-2xl mx-auto space-y-1">
                {renderSimpleMarkdown(value)}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Edit3 className="w-8 h-8 mb-2 stroke-[1.5]" />
                Preview will appear here as you write.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between px-4 py-1.5 liquid-glass-subtle border-t border-white/30 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
        <div className="flex items-center space-x-3">
          <span>{words} words</span>
          <span>{chars} chars</span>
          <span>~{readTime} min read</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-500" />
          <span>Server Database Connected</span>
        </div>
      </div>
    </div>
  );
};

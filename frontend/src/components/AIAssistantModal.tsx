import React, { useState } from 'react';
import { X, Sparkles, Send, Key, Bot, HelpCircle, ShieldAlert } from 'lucide-react';
import { askAI } from '../api';
import { TraceStep } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  currentStep?: TraceStep | null;
  runtimeError?: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  code,
  currentStep,
  runtimeError
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; source?: string }>>([
    {
      sender: 'ai',
      text: "Hello! I am your C Visual Lab learning assistant. Ask me anything about pointers, memory allocation, linked lists, or your program's execution flow!",
      source: 'C Visual Lab Tutor'
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cvl_gemini_key') || '');
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    "Why is head pointing to NULL?",
    "What is the difference between *ptr and ptr?",
    "Why do we use malloc() here?",
    "What happens when free() is executed?",
    "Explain this program line by line.",
    "Why am I getting a segmentation fault?",
    "Are there any memory leaks in this code?"
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || isLoading) return;

    setMessages(prev => [...prev, { sender: 'user', text: q }]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const resp = await askAI({
        question: q,
        code,
        current_step: currentStep,
        runtime_error: runtimeError,
        api_key: apiKey
      });

      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: resp.answer, source: resp.source }
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `An error occurred while answering your question: ${e?.message || 'Network error'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('cvl_gemini_key', key);
    setShowKeyConfig(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>AI Learning Assistant</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Context-Aware
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Inspects current line ({currentStep?.line || 1}), variables, and heap memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="Configure Gemini API Key"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Consent & Configuration Drawer */}
        {showKeyConfig && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Key className="w-4 h-4" />
              <span>Optional Gemini API Key (Clear Consent Required)</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              When an API key is provided, your current C code and execution state will be securely sent to Google Gemini to answer questions.
              If no API key is provided, C Visual Lab uses its powerful local built-in contextual C tutor engine with zero external data sharing.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="password"
                placeholder="Paste Gemini API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => saveApiKey(apiKey)}
                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-450 text-white font-bold rounded text-xs"
              >
                Save Key
              </button>
            </div>
          </div>
        )}

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-slate-500 text-[11px] font-semibold flex items-center gap-1 shrink-0">
            <HelpCircle className="w-3 h-3" /> Quick:
          </span>
          {quickPrompts.map(qp => (
            <button
              key={qp}
              onClick={() => handleSend(qp)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-sky-300 border border-slate-700/60 whitespace-nowrap text-[11px] transition-colors shrink-0 disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-sky-500 text-slate-950 font-medium rounded-tr-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap prose prose-invert prose-xs max-w-none">
                  {m.text}
                </div>
                {m.source && (
                  <div className="mt-2 text-[10px] text-slate-500 font-mono">
                    Answered by {m.source}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-150"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce delay-300"></span>
                <span className="ml-2">Analyzing memory & code structure...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask about this code (e.g. Why is head pointing to NULL?)..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            className="p-2.5 bg-indigo-500 hover:bg-indigo-450 active:bg-indigo-600 text-white rounded-xl transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  html: string;
}

interface TopicChatbotProps {
  topicTitle: string;
  topicContent?: string;
}

const QUICK_PROMPTS = [
  'इसे आसान भाषा में समझाओ',
  'इसमें कौन से best free tools हैं?',
  'Beginners के लिए step-by-step तरीका बताओ',
];

export default function TopicChatbot({ topicTitle, topicContent = '' }: TopicChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      html: query,
    };

    const historyForApi = messages.map((m) => ({
      role: m.role,
      text: m.html,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-supervisor/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'question',
          keywordOrTitle: topicTitle,
          content: topicContent,
          question: query,
          history: historyForApi,
        }),
      });

      const responseText = await res.text();
      let data: { answer?: string; error?: string } = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Server se sahi response nahi mila.');
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          html:
            data.answer ||
            '<p>Maaf karna, iska jawab abhi generate nahi ho paya. Ek baar phir try karo!</p>',
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          html: `<p class="text-red-600 font-semibold">${(err as Error).message}</p>`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Talk to AI"
          className="w-[calc(100vw-2rem)] sm:w-[390px] max-h-[75vh] bg-white rounded-3xl border border-orange-200 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-white/20 shrink-0">
                <Sparkles className="w-4 h-4 text-amber-100" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-sm leading-tight truncate">
                  Talk to AI
                </div>
                <div className="text-[11px] text-white/90 truncate mt-0.5 font-medium">
                  {topicTitle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                  title="Clear chat"
                  aria-label="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Close"
                aria-label="Close chatbot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 min-h-[240px]"
          >
            {/* Intro bubble */}
            <div className="bg-white border border-orange-100 rounded-2xl rounded-tl-sm p-3.5 shadow-2xs space-y-2.5">
              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                नमस्ते! <strong className="text-orange-700">{topicTitle}</strong> से जुड़ा कोई भी सवाल पूछो — मैं आसान Hinglish में तुरंत समझाऊंगा।
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={isLoading}
                    onClick={() => sendMessage(q)}
                    className="text-[11px] px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl font-semibold transition-colors cursor-pointer text-left disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] bg-gradient-to-r from-orange-600 to-amber-600 text-white text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-2xl rounded-br-sm shadow-xs">
                    {msg.html}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className="max-w-[92%] bg-white border border-orange-100 text-slate-800 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-2xl rounded-bl-sm shadow-2xs ai-chat-content"
                    dangerouslySetInnerHTML={{ __html: msg.html }}
                  />
                </div>
              )
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 bg-white border border-orange-100 text-orange-700 text-xs font-bold px-3.5 py-2.5 rounded-2xl rounded-bl-sm shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>जवाब लिख रहा हूँ...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="अपना सवाल यहाँ लिखें..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-orange-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="p-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl shadow-sm disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Fixed Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Talk to AI"
        aria-expanded={isOpen}
        aria-label="Talk to AI"
        className="inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-orange-600/30 border border-orange-400/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        {isOpen ? (
          <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        ) : (
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        )}
        <span>Talk to AI</span>
      </button>
    </div>
  );
}

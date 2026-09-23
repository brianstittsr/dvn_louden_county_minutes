'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AVAILABLE_SOURCES = [
  { id: 'loudoun-data-center-search', label: 'Data Center Search Results' },
  { id: 'loudoun-site', label: 'Full loudoun.gov Crawl' },
];

export default function GBrainChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(['loudoun-data-center-search']);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gbrain-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sources: selectedSources,
          limit: 10,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          assistantContent += chunk;

          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === 'assistant') {
              lastMessage.content = assistantContent;
            } else {
              newMessages.push({
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: assistantContent,
              });
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please make sure GBrain is installed and configured.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white px-4 py-3 sm:px-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">GBrain Q&A</h1>
            <p className="text-sm text-emerald-100 mt-1">Ask questions over selected GBrain knowledge sources</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium text-sm transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-gray-600 mb-2">Select GBrain sources to query:</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SOURCES.map(source => (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedSources.includes(source.id)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedSources.includes(source.id) ? '✓ ' : ''}{source.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Ask GBrain</h2>
              <p className="text-gray-500">Select one or more sources, then ask a question about Loudoun County data centers.</p>
            </div>
          )}

          {messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
              }`}>
                <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-4 sm:px-6 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question over selected GBrains..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || selectedSources.length === 0}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

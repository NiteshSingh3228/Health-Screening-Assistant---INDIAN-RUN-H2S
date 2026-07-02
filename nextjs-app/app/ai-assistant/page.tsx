"use client";

import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const SUGGESTIONS = [
  "I have a sharp headache and nausea, what does that mean?",
  "How do I schedule a session with Dr. Sarah Chen?",
  "Tell me about the heart condition called Angina.",
  "What is the phone number for emergency ambulance services?"
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your AI Health Screening Assistant. How can I help you today? I can guide you through symptoms, help book appointments, clarify scan analysis terms, or show emergency details.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollChat = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollChat, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Map message history to format expected by backend if any
      const history = messages.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      const res = await api.chatWithAI(textToSend, history);
      
      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: "I'm having trouble connecting to my knowledge base right now. Please ensure the backend server is running on port 8000.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "ai",
        text: "Hello! I am your AI Health Screening Assistant. How can I help you today? I can guide you through symptoms, help book appointments, clarify scan analysis terms, or show emergency details.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      <Navbar />
      <main className="pt-20 h-screen flex bg-surface overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 border-r border-outline-variant/30 bg-surface-container-lowest hidden md:flex flex-col p-md justify-between">
          <div className="space-y-md">
            <button
              onClick={startNewChat}
              className="w-full py-3 px-4 border-2 border-dashed border-primary/40 hover:border-primary text-primary font-label-md rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/5 transition-all duration-300"
            >
              <span className="material-symbols-outlined text-[20px]">chat_add_on</span>
              New Conversation
            </button>

            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-2 px-1">Recent Chats</p>
              <div className="space-y-1">
                {[
                  "Headache analysis",
                  "Cardiology inquiry",
                  "Appointment timings",
                  "Emergency helpline check"
                ].map((chat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(`Tell me about ${chat.toLowerCase()}`);
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-surface-container-low text-body-md text-on-surface hover:text-primary transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-outline">chat</span>
                    <span className="truncate">{chat}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-error-container/40 p-md rounded-2xl border border-error/10">
            <div className="flex items-center gap-2 text-tertiary mb-2">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <span className="font-label-md text-label-md">Medical Disclaimer</span>
            </div>
            <p className="text-label-sm text-on-surface-variant leading-relaxed">
              This AI chat assistant provides automated screenings for educational purposes only. If you are experiencing severe symptoms, please contact emergency services immediately.
            </p>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col h-full bg-surface">
          {/* Header */}
          <div className="px-lg py-sm border-b border-outline-variant/30 bg-surface-container-lowest flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">smart_toy</span>
            </div>
            <div>
              <h1 className="font-headline-md text-body-lg text-on-surface">Screening AI Assistant</h1>
              <p className="text-[11px] text-primary flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block"></span>
                Active Medical Guidance System
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-lg space-y-md">
            <div className="max-w-3xl mx-auto space-y-md">
              {messages.map((m) => {
                const isAI = m.sender === "ai";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 max-w-2xl ${isAI ? "" : "ml-auto flex-row-reverse"}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isAI
                          ? "bg-primary-fixed text-primary"
                          : "bg-primary text-on-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isAI ? "smart_toy" : "person"}
                      </span>
                    </div>
                    <div>
                      <div
                        className={`p-md rounded-2xl text-body-md ${
                          isAI
                            ? "bg-surface-container-lowest text-on-surface medical-glow border border-outline-variant/10"
                            : "bg-primary text-on-primary"
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-on-surface-variant block mt-1 px-1">
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 max-w-2xl">
                  <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                  </div>
                  <div className="p-md rounded-2xl bg-surface-container-lowest text-on-surface medical-glow border border-outline-variant/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-outline animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-outline animate-bounce delay-100"></span>
                    <span className="w-2 h-2 rounded-full bg-outline animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Suggestions & Input Container */}
          <div className="p-lg bg-surface-container-lowest border-t border-outline-variant/30">
            <div className="max-w-3xl mx-auto space-y-md">
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="px-md py-2 bg-primary-fixed/20 border border-primary-fixed text-on-primary-fixed-variant rounded-full text-label-sm font-label-sm hover:bg-primary-fixed hover:text-primary transition-all duration-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="relative flex items-center gap-2 bg-surface-container-low rounded-2xl border border-outline-variant/20 p-1 pr-3 shadow-inner focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all duration-300"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a health screening question..."
                  disabled={loading}
                  className="flex-1 bg-transparent py-4 px-md border-none focus:ring-0 outline-none text-body-md placeholder:text-outline-variant text-on-surface"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

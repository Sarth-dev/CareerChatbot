/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useRef } from "react";

type Message = {
  id: number;
  text: string;
  sender: "user" | "counselor";
  createdAt: string;
  status?: "sent" | "delivered";
};

type Session = {
  id: number;
  title: string;
  createdAt: string;
};

const BACKEND_URL = process.env.API_URL || 'https://chatbotbackend-4ve7.onrender.com';
const USER_ID = 1234;
const PAGE_SIZE = 10;

const ChatBox: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Dark mode toggle
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Scroll to bottom on messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSession) fetchMessages(activeSession.id, page);
  }, [activeSession, page]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/sessions/${USER_ID}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data: Session[] = await res.json();
      setSessions(data);
      if (data.length && !activeSession) setActiveSession(data[0]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const fetchMessages = async (sessionId: number, pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/messages/${USER_ID}?sessionId=${sessionId}&page=${pageNum}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data: { messages: Message[]; total: number } = await res.json();
      setMessages(data.messages ?? []);
      setTotalMessages(data.total ?? 0);
      setError(null);
    } catch (err) {
      setMessages([]);
      setTotalMessages(0);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession) return;
    setLoading(true);
    setTyping(true);
    const newMsg: Message = {
      id: Date.now(),
      text: input,
      sender: "user",
      createdAt: new Date().toISOString(),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    try {
      const res = await fetch(`${BACKEND_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, userId: USER_ID, sessionId: activeSession.id }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      await fetchMessages(activeSession.id, page);
      await fetchSessions();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTyping(false);
      setLoading(false);
    }
  };

  const startNewSession = async () => {
    const title = prompt("Enter a title for the new chat session") || "New session";
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: USER_ID, title }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const session: Session = await res.json();
      setSessions([session, ...sessions]);
      setActiveSession(session);
      setPage(0);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const canLoadMore = (page + 1) * PAGE_SIZE < totalMessages;

  return (
    <div
      className={`flex flex-col md:flex-row h-screen max-w-full transition-colors ${
        darkMode ? "bg-gray-950 text-white" : "bg-gradient-to-br from-blue-50 to-white text-gray-900"
      }`}
    >
      {/* Top bar mobile */}
      <div className="md:hidden flex justify-between items-center p-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="font-semibold text-blue-600 dark:text-blue-400"
        >
          {sidebarOpen ? "Close" : "Sessions"}
        </button>
        <button onClick={toggleDarkMode} className="text-gray-700 dark:text-gray-300">
          {darkMode ? "Light" : "Dark"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:relative top-0 left-0 z-20 w-64 h-full md:h-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-4 rounded-r-2xl shadow-xl overflow-auto transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Career Sessions</h3>
          <button
            onClick={startNewSession}
            className="text-sm text-blue-600 font-medium hover:text-blue-800"
          >
            + New
          </button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No sessions yet</p>
        ) : (
          sessions.map((session, idx) => (
            <div
              key={session.id ?? idx}
              onClick={() => {
                setActiveSession(session);
                setPage(0);
                setMessages([]);
                setSidebarOpen(false);
              }}
              className={`cursor-pointer mb-2 p-3 rounded-xl transition flex flex-col ${
                activeSession?.id === session.id
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-600/50"
              }`}
            >
              <span className="font-medium">{session.title}</span>
              <span className="text-xs opacity-80 mt-1">
                {new Date(session.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </aside>

      {/* Chat area */}
      <main className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {/* Header */}
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-semibold">
            {activeSession ? activeSession.title : "Select a session"}
          </h2>
          <div className="flex gap-2 items-center">
            {typing && (
              <span className="text-sm text-gray-500 dark:text-gray-300 italic">
                Counselor is typing...
              </span>
            )}
            <button onClick={toggleDarkMode} className="text-gray-700 dark:text-gray-300">
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-transparent">
          {loading && (
            <p className="text-center text-gray-500 dark:text-gray-300 animate-pulse">Loading...</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 mt-4">
              No messages yet. Start the conversation!
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === "user" ? "self-end flex-row-reverse" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-500 flex items-center justify-center text-sm font-bold">
                {msg.sender === "user" ? "You" : "C"}
              </div>
              <div
                className={`max-w-[75%] p-4 rounded-2xl break-words shadow-md animate-fade-in ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                }`}
              >
                <p className="text-base">{msg.text}</p>
                <div className="flex justify-between items-center mt-2 text-xs opacity-70">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.sender === "user" && <span>{msg.status}</span>}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
          {canLoadMore && (
            <div className="text-center mt-4">
              <button
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow"
              >
                Load More
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10">
          <input
            type="text"
            placeholder="Ask your counselor anything..."
            className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 transition"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading || !activeSession}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !activeSession}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-medium shadow transition"
          >
            Send
          </button>
        </footer>
      </main>
    </div>
  );
};

export default ChatBox;

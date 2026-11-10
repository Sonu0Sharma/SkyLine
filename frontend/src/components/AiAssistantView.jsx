import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaPaperPlane, FaRobot } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

function AiAssistantView() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! I am your Career Coach. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Uses "chat" context for general advice
      const res = await axios.post('/api/ai/generate', {
        prompt: userMsg.text,
        context: "chat", 
        role: "Career Coach"
      });
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.data }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: "I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-3 bg-gray-50 border-b flex items-center gap-2">
        <FaRobot className="text-indigo-600" />
        <h3 className="font-semibold text-gray-700">Quick AI Assistant</h3>
      </div>

      <div className="flex-grow p-3 overflow-y-auto space-y-3 bg-white h-64">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
              msg.sender === 'user' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && <p className="text-xs text-gray-400 italic">Thinking...</p>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-2 border-t flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a quick question..." 
          className="flex-grow p-2 text-sm border rounded focus:outline-none focus:border-indigo-500"
        />
        <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
}

export default AiAssistantView;
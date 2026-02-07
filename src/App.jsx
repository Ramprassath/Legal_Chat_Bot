import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Send, Trash2, Settings, Loader2, MessageSquare } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Add this debug log (remove after fixing)
console.log('API_URL:', API_URL);
console.log('Environment:', import.meta.env.MODE);

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    maxLength: 512,
    temperature: 0.7,
    topP: 0.9
  });
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check backend health on mount
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/health`);
      console.log('Health check:', response.data);
      setError(null);
    } catch (err) {
      console.error('Health check failed:', err);
      setError('Unable to connect to server. Please check if the backend is running.');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/chat`,
        {
          message: userMessage,
          sessionId: sessionId,
          options: settings
        },
        { timeout: 60000 } // 60 second timeout
      );

      // Add AI response to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.response,
          modelName: response.data.modelName
        }
      ]);

    } catch (err) {
      console.error('Error:', err);
      let errorMessage = 'Failed to get response. ';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage += 'Request timed out. The model might be taking too long to respond.';
      } else if (err.response?.status === 429) {
        errorMessage += 'Too many requests. Please wait a moment and try again.';
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (!err.response) {
        errorMessage += 'Cannot connect to server. Please check if the backend is running.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'error',
          content: errorMessage
        }
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = async () => {
    if (confirm('Clear all messages?')) {
      try {
        await axios.delete(`${API_URL}/api/chat/${sessionId}`);
        setMessages([]);
        setSessionId(`session_${Date.now()}`);
        setError(null);
      } catch (err) {
        console.error('Error clearing chat:', err);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">AI Chat</h1>
            <p className="text-xs text-gray-500">Powered by your fine-tuned model</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b px-6 py-4">
          <h3 className="font-semibold mb-3 text-gray-700">Generation Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Length: {settings.maxLength}
              </label>
              <input
                type="range"
                min="128"
                max="2048"
                step="128"
                value={settings.maxLength}
                onChange={(e) => setSettings({...settings, maxLength: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top P: {settings.topP}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.topP}
                onChange={(e) => setSettings({...settings, topP: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-6 py-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageSquare className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Start a Conversation
              </h2>
              <p className="text-gray-500">
                Ask me anything! I'm powered by a fine-tuned AI model.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : message.role === 'error'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-white shadow-md'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="markdown-content prose prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                      {message.modelName && (
                        <p className="text-xs text-gray-400 mt-2 italic">
                          via {message.modelName}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;

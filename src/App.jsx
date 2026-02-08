import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Send, Trash2, Settings, Loader2, MessageSquare, X, ChevronDown, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
        { timeout: 60000 }
      );

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header with glassmorphism effect */}
      <header className="relative bg-white/80 backdrop-blur-xl shadow-lg px-6 py-4 border-b border-white/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl blur opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Legal Assistant
              </h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                One stop AI for all your Legal Needs
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 hover:bg-indigo-50 rounded-xl transition-all duration-200 ${
                showSettings ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'
              }`}
              title="Settings"
            >
              <Settings className={`w-5 h-5 ${showSettings ? 'rotate-90' : ''} transition-transform duration-300`} />
            </button>
            <button
              onClick={clearChat}
              className="p-2.5 hover:bg-red-50 rounded-xl transition-all duration-200 text-gray-600 hover:text-red-600"
              title="Clear chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Enhanced Settings Panel with smooth animation */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showSettings ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-6 py-5">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Generation Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Max Length
                  <span className="ml-2 text-indigo-600 font-semibold">{settings.maxLength}</span>
                </label>
                <input
                  type="range"
                  min="128"
                  max="2048"
                  step="128"
                  value={settings.maxLength}
                  onChange={(e) => setSettings({...settings, maxLength: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>128</span>
                  <span>2048</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Temperature
                  <span className="ml-2 text-indigo-600 font-semibold">{settings.temperature.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.0</span>
                  <span>2.0</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Top P
                  <span className="ml-2 text-indigo-600 font-semibold">{settings.topP.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.topP}
                  onChange={(e) => setSettings({...settings, topP: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.0</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Error Banner */}
      {error && (
        <div className="bg-red-50/90 backdrop-blur-sm border-l-4 border-red-500 px-6 py-3 animate-slideIn">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-red-700 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md animate-fadeIn">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <MessageSquare className="w-20 h-20 text-indigo-500 mx-auto relative" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Welcome to Legal Assistant
              </h2>
              <p className="text-gray-500 mb-6">
                Get instant legal guidance and assistance. Ask me about legal matters, contracts, rights, or any legal questions.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Draft a contract', 
                  'Explain my rights', 
                  'Review legal document'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 bg-white/80 hover:bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:shadow-md transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-indigo-200'
                      : message.role === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white shadow-md border border-gray-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-1">
                      <div className="markdown-content prose prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.modelName && (
                        <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-gray-100">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <p className="text-xs text-gray-400 italic">
                            {message.modelName}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start animate-slideUp">
                <div className="bg-white rounded-2xl px-5 py-4 shadow-md border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Enhanced Input Area */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200 px-4 py-4 shadow-2xl">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a legal question..."
                className="w-full px-5 py-4 pr-12 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 bg-white shadow-sm"
                disabled={isLoading}
              />
              {input && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Thinking</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}

export default App;

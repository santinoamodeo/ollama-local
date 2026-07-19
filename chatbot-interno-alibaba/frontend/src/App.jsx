import { useState } from 'react';
import Login from './Login';
import ChatBot from './ChatBot';

const TOKEN_KEY = 'chatbot-auth-token';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const handleLogin = (newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;
  return <ChatBot token={token} onLogout={handleLogout} />;
}
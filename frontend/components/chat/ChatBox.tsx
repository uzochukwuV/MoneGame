'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  player_address: string;
  message: string;
  created_at: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  currentPlayerAddress?: string;
  onSendMessage: (message: string) => Promise<void>;
  sending: boolean;
  loading: boolean;
  error: string | null;
  title?: string;
  placeholder?: string;
}

export function ChatBox({
  messages,
  currentPlayerAddress,
  onSendMessage,
  sending,
  loading,
  error,
  title = 'Chat',
  placeholder = 'Type a message...',
}: ChatBoxProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    try {
      await onSendMessage(inputMessage);
      setInputMessage('');
    } catch (err) {
      // Error handled by parent
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: title ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
      borderRadius: title ? '0.75rem' : '0',
      border: title ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      overflow: 'hidden'
    }}>
      {/* Header (only show if title is provided) */}
      {title && (
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'white', margin: 0 }}>
            💬 {title}
          </h3>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
            Loading messages...
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            color: '#ef4444',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', padding: '2rem 0' }}>
            No messages yet. Be the first to say something!
          </div>
        )}

        {messages.map((msg) => {
          const isCurrentUser = msg.player_address === currentPlayerAddress;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '0.75rem',
                backgroundColor: isCurrentUser
                  ? 'rgba(99, 102, 241, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isCurrentUser
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '0.75rem',
                wordBreak: 'break-word'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem'
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    color: isCurrentUser ? '#818cf8' : '#9ca3af',
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}>
                    {isCurrentUser ? 'You' : formatAddress(msg.player_address)}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'white', fontSize: '0.875rem', lineHeight: '1.5' }}>
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {currentPlayerAddress ? (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={sending}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem',
                outline: 'none',
                opacity: sending ? 0.5 : 1
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputMessage.trim() || sending}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: !inputMessage.trim() || sending ? '#4b5563' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: !inputMessage.trim() || sending ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '0.875rem'
        }}>
          Connect your wallet to chat
        </div>
      )}
    </div>
  );
}

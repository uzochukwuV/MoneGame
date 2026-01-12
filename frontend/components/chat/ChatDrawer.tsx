'use client';

import { useState } from 'react';
import { ChatBox } from './ChatBox';

interface ChatMessage {
  id: string;
  player_address: string;
  message: string;
  created_at: string;
}

interface ChatDrawerProps {
  messages: ChatMessage[];
  currentPlayerAddress?: string;
  onSendMessage: (message: string) => Promise<void>;
  sending: boolean;
  loading: boolean;
  error: string | null;
  title?: string;
  placeholder?: string;
  unreadCount?: number;
}

export function ChatDrawer({
  messages,
  currentPlayerAddress,
  onSendMessage,
  sending,
  loading,
  error,
  title = 'Chat',
  placeholder = 'Type a message...',
  unreadCount = 0,
}: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={toggleDrawer}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(99, 102, 241, 0.5)',
          transition: 'all 0.3s',
          zIndex: 999,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 15px 30px rgba(99, 102, 241, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(99, 102, 241, 0.5)';
        }}
      >
        {isOpen ? '✕' : '💬'}
        {!isOpen && unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(0, 0, 0, 0.8)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={toggleDrawer}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out',
          }}
        />
      )}

      {/* Chat Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-400px',
          bottom: 0,
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'rgba(17, 24, 39, 0.98)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1001,
          transition: 'right 0.3s ease-out',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isOpen ? '-10px 0 30px rgba(0, 0, 0, 0.5)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            💬 {title}
          </h2>
          <button
            onClick={toggleDrawer}
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.375rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Chat Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatBox
            messages={messages}
            currentPlayerAddress={currentPlayerAddress}
            onSendMessage={onSendMessage}
            sending={sending}
            loading={loading}
            error={error}
            title=""
            placeholder={placeholder}
          />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

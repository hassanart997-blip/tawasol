import React, { useState, useEffect, useRef } from 'react';

function Chat({ api, user, socket }) {
    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (socket) {
            window.addEventListener('new_message', handleNewMessage);
            window.addEventListener('user_typing', handleTyping);
        }
        return () => {
            window.removeEventListener('new_message', handleNewMessage);
            window.removeEventListener('user_typing', handleTyping);
        };
    }, [socket, currentConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleNewMessage = (e) => {
        const message = e.detail;
        if (currentConversation && message.conversation_id === currentConversation.id) {
            setMessages(prev => [...prev, message]);
        }
        loadConversations();
    };

    const handleTyping = (e) => {
        const data = e.detail;
        if (data.userId !== user.id) {
            setTyping(data.isTyping);
        }
    };

    const loadConversations = async () => {
        try {
            const response = await api.get('/conversations');
            setConversations(response.data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    };

    const openConversation = async (conversation) => {
        setCurrentConversation(conversation);
        try {
            const response = await api.get(`/conversations/${conversation.id}/messages`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !currentConversation) return;

        if (socket) {
            socket.emit('send_message', {
                conversationId: currentConversation.id,
                content: newMessage
            });
        }

        setNewMessage('');
    };

    const handleTypingEmit = (e) => {
        setNewMessage(e.target.value);
        if (socket && currentConversation) {
            socket.emit('typing', {
                conversationId: currentConversation.id,
                isTyping: e.target.value.length > 0
            });
        }
    };

    return (
        <div className="chat-container">
            {/* قائمة المحادثات */}
            <div className="conversations-list">
                <h3>المحادثات</h3>
                {conversations.length === 0 ? (
                    <p>لا توجد محادثات بعد</p>
                ) : (
                    conversations.map(conv => (
                        <div
                            key={conv.id}
                            className={`conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
                            onClick={() => openConversation(conv)}
                        >
                            <img
                                src={conv.profile_picture || '/default-avatar.png'}
                                alt={conv.name}
                                className="avatar"
                            />
                            <div className="conv-info">
                                <h4>{conv.name}</h4>
                                <p>{conv.last_message || 'ابدأ المحادثة'}</p>
                            </div>
                            {conv.unread_count > 0 && (
                                <span className="unread-badge">{conv.unread_count}</span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* نافذة المحادثة */}
            <div className="chat-window">
                {currentConversation ? (
                    <>
                        <div className="chat-header">
                            <img
                                src={currentConversation.profile_picture || '/default-avatar.png'}
                                alt={currentConversation.name}
                                className="avatar"
                            />
                            <h3>{currentConversation.name}</h3>
                        </div>

                        <div className="messages-list">
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                                >
                                    <p>{msg.content}</p>
                                    <span className="message-time">
                                        {new Date(msg.created_at).toLocaleTimeString('ar-SA')}
                                    </span>
                                </div>
                            ))}
                            {typing && <div className="typing-indicator">يكتب...</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="message-input">
                            <input
                                type="text"
                                placeholder="اكتب رسالة..."
                                value={newMessage}
                                onChange={handleTypingEmit}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage}>إرسال</button>
                        </div>
                    </>
                ) : (
                    <div className="no-conversation">
                        <p>اختر محادثة للبدء</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;

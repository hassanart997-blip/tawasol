import React, { useState, useEffect, useRef } from 'react';

function Chat({ api, user }) {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : '؟';

    useEffect(() => {
        api.get('/users').then(r => setUsers(r.data)).catch(console.error);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const openChat = async (u) => {
        setCurrentUser(u);
        try {
            const res = await api.get(`/messages/${u.id}`);
            setMessages(res.data);
        } catch(e) { console.error(e); }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !currentUser) return;
        try {
            const res = await api.post('/messages', {
                receiver_id: currentUser.id,
                content: newMessage
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
        } catch(e) { console.error(e); }
    };

    return (
        <div className="chat-container">
            <div className="conversations-list">
                <div className="conversations-header">💬 المحادثات</div>
                {users.length === 0 ? (
                    <p style={{padding:'20px',color:'#8e8e8e',textAlign:'center'}}>لا يوجد مستخدمون</p>
                ) : (
                    users.map(u => (
                        <div
                            key={u.id}
                            className={`conversation-item ${currentUser?.id === u.id ? 'active' : ''}`}
                            onClick={() => openChat(u)}
                        >
                            <div className="conv-avatar">{firstLetter(u.full_name)}</div>
                            <div className="conv-info">
                                <div className="conv-name">{u.full_name}</div>
                                <div className="conv-last">@{u.username}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="chat-window">
                {currentUser ? (
                    <>
                        <div className="chat-header">
                            <div className="conv-avatar">{firstLetter(currentUser.full_name)}</div>
                            <div>
                                <strong>{currentUser.full_name}</strong>
                                <div style={{fontSize:'12px',color:'#8e8e8e'}}>@{currentUser.username}</div>
                            </div>
                            <div className="chat-header-actions">
                                <button title="مكالمة صوتية">📞</button>
                                <button title="مكالمة فيديو">📹</button>
                            </div>
                        </div>

                        <div className="messages-list">
                            {messages.length === 0 && (
                                <div style={{textAlign:'center',color:'#8e8e8e',margin:'auto'}}>
                                    <div style={{fontSize:'48px'}}>👋</div>
                                    <p>ابدأ المحادثة!</p>
                                </div>
                            )}
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                                >
                                    {msg.content}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="message-input">
                            <button style={{background:'none',border:'none',fontSize:'22px',cursor:'pointer'}}>😊</button>
                            <input
                                type="text"
                                placeholder="اكتب رسالة..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage}>➤</button>
                        </div>
                    </>
                ) : (
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#8e8e8e'}}>
                        <div style={{fontSize:'64px',marginBottom:'16px'}}>💬</div>
                        <h3>رسائلك</h3>
                        <p style={{fontSize:'14px'}}>اختر محادثة للبدء</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;

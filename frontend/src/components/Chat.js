import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

function Chat() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [myId, setMyId] = useState(null);
  const messagesEndRef = useRef(null);

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';

  useEffect(() => {
    api.get('/profile').then(r => setMyId(r.data.id)).catch(console.error);
    api.get('/users').then(r => setUsers(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = async u => {
    setCurrentUser(u);
    try {
      const res = await api.get(`/messages/${u.id}`);
      setMessages(res.data);
    } catch(e) { console.error(e); }
  };

  const sendMessage = async () => {
    if(!newMessage.trim() || !currentUser) return;
    try {
      const res = await api.post('/messages', { receiver_id: currentUser.id, content: newMessage });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
    } catch(e) { console.error(e); }
  };

  // SVG Icons
  const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.48-.59a2 2 0 012.11.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );

  const VideoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
      <polygon points="23,7 16,12 23,17 23,7"/>
      <rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );

  const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0095f6" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22,2 15,22 11,13 2,9"/>
    </svg>
  );

  const InfoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );

  return (
    <div style={{paddingTop:'60px',height:'100vh',display:'flex',flexDirection:'column',background:'#fff'}}>

      {!currentUser ? (
        /* قائمة المحادثات */
        <div>
          <div style={{padding:'16px',borderBottom:'1px solid #dbdbdb'}}>
            <div style={{fontSize:'16px',fontWeight:'700'}}>الرسائل</div>
          </div>
          {users.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'#8e8e8e'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dbdbdb" strokeWidth="1.5" style={{marginBottom:'12px'}}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <p style={{fontSize:'14px'}}>لا توجد محادثات</p>
            </div>
          ) : users.map(u => (
            <div
              key={u.id}
              onClick={() => openChat(u)}
              style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid #f0f0f0'}}
            >
              <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',padding:'2px',flexShrink:0}}>
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'700',color:'#262626'}}>
                  {firstLetter(u.full_name)}
                </div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:'14px',fontWeight:'600'}}>{u.username}</div>
                <div style={{fontSize:'13px',color:'#8e8e8e'}}>{u.full_name}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* نافذة المحادثة */
        <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',borderBottom:'1px solid #dbdbdb',background:'#fff'}}>
            <button onClick={() => setCurrentUser(null)} style={{background:'none',border:'none',cursor:'pointer',padding:'4px',display:'flex'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
            <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',padding:'2px'}}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'700'}}>
                {firstLetter(currentUser.full_name)}
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'14px',fontWeight:'600'}}>{currentUser.username}</div>
            </div>
            <div style={{display:'flex',gap:'16px'}}>
              <button style={{background:'none',border:'none',cursor:'pointer',display:'flex'}}><PhoneIcon/></button>
              <button style={{background:'none',border:'none',cursor:'pointer',display:'flex'}}><VideoIcon/></button>
              <button style={{background:'none',border:'none',cursor:'pointer',display:'flex'}}><InfoIcon/></button>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
            {messages.length === 0 && (
              <div style={{textAlign:'center',color:'#8e8e8e',margin:'auto'}}>
                <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',padding:'3px',margin:'0 auto 12px'}}>
                  <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:'700'}}>
                    {firstLetter(currentUser.full_name)}
                  </div>
                </div>
                <div style={{fontWeight:'600',marginBottom:'4px'}}>{currentUser.username}</div>
                <div style={{fontSize:'13px'}}>ابدأ المحادثة!</div>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} style={{
                display:'flex',
                justifyContent: msg.sender_id === myId ? 'flex-start' : 'flex-end'
              }}>
                <div style={{
                  maxWidth:'70%',
                  padding:'10px 14px',
                  borderRadius: msg.sender_id === myId ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
                  background: msg.sender_id === myId ? '#efefef' : '#0095f6',
                  color: msg.sender_id === myId ? '#262626' : 'white',
                  fontSize:'14px',
                  lineHeight:'1.4'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 16px',borderTop:'1px solid #dbdbdb',background:'#fff',paddingBottom:'calc(10px + env(safe-area-inset-bottom))'}}>
            <div style={{flex:1,background:'#efefef',borderRadius:'22px',padding:'10px 16px',display:'flex',alignItems:'center'}}>
              <input
                type="text"
                placeholder="رسالة..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={e => e.key==='Enter' && sendMessage()}
                style={{flex:1,background:'none',border:'none',outline:'none',fontFamily:'inherit',fontSize:'14px',color:'#262626',direction:'rtl'}}
              />
            </div>
            <button onClick={sendMessage} style={{background:'none',border:'none',cursor:'pointer',display:'flex',padding:'4px'}}>
              <SendIcon/>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

export default Chat;

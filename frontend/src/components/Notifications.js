import React, { useState, useEffect } from 'react';
import api from '../api';

function Notifications({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';
  const timeAgo = date => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if(diff<60) return 'الآن';
    if(diff<3600) return `${Math.floor(diff/60)} دقيقة`;
    if(diff<86400) return `${Math.floor(diff/3600)} ساعة`;
    return `${Math.floor(diff/86400)} يوم`;
  };

  const typeText = type => {
    if(type === 'like') return 'أعجب بمنشورك ❤️';
    if(type === 'comment') return 'علّق على منشورك 💬';
    if(type === 'follow') return 'بدأ بمتابعتك 👤';
    return '';
  };

  useEffect(() => {
    api.get('/notifications')
      .then(r => setNotifications(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // تحديد كمقروءة
    api.put('/notifications/read').catch(console.error);
  }, []);

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center'
    }}>
      <div style={{
        background:'#fff', borderRadius:'16px 16px 0 0',
        width:'100%', maxHeight:'80vh', overflow:'auto'
      }}>
        {/* Header */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'16px 20px', borderBottom:'1px solid #dbdbdb',
          position:'sticky', top:0, background:'#fff', zIndex:1
        }}>
          <h3 style={{margin:0, fontSize:'16px', fontWeight:'700'}}>الإشعارات</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:'#262626'}}>✕</button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{textAlign:'center',padding:'40px'}}>
            <div className="spinner"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px',color:'#8e8e8e'}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dbdbdb" strokeWidth="1.5" style={{marginBottom:'12px',display:'block',margin:'0 auto 12px'}}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <p style={{fontSize:'14px'}}>لا توجد إشعارات بعد</p>
          </div>
        ) : (
          <div>
            {notifications.map(n => (
              <div key={n.id} style={{
                display:'flex', alignItems:'center', gap:'12px',
                padding:'12px 20px',
                borderBottom:'1px solid #f0f0f0',
                background: n.is_read ? '#fff' : '#f0f8ff'
              }}>
                <div style={{
                  width:'44px', height:'44px', borderRadius:'50%',
                  background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
                  padding:'2px', flexShrink:0
                }}>
                  <div style={{
                    width:'100%', height:'100%', borderRadius:'50%',
                    background:'#fff', display:'flex', alignItems:'center',
                    justifyContent:'center', fontWeight:'700', fontSize:'16px'
                  }}>
                    {firstLetter(n.full_name)}
                  </div>
                </div>
                <div style={{flex:1}}>
                  <span style={{fontWeight:'600', fontSize:'14px'}}>{n.username} </span>
                  <span style={{fontSize:'14px', color:'#262626'}}>{typeText(n.type)}</span>
                  <div style={{fontSize:'12px', color:'#8e8e8e', marginTop:'2px'}}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#0095f6',flexShrink:0}}></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;

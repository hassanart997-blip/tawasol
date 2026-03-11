import React, { useState, useEffect } from 'react';
import api from '../api';

function Friends() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [followed, setFollowed] = useState({});

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleSearch = async () => {
    if(!search.trim()) return loadUsers();
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.filter(u =>
        u.full_name?.includes(search) || u.username?.includes(search)
      ));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const toggleFollow = async (userId) => {
    try {
      await api.post('/friends/request', { friend_id: userId });
      setFollowed(prev => ({...prev, [userId]: !prev[userId]}));
    } catch(e) { console.error(e); }
  };

  const filtered = users.filter(u =>
    u.full_name?.includes(search) || u.username?.includes(search)
  );

  return (
    <div style={{paddingTop:'60px',paddingBottom:'60px',background:'#fafafa',minHeight:'100vh'}}>

      {/* Search Bar */}
      <div style={{padding:'8px 12px',background:'#fafafa',position:'sticky',top:'60px',zIndex:50}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{flex:1,position:'relative'}}>
            <input
              type="text"
              placeholder="ابحث..."
              value={search}
              onChange={e => { setSearch(e.target.value); if(!e.target.value) loadUsers(); }}
              onKeyPress={e => e.key==='Enter' && handleSearch()}
              style={{
                width:'100%',
                background:'#efefef',
                border:'none',
                borderRadius:'10px',
                padding:'8px 36px 8px 14px',
                fontFamily:'inherit',
                fontSize:'14px',
                outline:'none',
                direction:'rtl'
              }}
            />
            <span style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
          </div>
          <button
            onClick={handleSearch}
            style={{background:'#0095f6',color:'white',border:'none',borderRadius:'8px',padding:'8px 14px',fontFamily:'inherit',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}
          >
            بحث
          </button>
        </div>
      </div>

      {/* Users List */}
      <div style={{background:'#fff',borderTop:'1px solid #dbdbdb',borderBottom:'1px solid #dbdbdb'}}>
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'40px'}}>
            <div style={{width:'28px',height:'28px',border:'3px solid #dbdbdb',borderTopColor:'#0095f6',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px',color:'#8e8e8e'}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dbdbdb" strokeWidth="1.5" style={{marginBottom:'12px'}}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p style={{fontSize:'14px'}}>لا يوجد مستخدمون</p>
          </div>
        ) : filtered.map(u => (
          <div key={u.id} style={{display:'flex',alignItems:'center',padding:'12px 16px',gap:'12px',borderBottom:'1px solid #f0f0f0'}}>
            {/* Avatar */}
            <a href={`/profile/${u.id}`} style={{textDecoration:'none'}}>
              <div style={{width:'50px',height:'50px',borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',padding:'2px',flexShrink:0}}>
                <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700',color:'#262626'}}>
                  {firstLetter(u.full_name)}
                </div>
              </div>
            </a>

            {/* Info */}
            <div style={{flex:1}}>
              <div style={{fontSize:'14px',fontWeight:'600',color:'#262626'}}>{u.username}</div>
              <div style={{fontSize:'13px',color:'#8e8e8e'}}>{u.full_name}</div>
            </div>

            {/* Follow Button */}
            <button
              onClick={() => toggleFollow(u.id)}
              style={{
                background: followed[u.id] ? '#fff' : '#0095f6',
                color: followed[u.id] ? '#262626' : 'white',
                border: followed[u.id] ? '1px solid #dbdbdb' : 'none',
                borderRadius:'8px',
                padding:'6px 16px',
                fontFamily:'inherit',
                fontSize:'13px',
                fontWeight:'600',
                cursor:'pointer',
                whiteSpace:'nowrap'
              }}
            >
              {followed[u.id] ? 'متابَع' : 'متابعة'}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

export default Friends;

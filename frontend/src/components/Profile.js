import React, { useState, useEffect } from 'react';
import api from '../api';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('grid');

  const userId = window.location.pathname.split('/').pop();
  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/profile');
        setProfile(res.data);
        const postsRes = await api.get('/posts');
        setPosts(postsRes.data.filter(p => p.user_id === parseInt(userId)));
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  if(loading) return (
    <div className="loading-spinner" style={{paddingTop:'80px'}}>
      <div className="spinner"></div>
    </div>
  );

  if(!profile) return (
    <div style={{textAlign:'center',padding:'80px 20px',color:'var(--text-light)'}}>
      المستخدم غير موجود
    </div>
  );

  const imagePosts = posts.filter(p => p.image_url);

  return (
    <div className="profile-container">

      {/* ===== HEADER ===== */}
      <div className="profile-header">
        <div className="profile-top">

          {/* Avatar */}
          <div className="profile-avatar-large">
            <div className="profile-avatar-large-inner">
              {firstLetter(profile.full_name)}
            </div>
          </div>

          {/* Stats */}
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-count">{posts.length}</span>
              <span className="profile-stat-label">منشور</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-count">0</span>
              <span className="profile-stat-label">متابع</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-count">0</span>
              <span className="profile-stat-label">يتابع</span>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="profile-name">{profile.full_name}</div>
        <div style={{fontSize:'13px',color:'var(--text-light)',marginBottom:'4px'}}>@{profile.username}</div>
        {profile.bio && <div className="profile-bio">{profile.bio}</div>}

        {/* Follow Button */}
        <button
          className={`profile-follow-btn ${following ? 'following' : ''}`}
          onClick={() => setFollowing(!following)}
        >
          {following ? 'إلغاء المتابعة' : 'متابعة'}
        </button>
      </div>

      {/* ===== TABS ===== */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',background:'var(--white)'}}>
        <button
          onClick={() => setActiveTab('grid')}
          style={{
            flex:1, padding:'12px', background:'none', border:'none',
            borderBottom: activeTab==='grid' ? '2px solid var(--text)' : '2px solid transparent',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab==='grid' ? '#262626' : '#8e8e8e'}>
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            flex:1, padding:'12px', background:'none', border:'none',
            borderBottom: activeTab==='list' ? '2px solid var(--text)' : '2px solid transparent',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab==='list' ? '#262626' : '#8e8e8e'} strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ===== GRID VIEW ===== */}
      {activeTab === 'grid' && (
        <div className="profile-grid">
          {imagePosts.length === 0 ? (
            <div style={{gridColumn:'span 3',textAlign:'center',padding:'60px',color:'var(--text-light)'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dbdbdb" strokeWidth="1.5" style={{marginBottom:'12px'}}>
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              <p style={{fontSize:'14px'}}>لا توجد صور بعد</p>
            </div>
          ) : imagePosts.map(post => (
            <div key={post.id} className="profile-grid-item">
              <img src={post.image_url} alt="" />
            </div>
          ))}
        </div>
      )}

      {/* ===== LIST VIEW ===== */}
      {activeTab === 'list' && (
        <div>
          {posts.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-light)'}}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dbdbdb" strokeWidth="1.5" style={{marginBottom:'12px'}}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <p style={{fontSize:'14px'}}>لا توجد منشورات بعد</p>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-avatar">
                  <div className="post-avatar-inner">{firstLetter(profile.full_name)}</div>
                </div>
                <div className="post-user-info">
                  <div className="post-username">{profile.username}</div>
                  <div className="post-time">{new Date(post.created_at).toLocaleDateString('ar')}</div>
                </div>
              </div>
              {post.image_url && <img src={post.image_url} alt="post" className="post-image" />}
              {post.video_url && <video src={post.video_url} controls className="post-video" />}
              {post.content && <div className="post-content-text">{post.content}</div>}
              <div className="post-actions">
                <button>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
                <button>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </button>
                <button className="save-btn">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                  </svg>
                </button>
              </div>
              {Number(post.likes_count) > 0 && (
                <div className="post-likes">{post.likes_count} إعجاب</div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default Profile;

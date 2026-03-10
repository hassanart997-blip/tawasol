import React, { useState, useEffect } from 'react';

function Feed({ api, user }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/posts').then(r => setPosts(r.data)).catch(console.error);
  }, []);

  const addPost = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/posts', { content });
      setPosts([res.data, ...posts]);
      setContent('');
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : '؟';

  return (
    <div className="feed-container">
      {/* ستوريات */}
      <div className="stories-container">
        <div className="story-item">
          <div className="story-add">+</div>
          <span className="story-name">قصتك</span>
        </div>
        {['أصدقاء', 'عائلة', 'زملاء'].map((name, i) => (
          <div className="story-item" key={i}>
            <div className="story-ring">
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'linear-gradient(45deg,#405DE6,#E1306C)',border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'20px'}}>
                {name.charAt(0)}
              </div>
            </div>
            <span className="story-name">{name}</span>
          </div>
        ))}
      </div>

      {/* إنشاء منشور */}
      <div className="create-post">
        <div className="create-post-header">
          <div className="create-post-avatar">{firstLetter(user?.full_name)}</div>
          <span style={{color:'#8e8e8e',fontSize:'15px'}}>ما الذي يدور في ذهنك؟</span>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="شاركنا ما يدور في ذهنك..."
        />
        <div className="create-post-actions">
          <div className="create-post-icons">
            <button>📷</button>
            <button>🎥</button>
            <button>😊</button>
          </div>
          <button className="post-btn" onClick={addPost} disabled={loading}>
            {loading ? 'جاري النشر...' : 'نشر'}
          </button>
        </div>
      </div>

      {/* المنشورات */}
      {posts.map(post => (
        <div className="post-card" key={post.id}>
          <div className="post-header">
            <div className="post-avatar">{firstLetter(post.full_name)}</div>
            <div className="post-author">
              <strong>{post.full_name || post.username}</strong>
              <span>{new Date(post.created_at).toLocaleDateString('ar')}</span>
            </div>
          </div>
          <div className="post-body">
            <p>{post.content}</p>
          </div>
          <div className="post-stats">
            <span>❤️ {post.likes_count || 0} إعجاب</span>
            <span>💬 {post.comments_count || 0} تعليق</span>
          </div>
          <div className="post-actions">
            <button>❤️ إعجاب</button>
            <button>💬 تعليق</button>
            <button>↗️ مشاركة</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Feed;

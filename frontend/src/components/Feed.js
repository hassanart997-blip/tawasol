import React, { useState, useEffect } from 'react';

function Feed({ api, user }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [newComment, setNewComment] = useState({});

  const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : '؟';

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch(e) { console.error(e); }
  };

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

  const likePost = async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`);
      loadPosts();
    } catch(e) { console.error(e); }
  };

  const loadComments = async (postId) => {
    try {
      const res = await api.get(`/posts/${postId}/comments`);
      setComments(prev => ({ ...prev, [postId]: res.data }));
      setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    } catch(e) { console.error(e); }
  };

  const addComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    try {
      await api.post(`/posts/${postId}/comments`, { content: newComment[postId] });
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      loadComments(postId);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="feed-container">
      <div className="stories-container">
        <div className="story-item">
          <div className="story-add">+</div>
          <span className="story-name">قصتك</span>
        </div>
      </div>

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
            <button onClick={() => likePost(post.id)}>❤️ إعجاب</button>
            <button onClick={() => loadComments(post.id)}>💬 تعليق</button>
            <button>↗️ مشاركة</button>
          </div>

          {showComments[post.id] && (
            <div style={{padding:'10px 15px',borderTop:'1px solid #eee'}}>
              {(comments[post.id] || []).map(c => (
                <div key={c.id} style={{padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
                  <strong style={{fontSize:'13px'}}>{c.username}: </strong>
                  <span style={{fontSize:'14px'}}>{c.content}</span>
                </div>
              ))}
              <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                <input
                  type="text"
                  placeholder="اكتب تعليقاً..."
                  value={newComment[post.id] || ''}
                  onChange={e => setNewComment(prev => ({...prev, [post.id]: e.target.value}))}
                  onKeyPress={e => e.key === 'Enter' && addComment(post.id)}
                  style={{flex:1,padding:'8px 12px',borderRadius:'20px',border:'1px solid #ddd',fontSize:'14px',fontFamily:'Tajawal'}}
                />
                <button
                  onClick={() => addComment(post.id)}
                  style={{background:'linear-gradient(45deg,#405DE6,#E1306C)',color:'white',border:'none',padding:'8px 16px',borderRadius:'20px',cursor:'pointer',fontFamily:'Tajawal'}}
                >
                  إرسال
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Feed;

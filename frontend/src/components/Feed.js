import React, { useState, useEffect } from 'react';

function Feed({ api, user }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/posts').then(r => setPosts(r.data)).catch(console.error);
  }, []);

  const addPost = async () => {
    if (!content) return;
    setLoading(true);
    try {
      const res = await api.post('/posts', { content });
      setPosts([res.data, ...posts]);
      setContent('');
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="feed-container">
      <div className="create-post">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="شاركنا ما يدور في ذهنك..."
        />
        <button onClick={addPost} disabled={loading}>
          {loading ? 'جاري النشر...' : 'نشر'}
        </button>
      </div>
      {posts.map(post => (
        <div className="post-card" key={post.id}>
          <div className="post-header">
            <div>
              <strong>{post.full_name || post.username}</strong>
              <p style={{fontSize:'12px', color:'#888'}}>{new Date(post.created_at).toLocaleDateString('ar')}</p>
            </div>
          </div>
          <p>{post.content}</p>
          <div className="post-actions">
            <button>❤️ {post.likes_count || 0}</button>
            <button>💬 {post.comments_count || 0}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Feed;

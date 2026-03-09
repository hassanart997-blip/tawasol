import React, { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || '';

function Feed({ token }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(`${API}/api/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setPosts);
  }, [token]);

  const addPost = async () => {
    if (!content) return;
    const res = await fetch(`${API}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content })
    });
    const post = await res.json();
    setPosts([post, ...posts]);
    setContent('');
  };

  return (
    <div>
      <div>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="شاركنا ما يدور في ذهنك..." />
        <button onClick={addPost}>نشر</button>
      </div>
      {posts.map(post => (
        <div key={post.id}>
          <strong>{post.full_name || post.username}</strong>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  );
}

export default Feed;

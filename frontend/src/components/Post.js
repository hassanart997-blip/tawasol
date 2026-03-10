import React, { useState } from 'react';
import Comments from './Comments';

function Post({ post, api, user }) {
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);

  const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : '؟';

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `${Math.floor(diff/60)} دقيقة`;
    if (diff < 86400) return `${Math.floor(diff/3600)} ساعة`;
    return `${Math.floor(diff/86400)} يوم`;
  };

  const handleLike = async () => {
    try {
      await api.post(`/posts/${post.id}/like`);
      setLiked(!liked);
      setLikesCount(prev => liked ? prev - 1 : prev + 1);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-avatar">{firstLetter(post.full_name)}</div>
        <div className="post-author">
          <strong>{post.full_name || post.username}</strong>
          <span>{timeAgo(post.created_at)}</span>
        </div>
      </div>

      {post.content && (
        <div className="post-body">
          <p>{post.content}</p>
        </div>
      )}

      {post.image_url && (
        <img src={post.image_url} alt="منشور" className="post-image" />
      )}

      <div className="post-stats">
        <span>❤️ {likesCount} إعجاب</span>
        <span>💬 {post.comments_count || 0} تعليق</span>
      </div>

      <div className="post-actions">
        <button onClick={handleLike} className={liked ? 'liked' : ''}>
          {liked ? '❤️' : '🤍'} إعجاب
        </button>
        <button onClick={() => setShowComments(!showComments)}>
          💬 تعليق
        </button>
        <button>↗️ مشاركة</button>
      </div>

      {showComments && <Comments postId={post.id} api={api} user={user} />}
    </div>
  );
}

export default Post;

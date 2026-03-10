import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [storyReply, setStoryReply] = useState('');
  const [reels, setReels] = useState([]);
  const [explorePosts, setExplorePosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const fileRef = useRef();

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';
  const timeAgo = date => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if(diff<60) return 'الآن';
    if(diff<3600) return `${Math.floor(diff/60)} دقيقة`;
    if(diff<86400) return `${Math.floor(diff/3600)} ساعة`;
    return `${Math.floor(diff/86400)} يوم`;
  };

  useEffect(() => {
    loadPosts(); loadStories(); loadReels(); loadExplore(); loadNotifications();
  }, []);

  useEffect(() => {
    if(searchQuery.trim()==='') return setSearchResults([]);
    const timer = setTimeout(async () => {
      try { const res = await api.get(`/posts/search?q=${searchQuery}`); setSearchResults(res.data); }
      catch(e){ console.error(e); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPosts = async () => { try { const res = await api.get('/posts'); setPosts(res.data); } catch(e){ console.error(e); } };
  const loadStories = async () => { try { const res = await api.get('/posts/stories'); setStories(res.data); } catch(e){ console.error(e); } };
  const loadReels = async () => { try { const res = await api.get('/posts/reels'); setReels(res.data); } catch(e){ console.error(e); } };
  const loadExplore = async () => { try { const res = await api.get('/posts/explore'); setExplorePosts(res.data); } catch(e){ console.error(e); } };
  const loadNotifications = async () => { try { const res = await api.get('/posts/notifications'); setNotifications(res.data); } catch(e){ console.error(e); } };

  const uploadFile = async file => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/posts/upload', formData, { headers:{ 'Content-Type':'multipart/form-data' } });
    return res.data.url;
  };

  const handleImageChange = e => {
    const file = e.target.files[0];
    if(!file) return;
    setImage(file); setImagePreview(URL.createObjectURL(file));
  };

  const addPost = async () => {
    if(!content.trim() && !image) return;
    setLoading(true);
    try {
      let image_url = null;
      if(image) image_url = await uploadFile(image);
      const res = await api.post('/posts', { content, image_url });
      setPosts([res.data, ...posts]);
      setContent(''); setImage(null); setImagePreview(null);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const likePost = async postId => { try { await api.post(`/posts/${postId}/like`); loadPosts(); } catch(e){ console.error(e); } };
  const viewStory = story => { setActiveStory(story); setShowStoryModal(true); };
  const replyStory = async () => {
    if(!storyReply.trim()) return;
    try { await api.post(`/posts/stories/${activeStory.id}/reply`, { content: storyReply }); setStoryReply(''); alert('تم إرسال الرد!'); }
    catch(e){ console.error(e); }
  };

  return (
    <div className="feed-container">

      <div className="search-bar">
        <input type="text" placeholder="🔍 ابحث عن مستخدمين..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
        {searchResults.length>0 && <div className="search-results">
          {searchResults.map(u=>(
            <div key={u.id} className="search-user">
              <div className="avatar">{firstLetter(u.full_name)}</div>
              <div>
                <strong>{u.full_name}</strong>
                <div className="username">@{u.username}</div>
              </div>
            </div>
          ))}
        </div>}
      </div>

      <div className="notifications">
        <button onClick={()=>setShowNotifications(!showNotifications)}>
          🔔 الإشعارات {notifications.length>0 && `(${notifications.length})`}
        </button>
        {showNotifications && <div className="notifications-list">
          {notifications.map(n=><div key={n.id}>{n.content}</div>)}
        </div>}
      </div>

      <div className="stories-container">
        <div className="story-item story-add"><div>+</div><span>قصتك</span></div>
        {stories.map(story=>(
          <div key={story.id} className="story-item" onClick={()=>viewStory(story)}>
            <div className="story-ring">{story.profile_picture?<img src={story.profile_picture} alt={story.full_name}/>:<div>{firstLetter(story.full_name)}</div>}</div>
            <span>{story.full_name}</span>
          </div>
        ))}
      </div>

      <div className="create-post">
        <div className="create-post-header">
          <div className="create-post-avatar">{firstLetter(user?.full_name)}</div>
          <span>ما الذي يدور في ذهنك؟</span>
        </div>
        <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="شاركنا ما يدور في ذهنك..." />
        {imagePreview && <div className="image-preview">
          <img src={imagePreview} alt="Preview" />
          <button onClick={()=>{setImage(null);setImagePreview(null)}}>✕</button>
        </div>}
        <div className="create-post-actions">
          <button onClick={()=>fileRef.current.click()}>📷</button>
          <input type="file" ref={fileRef} style={{display:'none'}} onChange={handleImageChange} />
          <button className="post-btn" onClick={addPost} disabled={loading}>{loading?'جاري النشر...':'نشر'}</button>
        </div>
      </div>

      {posts.map(post=>(
        <div className="post-card" key={post.id}>
          <div className="post-header">
            <div className="post-avatar">{firstLetter(post.full_name)}</div>
            <div className="post-author"><strong>{post.full_name||post.username}</strong><span>{timeAgo(post.created_at)}</span></div>
          </div>
          {post.content && <div className="post-body">{post.content}</div>}
          {post.image_url && <img src={post.image_url} alt="Post" className="post-image"/>}
          <div className="post-actions">
            <button onClick={()=>likePost(post.id)}>{post.liked?'❤️':'🤍'} إعجاب</button>
          </div>
        </div>
      ))}

      <h3>🎬 ريلز</h3>
      {reels.map(r=><div key={r.id}><video src={r.video_url} controls autoPlay muted/></div>)}

      <h3>📸 استكشاف</h3>
      <div className="explore-grid">{explorePosts.map(p=><img key={p.id} src={p.image_url} alt="Explore"/>)}</div>

      {showStoryModal && activeStory && (
        <div className="story-modal" onClick={()=>setShowStoryModal(false)}>
          <img src={activeStory.image_url} alt="Story" />
          <div><strong>{activeStory.full_name}</strong></div>
          <div className="story-reply" onClick={e=>e.stopPropagation()}>
            <input type="text" placeholder="رد على الستوري..." value={storyReply} onChange={e=>setStoryReply(e.target.value)} />
            <button onClick={replyStory}>إرسال</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Feed;

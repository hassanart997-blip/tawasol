import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../api';

const icons = {
  home: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active?"#0095f6":"none"} stroke={active?"#0095f6":"#000"} strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  ),
  friends: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active?"#0095f6":"none"} stroke={active?"#0095f6":"#000"} strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  add: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  chat: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active?"#0095f6":"none"} stroke={active?"#0095f6":"#000"} strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  profile: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active?"#0095f6":"none"} stroke={active?"#0095f6":"#000"} strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  like: (liked) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={liked?"#ed4956":"none"} stroke={liked?"#ed4956":"#000"} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  comment: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  save: (saved) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={saved?"#000":"none"} stroke="#000" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
    </svg>
  )
};

function Feed() {
  const { user, posts, setPosts, addPost: ctxAddPost, likePost: ctxLikePost } = useApp();
  const [content,setContent] = useState('');
  const [image,setImage] = useState(null);
  const [imagePreview,setImagePreview] = useState(null);
  const [loading,setLoading] = useState(false);
  const [stories,setStories] = useState([]);
  const [activeStory,setActiveStory] = useState(null);
  const [storyReply,setStoryReply] = useState('');
  const [reels,setReels] = useState([]);
  const [showModalPost,setShowModalPost] = useState(false);
  const [menuOpen,setMenuOpen] = useState(null);
  const [editPost,setEditPost] = useState(null);
  const [editContent,setEditContent] = useState('');
  const [saved,setSaved] = useState({});
  const [activeNav,setActiveNav] = useState('feed');
  const fileRef = useRef();
  const navigate = useNavigate();

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';
  const timeAgo = date => { const diff = Math.floor((new Date()-new Date(date))/1000); if(diff<60)return'الآن';if(diff<3600)return `${Math.floor(diff/60)} دقيقة`; if(diff<86400)return `${Math.floor(diff/3600)} ساعة`; return `${Math.floor(diff/86400)} يوم`; };

  useEffect(()=>{
    api.get('/posts').then(r=>setPosts(r.data)).catch(console.error);
    api.get('/posts/stories').then(r=>setStories(r.data)).catch(console.error);
    api.get('/posts/reels').then(r=>setReels(r.data)).catch(console.error);
  },[]);

  const handleImageChange = e => { const file = e.target.files[0]; if(!file) return; setImage(file); setImagePreview(URL.createObjectURL(file)); };
  const handleAddPost = async ()=>{ if(!content.trim() && !image) return; setLoading(true); const result=await ctxAddPost({content,image}); if(result){setContent('');setImage(null);setImagePreview(null);setShowModalPost(false);} setLoading(false); };
  const handleLike = id=>ctxLikePost(id);
  const deletePost = async id=>{if(!window.confirm('هل تريد حذف المنشور؟')) return; try{await api.delete(`/posts/${id}`); setPosts(prev=>prev.filter(p=>p.id!==id));}catch(e){console.error(e);} setMenuOpen(null);};
  const saveEdit = async id=>{try{const res=await api.put(`/posts/${id}`,{content:editContent}); setPosts(prev=>prev.map(p=>p.id===id?{...p,content:res.data.content}:p)); setEditPost(null);}catch(e){console.error(e);}};
  const toggleSave=id=>setSaved(prev=>({...prev,[id]:!prev[id]}));
  const viewStory=story=>{setActiveStory(story);setShowModalPost(true);};
  const replyStory=async()=>{if(!storyReply.trim())return; try{await api.post(`/posts/stories/${activeStory.id}/reply`,{content:storyReply}); setStoryReply(''); alert('تم إرسال الرد!');}catch(e){console.error(e);}};
  const handleNavClick=nav=>{setActiveNav(nav); if(nav==='feed')navigate('/feed'); if(nav==='friends')navigate('/friends'); if(nav==='chat')navigate('/chat'); if(nav==='profile')navigate(`/profile/${user.id}`);};

  return (
    <div style={{paddingTop:'60px',paddingBottom:'70px',maxWidth:'470px',margin:'auto'}}>

      {/* Stories */}
      <div style={{display:'flex',overflowX:'auto',gap:'10px',padding:'12px 0'}}>
        <div onClick={()=>setShowModalPost(true)} style={{minWidth:'60px',textAlign:'center',cursor:'pointer'}}>
          <div style={{width:'60px',height:'60px',borderRadius:'50%',background:'#ccc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px'}}>+</div>
          <div style={{fontSize:'12px'}}>قصتك</div>
        </div>
        {stories.map(story=>(
          <div key={story.id} onClick={()=>viewStory(story)} style={{minWidth:'60px',textAlign:'center',cursor:'pointer'}}>
            <div style={{width:'60px',height:'60px',borderRadius:'50%',border:'2px solid #0095f6',overflow:'hidden'}}>
              {story.profile_picture?<img src={story.profile_picture} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>{firstLetter(story.full_name)}</div>}
            </div>
            <div style={{fontSize:'12px'}}>{story.full_name}</div>
          </div>
        ))}
      </div>

      {/* Posts */}
      {posts.map(post=>(
        <div key={post.id} className="post-card" style={{marginBottom:'12px',background:'#fff',borderRadius:'12px',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',padding:'8px 12px',justifyContent:'space-between'}}>
            <Link to={`/profile/${post.user_id}`} style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',color:'inherit'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'#ccc',display:'flex',alignItems:'center',justifyContent:'center'}}>{firstLetter(post.full_name)}</div>
              <div style={{display:'flex',flexDirection:'column'}}>
                <span>{post.username}</span>
                <span style={{fontSize:'12px',color:'#8e8e8e'}}>{timeAgo(post.created_at)}</span>
              </div>
            </Link>
          </div>
          {post.image_url && <img src={post.image_url} style={{width:'100%',maxHeight:'300px',objectFit:'cover'}}/>}
          {post.video_url && <video src={post.video_url} controls style={{width:'100%',maxHeight:'300px'}}/>}
          <div style={{display:'flex',gap:'12px',padding:'8px 12px'}}>
            <button onClick={()=>handleLike(post.id)}>{icons.like(post.liked)}</button>
            <button>{icons.comment()}</button>
            <button onClick={()=>toggleSave(post.id)}>{icons.save(saved[post.id])}</button>
          </div>
          {editPost===post.id?(<div style={{padding:'0 12px 12px',display:'flex',gap:'8px'}}><input value={editContent} onChange={e=>setEditContent(e.target.value)} style={{flex:1}}/><button onClick={()=>saveEdit(post.id)}>حفظ</button><button onClick={()=>setEditPost(null)}>إلغاء</button></div>):(post.content && <div style={{padding:'0 12px 12px'}}><strong>{post.username}</strong> {post.content}</div>)}
        </div>
      ))}

      {/* Bottom Nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,height:'60px',background:'#fff',borderTop:'1px solid #dbdbdb',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:1000}}>
        <button onClick={()=>handleNavClick('feed')}>{icons.home(activeNav==='feed')}</button>
        <button onClick={()=>handleNavClick('friends')}>{icons.friends(activeNav==='friends')}</button>
        <button onClick={()=>setShowModalPost(true)} style={{background:'#0095f6',color:'#fff',borderRadius:'50%',width:'50px',height:'50px',fontSize:'24px',marginTop:'-20px'}}>{icons.add()}</button>
        <button onClick={()=>handleNavClick('chat')}>{icons.chat(activeNav==='chat')}</button>
        <button onClick={()=>handleNavClick('profile')}>{icons.profile(activeNav==='profile')}</button>
      </div>
    </div>
  );
}

export default Feed;

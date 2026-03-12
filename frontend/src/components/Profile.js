import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

function Profile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [myId, setMyId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('grid');
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [editPost, setEditPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [stories, setStories] = useState([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showAddStory, setShowAddStory] = useState(false);
  const [storyPreview, setStoryPreview] = useState(null);
  const [storyFile, setStoryFile] = useState(null);
  const storyFileRef = useRef();

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';
  const timeAgo = date => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if(diff<60) return 'الآن';
    if(diff<3600) return `${Math.floor(diff/60)} دقيقة`;
    if(diff<86400) return `${Math.floor(diff/3600)} ساعة`;
    return `${Math.floor(diff/86400)} يوم`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await api.get('/profile');
        setMyId(meRes.data.id);
        const profileRes = await api.get(`/users/${userId}`);
        setProfile(profileRes.data);
        setFollowing(profileRes.data.is_following);
        setEditName(profileRes.data.full_name || '');
        setEditBio(profileRes.data.bio || '');
        const postsRes = await api.get('/posts');
        setPosts(postsRes.data.filter(p => p.user_id === parseInt(userId)));
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  useEffect(() => {
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const toggleFollow = async () => {
    try {
      const res = await api.post(`/users/${userId}/follow`);
      setFollowing(res.data.following);
      setProfile(prev => ({
        ...prev,
        followers_count: Number(prev.followers_count) + (res.data.following ? 1 : -1)
      }));
    } catch(e) { console.error(e); }
  };

  const loadFollowers = async () => {
    try {
      const res = await api.get(`/users/${userId}/followers`);
      setFollowersList(res.data);
      setShowFollowers(true);
    } catch(e) { setFollowersList([]); setShowFollowers(true); }
  };

  const loadFollowing = async () => {
    try {
      const res = await api.get(`/users/${userId}/following`);
      setFollowingList(res.data);
      setShowFollowing(true);
    } catch(e) { setFollowingList([]); setShowFollowing(true); }
  };

  const saveProfile = async () => {
    setEditLoading(true);
    try {
      const res = await api.put('/profile', { full_name: editName, bio: editBio, profile_picture: profile.profile_picture });
      setProfile(prev => ({ ...prev, full_name: res.data.full_name, bio: res.data.bio }));
      setShowEditProfile(false);
    } catch(e) { console.error(e); }
    setEditLoading(false);
  };

  const deletePost = async id => {
    if(!window.confirm('هل تريد حذف المنشور؟')) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch(e) { console.error(e); }
    setMenuOpen(null);
  };

  const startEdit = post => {
    setEditPost(post.id);
    setEditContent(post.content || '');
    setMenuOpen(null);
  };

  const saveEdit = async id => {
    try {
      const res = await api.put(`/posts/${id}`, { content: editContent });
      setPosts(prev => prev.map(p => p.id===id ? {...p, content: res.data.content} : p));
      setEditPost(null);
    } catch(e) { console.error(e); }
  };

  const handleStoryFile = e => {
    const file = e.target.files[0];
    if(!file) return;
    setStoryFile(file);
    setStoryPreview(URL.createObjectURL(file));
    setShowAddStory(true);
  };

  const uploadStory = async () => {
    if(!storyFile) return;
    try {
      const fd = new FormData();
      fd.append('file', storyFile);
      const r = await api.post('/posts/upload', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setStories(prev => [...prev, { id: Date.now(), image_url: r.data.url }]);
      setShowAddStory(false);
      setStoryPreview(null);
      setStoryFile(null);
    } catch(e) { console.error(e); }
  };

  if(loading) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
      <div className="spinner"></div>
    </div>
  );

  if(!profile) return (
    <div style={{textAlign:'center',padding:'80px 20px',color:'#8e8e8e'}}>
      المستخدم غير موجود
    </div>
  );

  const imagePosts = posts.filter(p => p.image_url);
  const isMe = myId === parseInt(userId);

  return (
    <div style={{paddingTop:'60px',paddingBottom:'60px',background:'#fafafa',minHeight:'100vh'}}>

      {/* MODAL: تعديل البروفايل */}
      {showEditProfile && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'#fff',borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'400px'}}>
            <h3 style={{margin:'0 0 20px',fontSize:'16px',fontWeight:'700',textAlign:'center'}}>تعديل الملف الشخصي</h3>
            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'12px',color:'#8e8e8e',display:'block',marginBottom:'6px'}}>الاسم الكامل</label>
              <input value={editName} onChange={e=>setEditName(e.target.value)} style={{width:'100%',border:'1px solid #dbdbdb',borderRadius:'8px',padding:'10px',fontSize:'14px',boxSizing:'border-box',direction:'rtl'}} />
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{fontSize:'12px',color:'#8e8e8e',display:'block',marginBottom:'6px'}}>البايو</label>
              <textarea value={editBio} onChange={e=>setEditBio(e.target.value)} rows="3" placeholder="اكتب نبذة عنك..." style={{width:'100%',border:'1px solid #dbdbdb',borderRadius:'8px',padding:'10px',fontSize:'14px',resize:'none',boxSizing:'border-box',direction:'rtl'}} />
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>setShowEditProfile(false)} style={{flex:1,padding:'10px',border:'1px solid #dbdbdb',borderRadius:'8px',background:'#fff',cursor:'pointer',fontSize:'14px'}}>إلغاء</button>
              <button onClick={saveProfile} disabled={editLoading} style={{flex:1,padding:'10px',border:'none',borderRadius:'8px',background:'#0095f6',color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>{editLoading?'جاري...':'حفظ'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Story Viewer */}
      {showStoryViewer && stories.length > 0 && (
        <div style={{position:'fixed',inset:0,background:'#000',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowStoryViewer(false)}>
          <img src={stories[0].image_url} alt="story" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} />
          <button style={{position:'absolute',top:'20px',right:'20px',background:'none',border:'none',color:'#fff',fontSize:'28px',cursor:'pointer'}} onClick={()=>setShowStoryViewer(false)}>✕</button>
        </div>
      )}

      {/* MODAL: إضافة Story */}
      {showAddStory && storyPreview && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'#fff',borderRadius:'16px',padding:'20px',width:'100%',maxWidth:'360px',textAlign:'center'}}>
            <h3 style={{margin:'0 0 16px',fontSize:'16px'}}>معاينة الستوري</h3>
            <img src={storyPreview} alt="preview" style={{width:'100%',borderRadius:'12px',marginBottom:'16px',maxHeight:'300px',objectFit:'cover'}} />
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{setShowAddStory(false);setStoryPreview(null);setStoryFile(null);}} style={{flex:1,padding:'10px',border:'1px solid #dbdbdb',borderRadius:'8px',background:'#fff',cursor:'pointer'}}>إلغاء</button>
              <button onClick={uploadStory} style={{flex:1,padding:'10px',border:'none',borderRadius:'8px',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366)',color:'#fff',cursor:'pointer',fontWeight:'600'}}>نشر</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: المتابعون */}
      {showFollowers && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',width:'100%',maxHeight:'70vh',overflow:'auto',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{margin:0,fontSize:'16px'}}>المتابعون</h3>
              <button onClick={()=>setShowFollowers(false)} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer'}}>✕</button>
            </div>
            {followersList.length === 0 ? <p style={{textAlign:'center',color:'#8e8e8e',padding:'20px'}}>لا يوجد متابعون بعد</p>
            : followersList.map(u => (
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid #f0f0f0'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',padding:'2px',flexShrink:0}}>
                  <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'16px'}}>{firstLetter(u.full_name)}</div>
                </div>
                <div>
                  <div style={{fontWeight:'600',fontSize:'14px'}}>{u.username}</div>
                  <div style={{fontSize:'12px',color:'#8e8e8e'}}>{u.full_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: يتابع */}
      {showFollowing && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',width:'100%',maxHeight:'70vh',overflow:'auto',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{margin:0,fontSize:'16px'}}>يتابع</h3>
              <button onClick={()=>setShowFollowing(false)} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer'}}>✕</button>
            </div>
            {followingList.length === 0 ? <p style={{textAlign:'center',color:'#8e8e8e',padding:'20px'}}>لا يتابع أحداً بعد</p>
            : followingList.map(u => (
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid #f0f0f0'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',padding:'2px',flexShrink:0}}>
                  <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'16px'}}>{firstLetter(u.full_name)}</div>
                </div>
                <div>
                  <div style={{fontWeight:'600',fontSize:'14px'}}>{u.username}</div>
                  <div style={{fontSize:'12px',color:'#8e8e8e'}}>{u.full_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="profile-header">
        <div className="profile-top">
          <div style={{position:'relative'}}>
            <div
              className="profile-avatar-large"
              onClick={() => stories.length > 0 && setShowStoryViewer(true)}
              style={{cursor:stories.length>0?'pointer':'default',border:stories.length>0?'3px solid #e1306c':'none'}}
            >
              <div className="profile-avatar-large-inner">{firstLetter(profile.full_name)}</div>
            </div>
            {isMe && (
              <>
                <input type="file" ref={storyFileRef} onChange={handleStoryFile} style={{display:'none'}} accept="image/*" />
                <button onClick={()=>storyFileRef.current.click()} style={{position:'absolute',bottom:0,right:0,width:'24px',height:'24px',borderRadius:'50%',background:'#0095f6',border:'2px solid #fff',color:'#fff',fontSize:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>+</button>
              </>
            )}
          </div>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-count">{profile.posts_count || posts.length}</span>
              <span className="profile-stat-label">منشور</span>
            </div>
            <div className="profile-stat" onClick={loadFollowers} style={{cursor:'pointer'}}>
              <span className="profile-stat-count">{profile.followers_count || 0}</span>
              <span className="profile-stat-label">متابع</span>
            </div>
            <div className="profile-stat" onClick={loadFollowing} style={{cursor:'pointer'}}>
              <span className="profile-stat-count">{profile.following_count || 0}</span>
              <span className="profile-stat-label">يتابع</span>
            </div>
          </div>
        </div>

        <div className="profile-name">{profile.full_name}</div>
        <div style={{fontSize:'13px',color:'#8e8e8e',marginBottom:'4px'}}>@{profile.username}</div>
        {profile.bio && <div className="profile-bio">{profile.bio}</div>}

        <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
          {!isMe ? (
            <>
              <button onClick={toggleFollow} style={{flex:1,padding:'8px',border:'none',borderRadius:'8px',background:following?'#efefef':'#0095f6',color:following?'#262626':'#fff',fontWeight:'600',fontSize:'14px',cursor:'pointer'}}>{following?'إلغاء المتابعة':'متابعة'}</button>
              <button style={{flex:1,padding:'8px',border:'1px solid #dbdbdb',borderRadius:'8px',background:'#fff',fontWeight:'600',fontSize:'14px',cursor:'pointer'}}>رسالة</button>
            </>
          ) : (
            <button onClick={()=>setShowEditProfile(true)} style={{flex:1,padding:'8px',border:'1px solid #dbdbdb',borderRadius:'8px',background:'#fff',fontWeight:'600',fontSize:'14px',cursor:'pointer'}}>تعديل الملف الشخصي</button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex',borderBottom:'1px solid #dbdbdb',background:'#fff'}}>
        <button onClick={()=>setActiveTab('grid')} style={{flex:1,padding:'12px',background:'none',border:'none',borderBottom:activeTab==='grid'?'2px solid #262626':'2px solid transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab==='grid'?'#262626':'#8e8e8e'}>
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>
        <button onClick={()=>setActiveTab('list')} style={{flex:1,padding:'12px',background:'none',border:'none',borderBottom:activeTab==='list'?'2px solid #262626':'2px solid transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab==='list'?'#262626':'#8e8e8e'} strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* GRID */}
      {activeTab === 'grid' && (
        <div className="profile-grid">
          {imagePosts.length === 0 ? (
            <div style={{gridColumn:'span 3',textAlign:'center',padding:'60px',color:'#8e8e8e'}}>
              <p style={{fontSize:'14px'}}>لا توجد صور بعد</p>
            </div>
          ) : imagePosts.map(post => (
            <div key={post.id} className="profile-grid-item">
              <img src={post.image_url} alt="" />
            </div>
          ))}
        </div>
      )}

      {/* LIST */}
      {activeTab === 'list' && (
        <div>
          {posts.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'#8e8e8e'}}>
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
                  <div className="post-time">{timeAgo(post.created_at)}</div>
                </div>
                {isMe && (
                  <div style={{position:'relative'}}>
                    <button className="post-more" onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===post.id?null:post.id);}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                    </button>
                    {menuOpen === post.id && (
                      <div style={{position:'absolute',right:0,top:'30px',background:'#fff',borderRadius:'12px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)',zIndex:100,minWidth:'140px',overflow:'hidden'}}>
                        <button onClick={e=>{e.stopPropagation();startEdit(post);}} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'right',cursor:'pointer',fontSize:'14px',color:'#262626'}}>✏️ تعديل</button>
                        <button onClick={e=>{e.stopPropagation();deletePost(post.id);}} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'right',cursor:'pointer',fontSize:'14px',color:'#ed4956'}}>🗑️ حذف</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {post.image_url && <img src={post.image_url} alt="post" className="post-image" />}
              {post.video_url && <video src={post.video_url} controls className="post-video" />}
              {editPost === post.id ? (
                <div style={{padding:'0 12px 12px',display:'flex',gap:'8px'}}>
                  <input value={editContent} onChange={e=>setEditContent(e.target.value)} style={{flex:1,border:'1px solid #dbdbdb',borderRadius:'8px',padding:'8px',fontSize:'14px',direction:'rtl'}} />
                  <button onClick={()=>saveEdit(post.id)} style={{background:'#0095f6',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',fontSize:'13px'}}>حفظ</button>
                  <button onClick={()=>setEditPost(null)} style={{background:'#efefef',border:'none',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',fontSize:'13px'}}>إلغاء</button>
                </div>
              ) : (
                post.content && <div className="post-caption"><strong>{profile.username}</strong> {post.content}</div>
              )}
              {Number(post.likes_count) > 0 && <div className="post-likes">{post.likes_count} إعجاب</div>}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default Profile;

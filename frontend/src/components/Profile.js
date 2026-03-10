import React, { useState, useEffect } from 'react';

function Profile({ api, user }) {
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const userId = window.location.pathname.split('/').pop();
    const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : '؟';

    useEffect(() => {
        loadProfile();
    }, [userId]);

    const loadProfile = async () => {
        try {
            const res = await api.get('/profile');
            setProfile(res.data);
            const postsRes = await api.get('/posts');
            setPosts(postsRes.data.filter(p => p.user_id === parseInt(userId)));
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">جاري التحميل...</div>;
    if (!profile) return <div style={{textAlign:'center',padding:'40px'}}>المستخدم غير موجود</div>;

    return (
        <div className="profile-container">
            <div className="cover-placeholder"></div>

            <div className="profile-info">
                <div className="profile-avatar">{firstLetter(profile.full_name)}</div>
                <div className="profile-details">
                    <h2>{profile.full_name}</h2>
                    <p>@{profile.username}</p>
                    {profile.bio && <p style={{marginTop:'5px',color:'#262626'}}>{profile.bio}</p>}
                    <p style={{fontSize:'13px',color:'#8e8e8e',marginTop:'4px'}}>{profile.email}</p>
                </div>
            </div>

            <div style={{padding:'20px',maxWidth:'700px',margin:'0 auto'}}>
                <h3 style={{marginBottom:'15px',fontSize:'18px',fontWeight:'700'}}>
                    المنشورات ({posts.length})
                </h3>
                {posts.length === 0 ? (
                    <div style={{textAlign:'center',padding:'40px',color:'#8e8e8e'}}>
                        <div style={{fontSize:'48px',marginBottom:'10px'}}>📝</div>
                        <p>لا توجد منشورات بعد</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <div className="post-card" key={post.id}>
                            <div className="post-header">
                                <div className="post-avatar">{firstLetter(profile.full_name)}</div>
                                <div className="post-author">
                                    <strong>{profile.full_name}</strong>
                                    <span>{new Date(post.created_at).toLocaleDateString('ar')}</span>
                                </div>
                            </div>
                            <div className="post-body">
                                <p>{post.content}</p>
                            </div>
                            <div className="post-stats">
                                <span>❤️ {post.likes_count || 0}</span>
                                <span>💬 {post.comments_count || 0}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Profile;

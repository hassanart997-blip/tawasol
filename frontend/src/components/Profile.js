import React, { useState, useEffect } from 'react';

function Profile({ api, user, socket }) {
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [friendStatus, setFriendStatus] = useState(null);

    const userId = window.location.pathname.split('/').pop();

    useEffect(() => {
        loadProfile();
        loadUserPosts();
    }, [userId]);

    const loadProfile = async () => {
        try {
            const response = await api.get(`/users/${userId}`);
            setProfile(response.data.user);
            setFriendStatus(response.data.friendStatus);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserPosts = async () => {
        try {
            const response = await api.get(`/users/${userId}/posts`);
            setPosts(response.data);
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    };

    const handleFriendAction = async () => {
        try {
            if (friendStatus === null) {
                await api.post(`/friends/request/${userId}`);
                setFriendStatus('pending');
            } else if (friendStatus === 'accepted') {
                await api.delete(`/friends/${userId}`);
                setFriendStatus(null);
            }
        } catch (error) {
            console.error('Error friend action:', error);
        }
    };

    const getFriendButtonText = () => {
        if (friendStatus === 'accepted') return '✓ صديق';
        if (friendStatus === 'pending') return 'تم الإرسال';
        return '+ إضافة صديق';
    };

    if (loading) return <div className="loading">جاري التحميل...</div>;
    if (!profile) return <div>المستخدم غير موجود</div>;

    return (
        <div className="profile-container">
            {/* غلاف الملف الشخصي */}
            <div className="profile-cover">
                <img
                    src={profile.cover_photo || '/default-cover.png'}
                    alt="غلاف"
                    className="cover-photo"
                />
            </div>

            {/* معلومات المستخدم */}
            <div className="profile-info">
                <img
                    src={profile.profile_picture || '/default-avatar.png'}
                    alt={profile.full_name}
                    className="profile-avatar"
                />
                <div className="profile-details">
                    <h2>{profile.full_name}
                        {profile.is_verified && <span className="verified">✓</span>}
                    </h2>
                    <span>@{profile.username}</span>
                    {profile.bio && <p>{profile.bio}</p>}
                </div>

                {parseInt(userId) !== user.id && (
                    <div className="profile-actions">
                        <button
                            onClick={handleFriendAction}
                            className={friendStatus === 'accepted' ? 'btn-friend' : 'btn-add'}
                        >
                            {getFriendButtonText()}
                        </button>
                        <a href={`/chat?user=${userId}`}>
                            <button className="btn-message">💬 رسالة</button>
                        </a>
                    </div>
                )}
            </div>

            {/* منشورات المستخدم */}
            <div className="profile-posts">
                <h3>المنشورات</h3>
                {posts.length === 0 ? (
                    <p>لا توجد منشورات بعد</p>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="post-card">
                            <div className="post-content">
                                <p>{post.content}</p>
                                {post.media_url && (
                                    post.type === 'image' ? (
                                        <img src={post.media_url} alt="مرفق" />
                                    ) : (
                                        <video src={post.media_url} controls />
                                    )
                                )}
                            </div>
                            <div className="post-stats">
                                <span>{post.likes_count} إعجاب</span>
                                <span>{post.comments_count} تعليق</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Profile;

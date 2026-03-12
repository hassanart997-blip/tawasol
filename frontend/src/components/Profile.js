يعني هذا import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import "./Profile.css";

function Profile() {
const { userId } = useParams();
const navigate = useNavigate();

// حالات الملف الشخصي
const [profile, setProfile] = useState(null);
const [myId, setMyId] = useState(null);
const [posts, setPosts] = useState([]);
const [stories, setStories] = useState([]);
const [loading, setLoading] = useState(true);
const [following, setFollowing] = useState(false);
const [activeTab, setActiveTab] = useState("grid");

// حالات المتابعين
const [followersList, setFollowersList] = useState([]);
const [followingList, setFollowingList] = useState([]);
const [showFollowers, setShowFollowers] = useState(false);
const [showFollowing, setShowFollowing] = useState(false);

// حالات تعديل الملف الشخصي
const [showEditProfile, setShowEditProfile] = useState(false);
const [editName, setEditName] = useState("");
const [editBio, setEditBio] = useState("");
const [editProfilePic, setEditProfilePic] = useState(null);
const [editProfilePicPreview, setEditProfilePicPreview] = useState(null);
const [editLoading, setEditLoading] = useState(false);

// حالات المنشورات
const [menuOpen, setMenuOpen] = useState(null);
const [editPost, setEditPost] = useState(null);
const [editContent, setEditContent] = useState("");

// حالات القصص
const [showStoryViewer, setShowStoryViewer] = useState(false);
const [showAddStory, setShowAddStory] = useState(false);
const [storyPreview, setStoryPreview] = useState(null);
const [storyFile, setStoryFile] = useState(null);
const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

// حالات الإعجابات
const [likedPosts, setLikedPosts] = useState({});

// حالات الإشعارات
const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

// المراجع
const storyFileRef = useRef();
const profilePicRef = useRef();
const storyTimerRef = useRef(null);

// دوال المساعدة
const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : "?";

const timeAgo = (date) => {
if (!date) return "";
const diff = Math.floor((new Date() - new Date(date)) / 1000);

if (diff < 60) return "الآن";
if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
if (diff < 2592000) return `${Math.floor(diff / 86400)} يوم`;
return `${Math.floor(diff / 2592000)} شهر`;
};

// دالة عرض الإشعارات
const showNotification = (message, type = "success") => {
setNotification({ show: true, message, type });
setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 3000);
};

// تحميل البيانات
useEffect(() => {
loadProfile();
}, [userId]);

const loadProfile = async () => {
try {
setLoading(true);

const me = await api.get("/profile");
setMyId(me.data.id);

const res = await api.get(`/users/${userId}`);
setProfile(res.data);
setFollowing(res.data.is_following || false);
setEditName(res.data.full_name || "");
setEditBio(res.data.bio || "");

const postsRes = await api.get("/posts");
const userPosts = postsRes.data.filter(
(p) => p.user_id === Number(userId)
);
setPosts(userPosts);

const likes = {};
userPosts.forEach((p) => {
likes[p.id] = p.is_liked || false;
});
setLikedPosts(likes);

try {
const storyRes = await api.get(`/stories/${userId}`);
setStories(storyRes.data || []);
} catch {
setStories([]);
}
} catch (err) {
console.error(err);
showNotification("حدث خطأ في تحميل البيانات", "error");
} finally {
setLoading(false);
}
};

useEffect(() => {
const close = () => setMenuOpen(null);
document.addEventListener("click", close);
return () => document.removeEventListener("click", close);
}, []);

// تنظيف المؤقت عند إغلاق القصص
useEffect(() => {
return () => {
if (storyTimerRef.current) {
clearTimeout(storyTimerRef.current);
}
};
}, []);

// متابعة/إلغاء متابعة
const toggleFollow = async () => {
try {
const res = await api.post(`/users/${userId}/follow`);
setFollowing(res.data.following);
setProfile((p) => ({
...p,
followers_count:
Number(p.followers_count || 0) +
(res.data.following ? 1 : -1),
}));
showNotification(res.data.following ? "تمت المتابعة" : "تم إلغاء المتابعة");
} catch (e) {
console.log(e);
showNotification("حدث خطأ", "error");
}
};

// تحميل المتابعين
const loadFollowers = async () => {
try {
const res = await api.get(`/users/${userId}/followers`);
setFollowersList(res.data || []);
setShowFollowers(true);
} catch {
setFollowersList([]);
setShowFollowers(true);
}
};

const loadFollowing = async () => {
try {
const res = await api.get(`/users/${userId}/following`);
setFollowingList(res.data || []);
setShowFollowing(true);
} catch {
setFollowingList([]);
setShowFollowing(true);
}
};

// حفظ تعديلات الملف الشخصي
const saveProfile = async () => {
if (!editName.trim()) {
showNotification("الاسم لا يمكن أن يكون فارغاً", "error");
return;
}

setEditLoading(true);
try {
const formData = new FormData();
formData.append("full_name", editName);
formData.append("bio", editBio);
if (editProfilePic) {
formData.append("profile_picture", editProfilePic);
}

const res = await api.put("/profile", formData, {
headers: { "Content-Type": "multipart/form-data" }
});

setProfile(prev => ({
...prev,
full_name: res.data.full_name,
bio: res.data.bio,
profile_picture: res.data.profile_picture || prev.profile_picture
}));

setShowEditProfile(false);
setEditProfilePic(null);
setEditProfilePicPreview(null);
showNotification("تم تحديث الملف الشخصي");
} catch (e) {
console.log(e);
showNotification("حدث خطأ في التحديث", "error");
} finally {
setEditLoading(false);
}
};

// تغيير صورة الملف الشخصي
const handleProfilePicChange = (e) => {
const file = e.target.files[0];
if (!file) return;

if (file.size > 5 * 1024 * 1024) {
showNotification("حجم الصورة كبير جداً (5 ميجابايت كحد أقصى)", "error");
return;
}

if (!file.type.startsWith("image/")) {
showNotification("يرجى اختيار صورة", "error");
return;
}

setEditProfilePic(file);
setEditProfilePicPreview(URL.createObjectURL(file));
};

// الإعجاب بالمنشورات
const likePost = async (id) => {
try {
const res = await api.post(`/posts/${id}/like`);
setLikedPosts((p) => ({
...p,
[id]: res.data.liked,
}));
setPosts((prev) =>
prev.map((p) =>
p.id === id
? {
...p,
likes_count:
(p.likes_count || 0) +
(res.data.liked ? 1 : -1),
}
: p
)
);
} catch (e) {
console.log(e);
}
};

// حذف المنشور
const deletePost = async (id) => {
if (!window.confirm("هل أنت متأكد من حذف المنشور؟")) return;
try {
await api.delete(`/posts/${id}`);
setPosts((p) => p.filter((post) => post.id !== id));
showNotification("تم حذف المنشور");
} catch (e) {
console.log(e);
showNotification("حدث خطأ في الحذف", "error");
}
};

// تعديل المنشور
const startEdit = (post) => {
setEditPost(post.id);
setEditContent(post.content || "");
setMenuOpen(null);
};

const saveEdit = async (id) => {
try {
const res = await api.put(`/posts/${id}`, {
content: editContent,
});
setPosts((prev) =>
prev.map((p) =>
p.id === id ? { ...p, content: res.data.content } : p
)
);
setEditPost(null);
showNotification("تم تحديث المنشور");
} catch (e) {
console.log(e);
showNotification("حدث خطأ في التحديث", "error");
}
};

// القصص
const handleStoryFile = (e) => {
const file = e.target.files[0];
if (!file) return;

if (file.size > 10 * 1024 * 1024) {
showNotification("حجم الملف كبير جداً (10 ميجابايت كحد أقصى)", "error");
return;
}

if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
showNotification("يرجى اختيار صورة أو فيديو", "error");
return;
}

setStoryFile(file);
setStoryPreview(URL.createObjectURL(file));
setShowAddStory(true);
};

const uploadStory = async () => {
if (!storyFile) return;

try {
const fd = new FormData();
fd.append("file", storyFile);

const res = await api.post("/stories/upload", fd, {
headers: { "Content-Type": "multipart/form-data" }
});

setStories(prev => [...prev, {
id: res.data.id || Date.now(),
media_url: res.data.url,
type: storyFile.type.startsWith("video/") ? "video" : "image",
created_at: new Date().toISOString()
}]);

setShowAddStory(false);
setStoryPreview(null);
setStoryFile(null);
showNotification("تم نشر القصة");
} catch (e) {
console.log(e);
showNotification("حدث خطأ في نشر القصة", "error");
}
};

// عرض القصص
const openStoryViewer = (index) => {
setCurrentStoryIndex(index);
setShowStoryViewer(true);

if (stories[index]?.type === "image") {
storyTimerRef.current = setTimeout(() => {
nextStory();
}, 5000);
}
};

const nextStory = () => {
if (currentStoryIndex < stories.length - 1) {
setCurrentStoryIndex(prev => prev + 1);
} else {
setShowStoryViewer(false);
}
};

const prevStory = () => {
if (currentStoryIndex > 0) {
setCurrentStoryIndex(prev => prev - 1);
}
};

// مشاركة المنشور
const sharePost = (post) => {
if (navigator.share) {
navigator.share({
title: `منشور من ${profile.username}`,
text: post.content || "",
url: window.location.href + "?post=" + post.id
}).catch(console.error);
} else {
navigator.clipboard.writeText(window.location.href + "?post=" + post.id);
showNotification("تم نسخ الرابط");
}
};

if (loading) {
return (
<div className="loading-container">
<div className="spinner"></div>
<p>جاري التحميل...</p>
</div>
);
}

if (!profile) {
return (
<div className="error-container">
<h2>المستخدم غير موجود</h2>
<button onClick={() => navigate(-1)}>العودة</button>
</div>
);
}

const isMe = Number(userId) === myId;

return (
<div className="profile-container">

{/* الإشعارات */}
{notification.show && (
<div className={`notification ${notification.type}`}>
{notification.message}
</div>
)}

{/* نافذة تعديل الملف الشخصي */}
{showEditProfile && (
<div className="modal">
<div className="modal-content">
<h3>تعديل الملف الشخصي</h3>

<div className="profile-pic-edit">
<div className="edit-avatar">
{editProfilePicPreview ? (
<img src={editProfilePicPreview} alt="Preview" />
) : profile.profile_picture ? (
<img src={profile.profile_picture} alt={profile.full_name} />
) : (
<div className="avatar-placeholder large">
{firstLetter(profile.full_name)}
</div>
)}
<button
className="change-photo-btn"
onClick={() => profilePicRef.current?.click()}
>
+
</button>
<input
type="file"
ref={profilePicRef}
onChange={handleProfilePicChange}
accept="image/*"
style={{ display: "none" }}
/>
</div>
</div>

<div className="form-group">
<label>الاسم الكامل</label>
<input
type="text"
value={editName}
onChange={(e) => setEditName(e.target.value)}
placeholder="الاسم الكامل"
/>
</div>

<div className="form-group">
<label>نبذة عني</label>
<textarea
value={editBio}
onChange={(e) => setEditBio(e.target.value)}
placeholder="اكتب نبذة عن نفسك..."
rows="4"
/>
</div>

<div className="modal-actions">
<button onClick={saveProfile} disabled={editLoading} className="save-btn">
{editLoading ? "جاري الحفظ..." : "حفظ"}
</button>
<button onClick={() => {
setShowEditProfile(false);
setEditProfilePic(null);
setEditProfilePicPreview(null);
}} className="cancel-btn">
إلغاء
</button>
</div>
</div>
</div>
)}

{/* نافذة المتابعين */}
{showFollowers && (
<div className="modal">
<div className="modal-content users-modal">
<div className="modal-header">
<h3>المتابعون</h3>
<button onClick={() => setShowFollowers(false)}>✕</button>
</div>
<div className="users-list">
{followersList.length === 0 ? (
<p className="empty-list">لا يوجد متابعون بعد</p>
) : (
followersList.map(u => (
<div key={u.id} className="user-item" onClick={() => navigate(`/profile/${u.id}`)}>
<div className="user-avatar">
{u.profile_picture ? (
<img src={u.profile_picture} alt={u.full_name} />
) : (
<div className="avatar-placeholder small">
{firstLetter(u.full_name)}
</div>
)}
</div>
<div className="user-info">
<strong>{u.full_name}</strong>
<span>@{u.username}</span>
</div>
</div>
))
)}
</div>
</div>
</div>
)}

{/* نافذة يتابع */}
{showFollowing && (
<div className="modal">
<div className="modal-content users-modal">
<div className="modal-header">
<h3>يتابع</h3>
<button onClick={() => setShowFollowing(false)}>✕</button>
</div>
<div className="users-list">
{followingList.length === 0 ? (
<p className="empty-list">لا يتابع أحداً بعد</p>
) : (
followingList.map(u => (
<div key={u.id} className="user-item" onClick={() => navigate(`/profile/${u.id}`)}>
<div className="user-avatar">
{u.profile_picture ? (
<img src={u.profile_picture} alt={u.full_name} />
) : (
<div className="avatar-placeholder small">
{firstLetter(u.full_name)}
</div>
)}
</div>
<div className="user-info">
<strong>{u.full_name}</strong>
<span>@{u.username}</span>
</div>
</div>
))
)}
</div>
</div>
</div>
)}

{/* نافذة إضافة قصة */}
{showAddStory && storyPreview && (
<div className="modal">
<div className="modal-content story-preview-modal">
<h3>معاينة القصة</h3>
{storyFile?.type.startsWith("video/") ? (
<video src={storyPreview} controls className="story-preview-media" />
) : (
<img src={storyPreview} alt="Preview" className="story-preview-media" />
)}
<div className="modal-actions">
<button onClick={uploadStory} className="save-btn">نشر</button>
<button onClick={() => {
setShowAddStory(false);
setStoryPreview(null);
setStoryFile(null);
}} className="cancel-btn">إلغاء</button>
</div>
</div>
</div>
)}

{/* عارض القصص */}
{showStoryViewer && stories.length > 0 && (
<div className="story-viewer">
<div className="story-progress">
{stories.map((_, i) => (
<div
key={i}
className={`progress-bar ${i === currentStoryIndex ? "active" : i < currentStoryIndex ? "watched" : ""}`}
/>
))}
</div>

<button className="close-viewer" onClick={() => setShowStoryViewer(false)}>✕</button>

{currentStoryIndex > 0 && (
<button className="nav-btn prev" onClick={(e) => { e.stopPropagation(); prevStory(); }}>‹</button>
)}

<div className="story-content" onClick={() => nextStory()}>
{stories[currentStoryIndex]?.type === "video" ? (
<video
src={stories[currentStoryIndex].media_url}
controls
autoPlay
className="story-media"
/>
) : (
<img
src={stories[currentStoryIndex]?.media_url}
alt="story"
className="story-media"
/>
)}
</div>

{currentStoryIndex < stories.length - 1 && (
<button className="nav-btn next" onClick={(e) => { e.stopPropagation(); nextStory(); }}>›</button>
)}
</div>
)}

{/* رأس الملف الشخصي */}
<div className="profile-header">
<div className="profile-top">
<div className="profile-avatar-wrapper">
<div
className={`profile-avatar ${stories.length > 0 ? "has-story" : ""}`}
onClick={() => stories.length > 0 && openStoryViewer(0)}
>
{profile.profile_picture ? (
<img src={profile.profile_picture} alt={profile.full_name} />
) : (
<div className="avatar-placeholder">
{firstLetter(profile.full_name)}
</div>
)}
</div>

{isMe && (
<>
<input
type="file"
ref={storyFileRef}
onChange={handleStoryFile}
accept="image/*,video/*"
style={{ display: "none" }}
/>
<button
className="add-story-btn"
onClick={() => storyFileRef.current?.click()}
>
+
</button>
</>
)}
</div>

<div className="profile-info">
<h2>{profile.full_name}</h2>
<div className="username">@{profile.username}</div>
{profile.bio && <p className="bio">{profile.bio}</p>}
</div>

<div className="stats">
<div className="stat-item">
<span className="stat-number">{profile.posts_count || posts.length}</span>
<span className="stat-label">منشورات</span>
</div>

<div className="stat-item" onClick={loadFollowers}>
<span className="stat-number">{profile.followers_count || 0}</span>
<span className="stat-label">متابعون</span>
</div>

<div className="stat-item" onClick={loadFollowing}>
<span className="stat-number">{profile.following_count || 0}</span>
<span className="stat-label">يتابع</span>
</div>
</div>

<div className="profile-actions">
{isMe ? (
<button onClick={() => setShowEditProfile(true)} className="edit-profile-btn">
تعديل الملف الشخصي
</button>
) : (
<button
onClick={toggleFollow}
className={`follow-btn ${following ? "following" : ""}`}
>
{following ? "إلغاء المتابعة" : "متابعة"}
</button>
)}
</div>
</div>
</div>

{/* القصص المصغرة */}
{stories.length > 0 && (
<div className="stories-row">
{stories.map((story, index) => (
<div
key={story.id}
className="story-thumbnail"
onClick={() => openStoryViewer(index)}
>
<div className="story-circle">
{story.type === "video" && <div className="video-icon">▶</div>}
<img src={story.media_url} alt="story" />
</div>
</div>
))}
</div>
)}

{/* التبويبات */}
<div className="tabs">
<button
className={`tab ${activeTab === "grid" ? "active" : ""}`}
onClick={() => setActiveTab("grid")}
>
<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
<rect x="3" y="3" width="7" height="7" rx="1"/>
<rect x="14" y="3" width="7" height="7" rx="1"/>
<rect x="3" y="14" width="7" height="7" rx="1"/>
<rect x="14" y="14" width="7" height="7" rx="1"/>
</svg>
</button>

<button
className={`tab ${activeTab === "list" ? "active" : ""}`}
onClick={() => setActiveTab("list")}
>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
<line x1="3" y1="6" x2="21" y2="6"/>
<line x1="3" y1="12" x2="21" y2="12"/>
<line x1="3" y1="18" x2="21" y2="18"/>
</svg>
</button>
</div>

{/* عرض الشبكة */}
{activeTab === "grid" && (
<div className="posts-grid">
{posts.filter(p => p.image_url).length === 0 ? (
<div className="empty-state">
<p>لا توجد منشورات بعد</p>
</div>
) : (
posts
.filter(p => p.image_url)
.map(post => (
<div key={post.id} className="grid-item">
<img src={post.image_url} alt="" />
</div>
))
)}
</div>
)}

{/* عرض القائمة */}
{activeTab === "list" && (
<div className="posts-list">
{posts.length === 0 ? (
<div className="empty-state">
<p>لا توجد منشورات بعد</p>
</div>
) : (
posts.map(post => (
<div key={post.id} className="post-card">

<div className="post-header">
<div className="post-user">
<div className="post-avatar">
{profile.profile_picture ? (
<img src={profile.profile_picture} alt={profile.full_name} />
) : (
<div className="avatar-placeholder small">
{firstLetter(profile.full_name)}
</div>
)}
</div>
<div>
<div className="post-username">{profile.username}</div>
<div className="post-time">{timeAgo(post.created_at)}</div>
</div>
</div>

{isMe && (
<div className="post-menu">
<button
className="menu-btn"
onClick={(e) => {
e.stopPropagation();
setMenuOpen(menuOpen === post.id ? null : post.id);
}}
>
⋮
</button>

{menuOpen === post.id && (
<div className="post-menu-dropdown">
<button onClick={() => startEdit(post)}>✏️ تعديل</button>
<button onClick={() => deletePost(post.id)} className="delete">🗑️ حذف</button>
</div>
)}
</div>
)}
</div>

{post.image_url && (
<img src={post.image_url} alt="post" className="post-media" />
)}

{post.video_url && (
<video src={post.video_url} controls className="post-media" />
)}

{editPost === post.id ? (
<div className="edit-post-form">
<textarea
value={editContent}
onChange={(e) => setEditContent(e.target.value)}
placeholder="عدل المنشور..."
rows="3"
/>
<div className="edit-actions">
<button onClick={() => saveEdit(post.id)} className="save">حفظ</button>
<button onClick={() => setEditPost(null)} className="cancel">إلغاء</button>
</div>
</div>
) : (
post.content && (
<div className="post-caption">
<strong>{profile.username}</strong> {post.content}
</div>
)
)}

<div className="post-footer">
<button
className={`like-btn ${likedPosts[post.id] ? "liked" : ""}`}
onClick={() => likePost(post.id)}
>
{likedPosts[post.id] ? "❤️" : "🤍"} {post.likes_count || 0}
</button>

<button className="share-btn" onClick={() => sharePost(post)}>
📤 مشاركة
</button>
</div>

</div>
))
)}
</div>
)}

</div>
);
}

export default Profile;

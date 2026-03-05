import React, { useState, useEffect } from 'react';

function Friends({ api, user }) {
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadFriends();
        loadRequests();
    }, []);

    const loadFriends = async () => {
        try {
            const response = await api.get('/friends');
            setFriends(response.data);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    };

    const loadRequests = async () => {
        try {
            const response = await api.get('/friends/requests');
            setRequests(response.data);
        } catch (error) {
            console.error('Error loading requests:', error);
        }
    };

    const handleSearch = async () => {
        if (!search.trim()) return;
        setLoading(true);
        try {
            const response = await api.get(`/users/search?q=${search}`);
            setSearchResults(response.data);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendRequest = async (userId) => {
        try {
            await api.post(`/friends/request/${userId}`);
            setSearchResults(prev => prev.map(u =>
                u.id === userId ? { ...u, request_sent: true } : u
            ));
        } catch (error) {
            console.error('Error sending request:', error);
        }
    };

    const acceptRequest = async (friendshipId) => {
        try {
            await api.post(`/friends/accept/${friendshipId}`);
            loadFriends();
            loadRequests();
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    return (
        <div className="friends-container">
            <h2>الأصدقاء</h2>

            {/* البحث عن أصدقاء */}
            <div className="search-section">
                <h3>ابحث عن أصدقاء</h3>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="ابحث باسم المستخدم..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={loading}>
                        {loading ? '...' : 'بحث'}
                    </button>
                </div>

                <div className="search-results">
                    {searchResults.map(u => (
                        <div key={u.id} className="user-card">
                            <img
                                src={u.profile_picture || '/default-avatar.png'}
                                alt={u.full_name}
                                className="avatar"
                            />
                            <div className="user-info">
                                <h4>{u.full_name}</h4>
                                <span>@{u.username}</span>
                            </div>
                            {u.id !== user.id && (
                                <button
                                    onClick={() => sendRequest(u.id)}
                                    disabled={u.request_sent}
                                >
                                    {u.request_sent ? 'تم الإرسال' : 'إضافة صديق'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* طلبات الصداقة */}
            {requests.length > 0 && (
                <div className="requests-section">
                    <h3>طلبات الصداقة ({requests.length})</h3>
                    {requests.map(req => (
                        <div key={req.id} className="user-card">
                            <img
                                src={req.profile_picture || '/default-avatar.png'}
                                alt={req.full_name}
                                className="avatar"
                            />
                            <div className="user-info">
                                <h4>{req.full_name}</h4>
                                <span>@{req.username}</span>
                            </div>
                            <button onClick={() => acceptRequest(req.friendship_id)}>
                                قبول
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* قائمة الأصدقاء */}
            <div className="friends-list">
                <h3>أصدقائي ({friends.length})</h3>
                {friends.length === 0 ? (
                    <p>لا يوجد أصدقاء بعد</p>
                ) : (
                    friends.map(friend => (
                        <div key={friend.id} className="user-card">
                            <img
                                src={friend.profile_picture || '/default-avatar.png'}
                                alt={friend.full_name}
                                className="avatar"
                            />
                            <div className="user-info">
                                <h4>{friend.full_name}</h4>
                                <span>@{friend.username}</span>
                            </div>
                            <a href={`/profile/${friend.id}`}>
                                <button>عرض الملف</button>
                            </a>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Friends;

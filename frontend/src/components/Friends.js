import React, { useState, useEffect } from 'react';

function Friends({ api, user }) {
    const [friends, setFriends] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : '؟';

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const response = await api.get('/friends');
            setFriends(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSearch = async () => {
        if (!search.trim()) return;
        setLoading(true);
        try {
            const response = await api.get('/users');
            setSearchResults(response.data.filter(u =>
                u.full_name?.includes(search) || u.username?.includes(search)
            ));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const sendRequest = async (userId) => {
        try {
            await api.post('/friends/request', { friend_id: userId });
            setSearchResults(prev => prev.map(u =>
                u.id === userId ? { ...u, request_sent: true } : u
            ));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="friends-container">
            <h2 className="friends-header">👥 الأصدقاء</h2>

            <div className="search-bar">
                <input
                    type="text"
                    placeholder="ابحث عن أصدقاء..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} disabled={loading}>
                    {loading ? '...' : '🔍 بحث'}
                </button>
            </div>

            {searchResults.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                    <h3 style={{marginBottom:'10px',color:'#8e8e8e',fontSize:'14px'}}>نتائج البحث</h3>
                    {searchResults.map(u => (
                        <div key={u.id} className="user-card">
                            <div className="user-avatar">{firstLetter(u.full_name)}</div>
                            <div className="user-info">
                                <strong>{u.full_name}</strong>
                                <span>@{u.username}</span>
                            </div>
                            {u.id !== user.id && (
                                <button
                                    onClick={() => sendRequest(u.id)}
                                    disabled={u.request_sent}
                                    style={{opacity: u.request_sent ? 0.6 : 1}}
                                >
                                    {u.request_sent ? '✓ تم الإرسال' : '+ إضافة'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <h3 style={{marginBottom:'10px',color:'#8e8e8e',fontSize:'14px'}}>
                أصدقائي ({friends.length})
            </h3>
            {friends.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px',color:'#8e8e8e'}}>
                    <div style={{fontSize:'48px',marginBottom:'10px'}}>👥</div>
                    <p>لا يوجد أصدقاء بعد</p>
                    <p style={{fontSize:'13px'}}>ابحث عن أصدقاء وأضفهم!</p>
                </div>
            ) : (
                friends.map(friend => (
                    <div key={friend.id} className="user-card">
                        <div className="user-avatar">{firstLetter(friend.full_name)}</div>
                        <div className="user-info">
                            <strong>{friend.full_name}</strong>
                            <span>@{friend.username}</span>
                        </div>
                        <a href={`/profile/${friend.id}`}>
                            <button>عرض الملف</button>
                        </a>
                    </div>
                ))
            )}
        </div>
    );
}

export default Friends;

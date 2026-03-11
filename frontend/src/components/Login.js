import React, { useState } from 'react';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await onLogin(email, password);
    if(!result.success) setError(result.error);
    setLoading(false);
  };

  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>تواصل</h2>
        <p style={{textAlign:'center',color:'#8e8e8e',fontSize:'14px',marginBottom:'16px'}}>سجل دخولك للمتابعة</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div className="password-field">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="كلمة المرور"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="button" className="show-password-btn" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOffIcon/> : <EyeIcon/>}
            </button>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
          </button>
        </form>
        <p>ليس لديك حساب؟ <a href="/register">إنشاء حساب</a></p>
      </div>
    </div>
  );
}

export default Login;

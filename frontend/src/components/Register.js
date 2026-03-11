import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Register() {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) return 'الاسم الكامل مطلوب';
    if (!formData.username.trim()) return 'اسم المستخدم مطلوب';
    if (!formData.email.includes('@')) return 'البريد الإلكتروني غير صحيح';
    if (formData.password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      navigate('/feed');
    } catch(e) {
      if(!e.response) setError('مشكلة في الاتصال بالخادم');
      else setError(e.response.data?.message || 'حدث خطأ');
    }
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
        <p style={{textAlign:'center',color:'#8e8e8e',fontSize:'13px',marginBottom:'16px'}}>
          أنشئ حسابك وابدأ التواصل
        </p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="full_name"
            placeholder="الاسم الكامل"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="username"
            placeholder="اسم المستخدم"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="البريد الإلكتروني"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="كلمة المرور"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="show-password-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOffIcon/> : <EyeIcon/>}
            </button>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'جاري التحميل...' : 'إنشاء حساب'}
          </button>
        </form>
        <p>لديك حساب؟ <a href="/login">تسجيل الدخول</a></p>
      </div>
    </div>
  );
}

export default Register;

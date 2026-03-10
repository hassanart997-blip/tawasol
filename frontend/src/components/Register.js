import React, { useState } from 'react';
import api from '../api';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      window.location.href = '/feed';
    } catch(e) {
      setError(e.response?.data?.message || 'حدث خطأ');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>إنشاء حساب جديد</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="text" name="full_name" placeholder="الاسم الكامل" value={formData.full_name} onChange={handleChange} required />
          <input type="text" name="username" placeholder="اسم المستخدم" value={formData.username} onChange={handleChange} required />
          <input type="email" name="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="كلمة المرور" value={formData.password} onChange={handleChange} required />
          <button type="submit" disabled={loading}>{loading ? 'جاري التحميل...' : 'إنشاء حساب'}</button>
        </form>
        <p>لديك حساب؟ <a href="/login">تسجيل الدخول</a></p>
      </div>
    </div>
  );
}

export default Register;

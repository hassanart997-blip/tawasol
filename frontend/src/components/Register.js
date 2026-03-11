import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // تحديث البيانات عند الكتابة
  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // التحقق من صحة الفورم
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
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      setFormData({ username: '', email: '', password: '', full_name: '' });
      navigate('/feed'); // التوجيه للـ Feed بعد التسجيل
    } catch (e) {
      if (!e.response) setError('مشكلة في الاتصال بالخادم');
      else setError(e.response.data?.message || 'حدث خطأ');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>إنشاء حساب جديد</h2>
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
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'جاري التحميل...' : 'إنشاء حساب'}
          </button>
        </form>
        <p>
          لديك حساب؟ <a href="/login">تسجيل الدخول</a>
        </p>
      </div>
    </div>
  );
}

export default Register;

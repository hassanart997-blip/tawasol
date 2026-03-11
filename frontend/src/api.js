import axios from 'axios';

// تعيين Base URL حسب البيئة
const baseURL = process.env.REACT_APP_API_URL || 'https://tawasol-b3vq.vercel.app/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 ثواني كحد أقصى للطلبات
});

// إضافة JWT تلقائي من localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Logging في التطوير
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
  }
  
  return config;
}, error => Promise.reject(error));

// Response interceptor للتعامل مع الأخطاء وصلاحية التوكن
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // إذا انتهت صلاحية التوكن
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('token'); // إزالة التوكن من التخزين
      window.location.href = '/login'; // إعادة التوجيه لتسجيل الدخول
      return Promise.reject(error);
    }

    // Retry تلقائي للطلبات الفاشلة مؤقتًا (Timeout أو Network Error)
    if (!originalRequest._retry && error.code === 'ECONNABORTED') {
      originalRequest._retry = true;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;

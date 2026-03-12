import axios from 'axios';

// تحديد Base URL بذكاء
const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000/api';
  return 'https://tawasol-b3vq.vercel.app/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 ثانية
  withCredentials: false, // لا نستخدم الكوكيز، نستخدم التوكن
});

// ===== Request Interceptor =====
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 [API] ${config.method.toUpperCase()} ${config.url}`, config.params || config.data);
    }

    return config;
  },
  error => Promise.reject(error)
);

// ===== Response Interceptor =====
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // خطأ في الشبكة أو عدم وجود استجابة
    if (!error.response) {
      console.error('🌐 خطأ في الشبكة أو الخادم غير متاح');
      return Promise.reject({ ...error, userMessage: 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.' });
    }

    const { status } = error.response;

    // ===== 401: غير مصرح =====
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      window.location.replace('/login');
      return Promise.reject({ ...error, userMessage: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.' });
    }

    // ===== 403: ممنوع =====
    if (status === 403) {
      console.warn('🔒 محاولة الوصول إلى مورد غير مصرح به');
      return Promise.reject({ ...error, userMessage: 'ليس لديك صلاحية للقيام بهذا الإجراء.' });
    }

    // ===== 404: غير موجود =====
    if (status === 404) {
      console.warn('🔍 المورد المطلوب غير موجود');
      return Promise.reject({ ...error, userMessage: 'العنصر المطلوب غير موجود.' });
    }

    // ===== 422: خطأ تحقق البيانات =====
    if (status === 422) {
      const errors = error.response.data?.errors || [];
      return Promise.reject({ ...error, userMessage: errors.length ? errors.join(', ') : 'بيانات غير صالحة.' });
    }

    // ===== 500+: خطأ داخلي =====
    if (status >= 500) {
      console.error('💥 خطأ داخلي في الخادم');
      return Promise.reject({ ...error, userMessage: 'حدث خطأ في الخادم. الرجاء المحاولة لاحقاً.' });
    }

    // ===== مهلة الطلب (ECONNABORTED) =====
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn('⏱️ مهلة الطلب، إعادة المحاولة مرة واحدة...');
      return api(originalRequest);
    }

    // لأي خطأ آخر
    return Promise.reject({ ...error, userMessage: error.response?.data?.message || 'حدث خطأ غير متوقع.' });
  }
);

// ===== وظائف مساعدة إضافية =====
api.cancelTokenSource = () => axios.CancelToken.source();

api.setToken = token => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

export default api;

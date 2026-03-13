import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import api from "../api";

function Login() {

  const { login } = useApp();
  const navigate = useNavigate();

  const [form,setForm] = useState({
    email:"",
    password:""
  });

  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [showPass,setShowPass] = useState(false);


  const handleChange = (e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };


  const validateForm = ()=>{

    if(!form.email.trim()){
      return "يرجى إدخال البريد الإلكتروني";
    }

    if(!form.password.trim()){
      return "يرجى إدخال كلمة المرور";
    }

    if(form.password.length < 6){
      return "كلمة المرور قصيرة جداً";
    }

    return null;

  };


  const handleSubmit = async (e)=>{

    e.preventDefault();

    const validationError = validateForm();

    if(validationError){
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try{

      const res = await api.post("/auth/login",{
        email:form.email,
        password:form.password
      });

      const { token,user } = res.data;

      localStorage.setItem("token",token);

      login(user);

      navigate("/feed");

    }catch(err){

      const msg =
        err.response?.data?.message ||
        "تعذر تسجيل الدخول حاول مرة أخرى";

      setError(msg);

    }finally{

      setLoading(false);

    }

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

        <p className="auth-subtitle">
          سجل دخولك للمتابعة
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <input
            type="email"
            name="email"
            placeholder="البريد الإلكتروني"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />

          <div className="password-field">

            <input
              type={showPass ? "text" : "password"}
              name="password"
              placeholder="كلمة المرور"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />

            <button
              type="button"
              className="show-password-btn"
              onClick={()=>setShowPass(!showPass)}
            >
              {showPass ? <EyeOffIcon/> : <EyeIcon/>}
            </button>

          </div>


          <button
            type="submit"
            disabled={loading}
            className="login-btn"
          >
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>

        </form>


        <div className="auth-footer">

          <p>
            ليس لديك حساب؟
            <Link to="/register">
              إنشاء حساب
            </Link>
          </p>

        </div>

      </div>

    </div>

  );

}

export default Login;

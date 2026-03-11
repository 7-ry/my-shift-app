import React from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ loginPw, setLoginPw, isProcessing, setIsProcessing }) => {
  const handleSecretLogin = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    let email = '';
    let password = '';

    const viewerPw = import.meta.env.VITE_UI_VIEWER_PASS;
    const adminPw = import.meta.env.VITE_UI_PASS;

    // 1. UI入力値と環境変数の照合
    if (loginPw === adminPw) {
      email = import.meta.env.VITE_FB_ADMIN_EMAIL;
      password = import.meta.env.VITE_FB_ADMIN_PASS;
    } else if (loginPw === viewerPw) {
      email = import.meta.env.VITE_FB_VIEWER_EMAIL;
      password = import.meta.env.VITE_FB_VIEWER_PASS;
    } else {
      alert('パスコードが正しくありません。');
      setIsProcessing(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Firebase Auth Error:', error.code);
      alert(
        'システム認証エラーが発生しました。Firebaseコンソールの設定を確認してください。'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter mb-2">SAKU</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">
            Staff Only Portal
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            autoFocus
            value={loginPw}
            placeholder="ENTER PASSCODE"
            className="w-full bg-slate-800 border-none rounded-3xl py-5 px-6 text-center text-2xl font-black tracking-[0.4em] focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-700 placeholder:tracking-normal"
            onChange={(e) => setLoginPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSecretLogin();
            }}
          />
          <p className="text-center text-[10px] text-slate-600 font-black uppercase animate-pulse">
            Press Enter to Login
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

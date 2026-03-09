import React from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ loginPw, setLoginPw, isProcessing, setIsProcessing }) => {
  // 合言葉による共通ログインロジック
  const handleSecretLogin = async () => {
    // 環境変数から期待値をロード
    const targetPw = import.meta.env.VITE_UI_PASSCODE;
    const fbAdminEmail = import.meta.env.VITE_FB_ADMIN_EMAIL;
    const fbAdminPass = import.meta.env.VITE_FB_ADMIN_PASS;

    // 1. UI入力値と環境変数の照合
    if (loginPw === targetPw) {
      try {
        // 2. 照合成功時のみ、裏側でFirebaseの共通アカウントでサインイン
        await signInWithEmailAndPassword(auth, fbAdminEmail, fbAdminPass);
      } catch (error) {
        console.error('Firebase Auth Error:', error.code);
        alert(
          'システム認証エラーが発生しました。Firebaseコンソールの設定を確認してください。'
        );
      }
    } else {
      alert('ユーザー名またはパスワードが正しくありません。');
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

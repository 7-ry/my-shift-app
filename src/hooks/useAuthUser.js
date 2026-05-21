import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export const useAuthUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // 認証状態の監視（ブラウザを閉じてもログインを維持するための処理）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsReadOnly(u.email === import.meta.env.VITE_FB_VIEWER_EMAIL);
      } else {
        setUser(null);
        setIsReadOnly(false);
      }
      setLoading(false); //
    });
    return () => unsubscribe();
  }, []);

  return { user, loading, isReadOnly };
};

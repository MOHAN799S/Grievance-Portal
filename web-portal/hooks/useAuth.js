import { useState, useEffect, useCallback } from "react";
import { checkAuth, logout as logoutFn } from "@/lib/auth";

export function useAuth() {
  const [state, setState] = useState({
    isSignedIn: false,
    role:       null,   // "citizen" | "admin" | null
    user:       null,
    loading:    true,
  });

  const verify = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const result = await checkAuth();
    setState({
      isSignedIn: result.isSignedIn,
      role:       result.role  || null,
      user:       result.user  || null,
      loading:    false,
    });
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const logout = async () => {
    await logoutFn();
    setState({ isSignedIn: false, role: null, user: null, loading: false });
  };

  return { ...state, refetch: verify, logout };
}
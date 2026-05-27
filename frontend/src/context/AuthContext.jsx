// Global authentication state.
//
// Status is a single discriminated field: "loading" | "authenticated" | "unauthenticated". 
// Form-level concerns (submit-in-flight, field errors) stay local to LoginForm / RegisterForm  (not in global state).
//
// On mount we synchronously check localStorage for a token. No token -> we
// transition straight to "unauthenticated". Token present -> call /api/auth/me to confirm
// it is still valid; the backend re-fetches the user from the DB on every
// requireAuth request, so a demoted or deleted user loses access immediately.
//
// The axios response interceptor fires `auth:expired` event
// when an authenticated request comes back 401. Listens here and completes LOGOUT,
// routing user back to AuthScreen (but only when react next renders)

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from "react";
import {
  TOKEN_KEY,
  loginRequest,
  registerRequest,
  logoutRequest,
  getMe,
} from "../services/api";

// --- Reducer ---

const initialState = {
  status: "loading", // "loading" | "authenticated" | "unauthenticated"
  user: null,
  token: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "HYDRATE_SUCCESS":
    case "LOGIN_SUCCESS":
      return {
        status: "authenticated",
        user: action.payload.user,
        token: action.payload.token,
      };

    case "HYDRATE_FAILURE":
    case "LOGOUT":
      return { status: "unauthenticated", user: null, token: null };

    default:
      return state;
  }
}

// --- Context ---

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate from localStorage on mount. The `getMe()` call uses the axios
  // request interceptor to attach the bearer token, so we don't need to pass it explicitly.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      dispatch({ type: "HYDRATE_FAILURE" });
      return;
    }

    getMe()
      .then((user) => {
        dispatch({ type: "HYDRATE_SUCCESS", payload: { user, token } });
      })
      .catch(() => {
        // The interceptor will already have cleared the token and fired
        // `auth:expired` on a 401. Non-401 errors also resolve to a 
        // usable unauthenticated state rather then permanent spinner
        localStorage.removeItem(TOKEN_KEY);
        dispatch({ type: "HYDRATE_FAILURE" });
      });
  }, []);

  // Listen for session expiry coming from the axios response interceptor.
  // The event is fired only when there was a token in storage at the time
  // of a 401, so login failures don't trigger it.
  useEffect(() => {
    const handler = () => dispatch({ type: "LOGOUT" });
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        dispatch({ type: "LOGOUT" });
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // --- Auth actions ---

  // login / register both throw on failure so the calling form can read
  // err.response?.data?.error and surface the backend's specific message.

  const login = useCallback(async (username, password) => {
    const { token, user } = await loginRequest(username, password);
    localStorage.setItem(TOKEN_KEY, token);
    dispatch({ type: "LOGIN_SUCCESS", payload: { user, token } });
  }, []);

  const register = useCallback(async (username, password) => {
    const { token, user } = await registerRequest(username, password);
    localStorage.setItem(TOKEN_KEY, token);
    dispatch({ type: "LOGIN_SUCCESS", payload: { user, token } });
  }, []);

  const logout = useCallback(async () => {
    // Fire the server-side logout but do not block on it: if the backend is
    // unreachable or the token is already invalid, the user should still be able to logout
    try {
      await logoutRequest();
    } catch {
      /* ignore (local logout proceeds regardless) */
    }
    localStorage.removeItem(TOKEN_KEY);
    dispatch({ type: "LOGOUT" });
  }, []);

  const value = {
    status: state.status,
    user: state.user,
    token: state.token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- Hook ---

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // A failure when someone forgets to wrap a tree in <AuthProvider>.
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

import { supabase } from "@/lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate as useNavigateRouter } from "react-router-dom";
//import { BrowserRouter } from "react-router-dom";

type UserProfile = any;

const useNavigate = useNavigateRouter;
interface AppContextType {
  user: User | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getUserDetails: (session: Session) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  BACKEND_URL: string;
  userProfile: UserProfile | null;
}

interface AppContextProviderProps {
  children?: ReactNode;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
export const AppContextProvider = ({ children }: AppContextProviderProps) => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  const configureSessionUserData = (currentSession: Session | null) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
  };

  useEffect(() => {
    let isInitialized = false;
    const handleSession = async (session: Session | null) => {
      if (!session) {
        navigate("/login");
        return;
      }
      configureSessionUserData(session);
      if (!isInitialized) {
        isInitialized = true;
        await getUserDetails(session);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      handleSession(data?.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const signup = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password }); 

    if (error) throw error;
    configureSessionUserData(data.session);
    navigate("/");
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    configureSessionUserData(data.session);
    navigate("/");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    configureSessionUserData(null);
  };

  const getUserDetails = async (session: any) => {
    if (!session) {
      navigate("/login");
      return;
    }

    const token = session.access_token;

    configureSessionUserData(session);

    try {
      const httpResponse = await fetch(`${BACKEND_URL}/api/user-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      if (!httpResponse.ok) throw new Error("Something went wrong");

      const responseData = await httpResponse.json();
      setUserProfile(responseData?.data);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
    }
  };
  // const navigate = useNavigate()

  return (
    <AppContext.Provider
      value={{
        user,
        session,
        setUser,
        setSession,
        login,
        logout,
        getUserDetails,
        signup,
        BACKEND_URL,
        userProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useAppContext must be used within AppContextProvider");
  return context;
};
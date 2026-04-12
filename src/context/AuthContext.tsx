import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

type Perfil = "admin" | "agenda";

type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  perfil: Perfil;
  ativo: boolean;
};

type AuthContextType = {
  loading: boolean;
  user: any | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function carregarProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, perfil, ativo")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Erro ao carregar profile:", error);
      setProfile(null);
      return;
    }

    setProfile(data as Profile);
  }

  async function refreshProfile() {
    const {
      data: { user: currentUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !currentUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(currentUser);
    await carregarProfile(currentUser.id);
  }

  async function iniciar() {
    setLoading(true);

    const {
      data: { user: currentUser },
      error,
    } = await supabase.auth.getUser();

    if (!error && currentUser) {
      setUser(currentUser);
      await carregarProfile(currentUser.id);
    } else {
      setUser(null);
      setProfile(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    iniciar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await iniciar();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = useMemo(
    () => ({
      loading,
      user,
      profile,
      signOut,
      refreshProfile,
    }),
    [loading, user, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
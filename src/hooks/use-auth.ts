import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  perfil: { id: string; nome: string; email: string; empresa_id: string | null } | null;
  loading: boolean;
}

export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    roles: [],
    perfil: null,
    loading: true,
  });

  const loadExtras = async (userId: string) => {
    const [rolesRes, perfilRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("perfis_usuarios").select("id, nome, email, empresa_id").eq("id", userId).maybeSingle(),
    ]);
    return {
      roles: (rolesRes.data ?? []).map((r) => r.role as AppRole),
      perfil: perfilRes.data ?? null,
    };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        setTimeout(async () => {
          const extras = await loadExtras(session.user.id);
          setState({ session, user: session.user, ...extras, loading: false });
        }, 0);
      } else {
        setState({ session: null, user: null, roles: [], perfil: null, loading: false });
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const extras = await loadExtras(session.user.id);
        setState({ session, user: session.user, ...extras, loading: false });
      } else {
        setState({ session: null, user: null, roles: [], perfil: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (state.user) {
      const extras = await loadExtras(state.user.id);
      setState((s) => ({ ...s, ...extras }));
    }
  };

  return {
    ...state,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    hasRole: (r) => state.roles.includes(r),
    refresh,
  };
}
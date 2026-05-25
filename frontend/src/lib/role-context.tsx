"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { fetchUser, syncUser, updateUser } from "./api-client";

export type AppRole = "patient" | "doctor";

type SessionUserWithId = {
  id?: string | null;
};

interface RoleContextType {
  role: AppRole | null;
  userId: string | null;
  setRole: (role: AppRole) => Promise<void>;
  clearRole: () => Promise<void>;
  isDoctor: boolean;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  userId: null,
  setRole: async () => {},
  clearRole: async () => {},
  isDoctor: false,
  isLoading: true,
});

export function useRole() {
  return useContext(RoleContext);
}

function getErrorMessage(error: unknown) {
  if (
    error
    && typeof error === "object"
    && "message" in error
    && typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

/**
 * Provides role + userId to the entire app based on NextAuth session.
 * Syncs with the backend to retrieve the user's persisted role.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [role, setRoleState] = useState<AppRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const syncAttemptedRef = useRef(false);
  const lastSyncUserIdRef = useRef<string | null>(null);

  const sessionUser = session?.user as (NonNullable<typeof session>["user"] & SessionUserWithId) | undefined;
  const userId = sessionUser?.id || null;

  useEffect(() => {
    async function loadUserRole() {
      if (status === "authenticated" && userId) {
        if (lastSyncUserIdRef.current !== userId) {
          lastSyncUserIdRef.current = userId;
          syncAttemptedRef.current = false;
        }

        try {
          const user = await fetchUser(userId);
          setRoleState(user.role ? (user.role as AppRole) : null);
        } catch (error: unknown) {
          const canSync = !syncAttemptedRef.current && !!session?.user?.email;
          if (canSync) {
            syncAttemptedRef.current = true;
            try {
              await syncUser({
                id: userId,
                email: session?.user?.email || "",
                name: session?.user?.name ?? undefined,
                image: session?.user?.image ?? undefined,
              });
              const syncedUser = await fetchUser(userId);
              setRoleState(syncedUser.role ? (syncedUser.role as AppRole) : null);
              return;
            } catch (syncError: unknown) {
              console.warn("Failed to sync user after missing profile:", getErrorMessage(syncError));
            }
          }

          console.warn("Failed to fetch user role (expected if new user or db reset):", getErrorMessage(error));
          // Default to null if fetch fails or user is new (no role set)
          setRoleState(null);
        } finally {
          setLoadingRole(false);
        }
      } else if (status === "unauthenticated") {
        setRoleState(null);
        setLoadingRole(false);
      }
    }

    loadUserRole();
  }, [status, userId, session]);

  const setRole = async (newRole: AppRole) => {
    if (!userId) return;

    // Optimistically set role immediately — this triggers the redirect in page.tsx
    // regardless of whether the backend call succeeds or fails.
    setRoleState(newRole);

    try {
      await updateUser(userId, { role: newRole });
    } catch (error: unknown) {
      // Don't revert — user is already in the app. Backend will sync on next login.
      console.warn("Failed to persist user role to backend (role set locally):", getErrorMessage(error));
    }
  };

  const clearRole = async () => {
    if (!userId) return;
    try {
      // Set role to empty string on the backend to clear it
      await updateUser(userId, { role: "" }); 
      setRoleState(null); // Force local null to show selector
    } catch (error: unknown) {
      console.warn("Failed to clear user role:", getErrorMessage(error));
    }
  };

  const isLoading = status === "loading" || loadingRole;

  return (
    <RoleContext.Provider 
      value={{ 
        role, 
        userId, 
        setRole, 
        clearRole,
        isDoctor: role === "doctor",
        isLoading
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

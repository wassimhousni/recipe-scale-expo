/**
 * User type from Supabase Auth.
 */
export interface User {
  id: string;
  email: string;
}

/**
 * Auth state for the app.
 */
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

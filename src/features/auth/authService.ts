import { supabase } from '../../services/supabase';
import { User } from './authTypes';

/**
 * Maps Supabase user to our User type.
 */
function mapSupabaseUser(supabaseUser: { id: string; email?: string } | null): User | null {
  if (!supabaseUser || !supabaseUser.email) {
    return null;
  }
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
  };
}

/**
 * Returns a user-friendly error message from Supabase auth errors.
 */
function getErrorMessage(error: { message: string } | null): string | null {
  if (!error) return null;

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email before signing in';
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists';
  }
  if (message.includes('password')) {
    return 'Password must be at least 6 characters';
  }
  if (message.includes('email')) {
    return 'Please enter a valid email address';
  }
  if (message.includes('network')) {
    return 'Network error. Please check your connection';
  }

  return error.message;
}

/**
 * Sign up a new user with email and password.
 */
export async function signUp(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return {
      user: mapSupabaseUser(data.user),
      error: getErrorMessage(error),
    };
  } catch {
    return {
      user: null,
      error: 'Network error. Please check your connection',
    };
  }
}

/**
 * Sign in an existing user.
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: mapSupabaseUser(data.user),
      error: getErrorMessage(error),
    };
  } catch {
    return {
      user: null,
      error: 'Network error. Please check your connection',
    };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    return {
      error: getErrorMessage(error),
    };
  } catch {
    return {
      error: 'Network error. Please check your connection',
    };
  }
}

/**
 * Get the current authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return mapSupabaseUser(data.user);
  } catch {
    return null;
  }
}

/**
 * Send password reset email.
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    return {
      error: getErrorMessage(error),
    };
  } catch {
    return {
      error: 'Network error. Please check your connection',
    };
  }
}

/**
 * Subscribe to auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapSupabaseUser(session?.user ?? null));
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

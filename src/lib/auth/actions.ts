'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signInSchema, signUpSchema } from './schemas';

export async function signInAction(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const validatedData = signInSchema.safeParse(rawData);
  
  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0]?.message || 'Validation error',
    };
  }

  const { email, password } = validatedData.data;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: 'Invalid email or password',
    };
  }

  redirect('/dashboard');
}

export async function signUpAction(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const validatedData = signUpSchema.safeParse(rawData);
  
  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0]?.message || 'Validation error',
    };
  }

  const { email, password } = validatedData.data;
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: 'Check your email to confirm your account',
  };
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}
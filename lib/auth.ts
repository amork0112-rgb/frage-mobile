import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export type UserRole =
  | 'master_admin'
  | 'admin'
  | 'master_teacher'
  | 'teacher'
  | 'campus'
  | 'parent'
  | 'unknown';

export async function getUserRole(user: User): Promise<UserRole> {
  try {
    // Check if user is a teacher/admin
    const { data: teacher } = await supabase
      .from('teachers')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (teacher?.role) {
      return teacher.role as UserRole;
    }

    // Check if user has students (is a parent)
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('parent_auth_user_id', user.id)
      .limit(1);

    if (students && students.length > 0) {
      return 'parent';
    }

    return 'unknown';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'unknown';
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

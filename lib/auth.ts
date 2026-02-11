import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export type UserRole =
  | 'master_admin'
  | 'admin'
  | 'master_teacher'
  | 'teacher'
  | 'campus'
  | 'driver'
  | 'parent'
  | 'unknown';

export async function getUserRole(user: User): Promise<UserRole> {
  try {
    // ✅ 1. Admin Check (profiles table)
    // admin / master_admin are in 'profiles' table (no role column needed, just existence)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      console.log('👨‍💼 [Auth] Admin detected (in profiles table)');
      return 'admin';
    }

    // ✅ 2. Teacher Check (teachers table)
    // teacher / master_teacher are in 'teachers' table
    const { data: teacher } = await supabase
      .from('teachers')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (teacher?.role) {
      console.log('👨‍🏫 [Auth] Teacher detected. Role:', teacher.role);
      return teacher.role as UserRole;
    }

    // ✅ 3. Driver Check (drivers table)
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (driver) {
      console.log('🚍 [Auth] Driver detected');
      return 'driver';
    }

    // ✅ 4. Parent Check (students table)
    // Check if user has students enrolled
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('parent_auth_user_id', user.id)
      .limit(1);

    if (students && students.length > 0) {
      console.log('👨‍👩‍👧 [Auth] Parent detected (has students)');
      return 'parent';
    }

    console.log('❓ [Auth] No role found for user');
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

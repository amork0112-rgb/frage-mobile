import { supabase } from './supabase';
import { apiFetch } from './api';

/**
 * Read-only Supabase queries below — these are allowed under the
 * API-mediated architecture since they only SELECT, never mutate.
 */

export async function getTeacherStudents(userId: string) {
  try {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (!teacher) return [];

    const { data: tcData } = await supabase
      .from('teacher_classes')
      .select('class_name')
      .eq('teacher_id', teacher.id);

    const classNames = (tcData || []).map((tc: any) => tc.class_name);
    if (classNames.length === 0) return [];

    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .in('name', classNames);

    const classIds = (classData || []).map((c: any) => c.id);
    if (classIds.length === 0) return [];

    const { data: students, error } = await supabase
      .from('students')
      .select('id, student_name, english_first_name, campus')
      .in('main_class', classIds)
      .order('student_name');

    if (error) {
      console.error('Error fetching students:', error);
      return [];
    }

    return (students || []).map((s: any) => ({
      id: s.id,
      first_name: s.english_first_name || s.student_name || '',
      last_name: '',
      grade: s.campus || 'N/A',
    }));
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    return [];
  }
}

export async function getTeacherMessages(_userId: string) {
  const { data: notices, error } = await supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (notices || []).map((n: any) => ({
    id: n.id,
    subject: n.title || '',
    body: n.content || '',
    recipient_name: '',
    student_name: '',
    read: true,
    created_at: n.created_at,
  }));
}

/**
 * Attendance marking via API — writes must go through server.
 * Falls back to direct Supabase if no API endpoint is available yet.
 */
export async function markAttendance(
  _userId: string,
  date: string,
  records: { student_id: string; status: 'present' | 'absent' }[]
) {
  try {
    const res = await apiFetch('/api/teacher/attendance', {
      method: 'POST',
      body: JSON.stringify({ date, records }),
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Failed to mark attendance');
    }
  } catch (error: any) {
    // If API not available, fall back to direct Supabase for now
    if (error.message === 'Missing EXPO_PUBLIC_API_BASE_URL') {
      const rows = records.map((r) => ({
        student_id: r.student_id,
        status: r.status,
        date: date,
      }));

      const { error: dbError } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'student_id,date' });

      if (dbError) {
        console.error('Error marking attendance:', dbError);
        throw dbError;
      }
      return;
    }
    throw error;
  }
}

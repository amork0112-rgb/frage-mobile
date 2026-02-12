import { supabase } from './supabase';

export async function getTeacherStats(userId: string) {
  try {
    // Get teacher info
    const { data: teacher } = await supabase
      .from('teachers')
      .select('email')
      .eq('auth_user_id', userId)
      .single();

    if (!teacher) {
      return { total_students: 0, present_today: 0, absent_today: 0, unread_messages: 0 };
    }

    // Get classes for this teacher
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', teacher.email);

    const classIds = (classes || []).map((c) => c.id);

    // Count students across all classes
    let totalStudents = 0;
    if (classIds.length > 0) {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .in('class_id', classIds);
      totalStudents = count || 0;
    }

    return {
      total_students: totalStudents,
      present_today: 0,
      absent_today: 0,
      unread_messages: 0,
    };
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    return { total_students: 0, present_today: 0, absent_today: 0, unread_messages: 0 };
  }
}

export async function getTeacherStudents(userId: string) {
  try {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('email')
      .eq('auth_user_id', userId)
      .single();

    if (!teacher) return [];

    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', teacher.email);

    const classIds = (classes || []).map((c) => c.id);
    if (classIds.length === 0) return [];

    const { data: students, error } = await supabase
      .from('students')
      .select('id, student_name, english_first_name, campus')
      .in('class_id', classIds)
      .order('student_name');

    if (error) {
      console.error('Error fetching students:', error);
      return [];
    }

    return (students || []).map((s) => ({
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

export async function getTeacherMessages(userId: string) {
  // Return notices as messages for now
  const { data: notices, error } = await supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (notices || []).map((n) => ({
    id: n.id,
    subject: n.title || '',
    body: n.content || '',
    recipient_name: '',
    student_name: '',
    read: true,
    created_at: n.created_at,
  }));
}

export async function markAttendance(
  userId: string,
  date: string,
  records: { student_id: string; status: 'present' | 'absent' }[]
) {
  const rows = records.map((r) => ({
    student_id: r.student_id,
    content: `Attendance: ${r.status}`,
    date: date,
  }));

  const { error } = await supabase.from('commitments').insert(rows);

  if (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
}

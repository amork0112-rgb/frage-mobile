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
      .select('id, name, english_name, campus')
      .in('class_id', classIds)
      .order('name');

    if (error) {
      console.error('Error fetching students:', error);
      return [];
    }

    return (students || []).map((s) => ({
      id: s.id,
      first_name: s.english_name || s.name || '',
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
  studentId: string,
  status: 'present' | 'absent',
  date: string
) {
  // Store attendance - uses commitments table as placeholder
  const { error } = await supabase.from('commitments').insert({
    student_id: studentId,
    content: `Attendance: ${status}`,
    date: date,
  });

  if (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
}

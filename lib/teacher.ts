import { supabase } from './supabase';

export async function getTeacherStats(userId: string) {
  try {
    // Get teacher info
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name')
      .eq('auth_user_id', userId)
      .single();

    if (!teacher) {
      return { total_students: 0, present_today: 0, absent_today: 0, unread_messages: 0 };
    }

    // Get class names via teacher_classes
    const { data: tcData } = await supabase
      .from('teacher_classes')
      .select('class_name')
      .eq('teacher_id', teacher.id);

    const classNames = (tcData || []).map((tc: any) => tc.class_name);

    // Get class IDs
    let totalStudents = 0;
    if (classNames.length > 0) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .in('name', classNames);

      const classIds = (classData || []).map((c: any) => c.id);

      if (classIds.length > 0) {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .in('main_class', classIds);
        totalStudents = count || 0;
      }
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
      .select('id')
      .eq('auth_user_id', userId)
      .single();

    if (!teacher) return [];

    // Get class names via teacher_classes
    const { data: tcData } = await supabase
      .from('teacher_classes')
      .select('class_name')
      .eq('teacher_id', teacher.id);

    const classNames = (tcData || []).map((tc: any) => tc.class_name);
    if (classNames.length === 0) return [];

    // Get class IDs
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

export async function markAttendance(
  _userId: string,
  date: string,
  records: { student_id: string; status: 'present' | 'absent' }[]
) {
  const rows = records.map((r) => ({
    student_id: r.student_id,
    status: r.status,
    date: date,
  }));

  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'student_id,date' });

  if (error) {
    console.error('Error marking attendance:', error);
    throw error;
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

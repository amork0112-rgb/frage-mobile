import { supabase } from './supabase';

export async function getParentChildren(userId: string) {
  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_name, english_first_name, campus, class_id')
    .eq('parent_auth_user_id', userId);

  if (error) {
    console.error('Error fetching children:', error);
    return [];
  }

  return (students || []).map((s) => ({
    id: s.id,
    student_name: s.student_name || '',
    english_first_name: s.english_first_name || '',
    campus: s.campus || '',
    class_id: s.class_id || '',
  }));
}

export async function getParentMessages(userId: string) {
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
    sender_name: 'FRAGE Academy',
    student_name: '',
    read: true,
    created_at: n.created_at,
  }));
}

export async function getRecentNotices(limit = 5) {
  const { data, error } = await supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notices:', error);
    return [];
  }

  return data || [];
}

export async function getParentRequests(studentIds: string[]) {
  if (studentIds.length === 0) return [];

  const { data, error } = await supabase
    .from('portal_requests')
    .select('id, type, payload, status, created_at, student_id')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching requests:', error);
    return [];
  }

  return data || [];
}

export async function getChildDetails(studentId: string) {
  // Get student info
  const { data: student, error } = await supabase
    .from('students')
    .select('id, student_name, english_first_name, campus, class_id')
    .eq('id', studentId)
    .single();

  if (error || !student) {
    console.error('Error fetching child details:', error);
    return null;
  }

  // Get class & teacher info
  let teacherName = '';
  if (student.class_id) {
    const { data: cls } = await supabase
      .from('classes')
      .select('name, teacher_id')
      .eq('id', student.class_id)
      .single();

    if (cls?.teacher_id) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('name')
        .eq('email', cls.teacher_id)
        .single();
      teacherName = teacher?.name || cls.teacher_id;
    }
  }

  // Get attendance percentage (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .gte('date', dateStr);

  const total = attendance?.length || 0;
  const present = attendance?.filter((a: any) => a.status === 'present').length || 0;
  const attendancePercentage = total > 0 ? (present / total) * 100 : 100;

  // Get recent notices as messages
  const { data: notices } = await supabase
    .from('notices')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    id: student.id,
    first_name: student.english_first_name || student.student_name || '',
    last_name: '',
    grade: student.campus || '',
    teacher_name: teacherName,
    attendance_percentage: attendancePercentage,
    recent_messages: (notices || []).map((n) => ({
      id: n.id,
      subject: n.title || '',
      sender_name: 'FRAGE Academy',
      created_at: n.created_at,
    })),
  };
}

export async function submitPortalRequest(
  studentId: string,
  type: 'absence' | 'early_pickup' | 'bus_change',
  payload: Record<string, any>,
) {
  const { error } = await supabase
    .from('portal_requests')
    .insert({
      student_id: studentId,
      type,
      payload,
      status: 'pending',
    });

  if (error) {
    console.error('Error submitting request:', error);
    throw error;
  }
}

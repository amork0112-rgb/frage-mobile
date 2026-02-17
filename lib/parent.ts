import { supabase } from './supabase';

export async function getParentChildren(userId: string) {
  // 1. Find parent record by auth_user_id
  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (parentError || !parent) {
    console.error('Parent not found:', parentError);
    return [];
  }

  // 2. Find students by parent_id
  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_name, english_first_name, campus, main_class')
    .eq('parent_id', parent.id);

  if (error) {
    console.error('Error fetching children:', error);
    return [];
  }

  return (students || []).map((s) => ({
    id: s.id,
    student_name: s.student_name || '',
    english_first_name: s.english_first_name || '',
    campus: s.campus || '',
    main_class: s.main_class || '',
  }));
}

export async function getParentMessages(userId: string) {
  const { data: notices, error } = await supabase
    .from('posts')
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
    .from('posts')
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
    .select('id, student_name, english_first_name, campus, main_class')
    .eq('id', studentId)
    .single();

  if (error || !student) {
    console.error('Error fetching child details:', error);
    return null;
  }

  // Get class & teacher info
  let teacherName = '';
  if (student.main_class) {
    const { data: cls } = await supabase
      .from('classes')
      .select('name, teacher_id')
      .eq('id', student.main_class)
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
    .from('posts')
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

// Video Homework Functions

export async function getVideoAssignments(studentId: string) {
  // 1. Get student's class and campus
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('main_class, campus')
    .eq('id', studentId)
    .single();

  if (studentError || !student?.main_class) {
    console.error('Error fetching student class:', studentError);
    return [];
  }

  // 2. Get assignments for class and campus
  const { data: assignments, error: assignmentsError } = await supabase
    .from('video_assignments')
    .select('id, title, module, class_name, campus, due_date, created_at, release_at')
    .eq('class_name', student.main_class)
    .eq('campus', student.campus)
    .order('due_date', { ascending: true });

  if (assignmentsError) {
    console.error('Error fetching video assignments:', assignmentsError);
    return [];
  }

  if (!assignments || assignments.length === 0) return [];

  // 3. Get submissions for this student
  const assignmentIds = assignments.map((a) => a.id);
  const { data: submissions } = await supabase
    .from('video_submissions')
    .select('assignment_id, id, status, submitted_at')
    .eq('student_id', studentId)
    .in('assignment_id', assignmentIds);

  // 4. Merge data
  return assignments.map((a) => {
    const sub = submissions?.find((s) => s.assignment_id === a.id);
    return {
      ...a,
      submission: sub || null,
      status: sub ? (sub.status === 'reviewed' ? 'reviewed' : 'submitted') : 'pending',
    };
  });
}

export async function getVideoSubmission(submissionId: string) {
  const { data: submission, error: submissionError } = await supabase
    .from('video_submissions')
    .select('id, assignment_id, video_url, submitted_at, status')
    .eq('id', submissionId)
    .single();

  if (submissionError || !submission) {
    console.error('Error fetching video submission:', submissionError);
    return null;
  }

  // Get assignment details
  const { data: assignment } = await supabase
    .from('video_assignments')
    .select('title, module, class_name, campus, due_date, release_at')
    .eq('id', submission.assignment_id)
    .maybeSingle();

  // Get feedback if exists
  const { data: feedback } = await supabase
    .from('video_feedback')
    .select('feedback_text, created_at')
    .eq('submission_id', submissionId)
    .maybeSingle();

  return {
    ...submission,
    assignment: assignment || null,
    feedback: feedback || null,
  };
}

export async function uploadVideoSubmission(
  studentId: string,
  assignmentId: string,
  fileUri: string,
) {
  try {
    // 1. Read file from URI
    const response = await fetch(fileUri);
    const blob = await response.blob();

    // 2. Generate path: {student_id}/{assignment_id}_{timestamp}.mp4
    const timestamp = Date.now();
    const filePath = `${studentId}/${assignmentId}_${timestamp}.mp4`;

    // 3. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-videos')
      .upload(filePath, blob, {
        contentType: 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // 4. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('student-videos')
      .getPublicUrl(filePath);

    // 5. Create submission record
    const { data: submission, error: insertError } = await supabase
      .from('video_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        video_url: publicUrl,
        status: 'submitted',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return submission;
  } catch (error) {
    console.error('Error uploading video submission:', error);
    throw error;
  }
}

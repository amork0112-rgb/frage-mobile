import { supabase } from './supabase';

export async function getParentChildren(userId: string) {
  // Get students linked to this parent
  const { data: students, error } = await supabase
    .from('students')
    .select('id, name, english_name, campus, class_id')
    .eq('parent_auth_user_id', userId);

  if (error) {
    console.error('Error fetching children:', error);
    return [];
  }

  // Map to expected interface
  return (students || []).map((s) => ({
    id: s.id,
    first_name: s.english_name || s.name || '',
    last_name: '',
    grade: s.campus || 'N/A',
    unread_messages: 0,
  }));
}

export async function getParentMessages(userId: string) {
  // Get notices as messages for parent
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

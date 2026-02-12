import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';

type ClassItem = { id: string; name: string };
type BookItem = { id: string; name: string; selected: boolean };

export default function MorningMessageScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const [books, setBooks] = useState<BookItem[]>([]);
  const [previewText, setPreviewText] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent_to_parents: number;
    push_success: number;
    push_failed: number;
  } | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadBooks();
      setPreviewText('');
      setTemplateId(null);
      setSendResult(null);
    }
  }, [selectedClassId]);

  async function loadClasses() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .single();

      if (!teacher) return;

      const { data: tcData } = await supabase
        .from('teacher_classes')
        .select('class_name')
        .eq('teacher_id', teacher.id);

      if (!tcData || tcData.length === 0) return;

      const classNames = tcData.map((tc: any) => tc.class_name);

      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .in('name', classNames)
        .order('name');

      if (classData && classData.length > 0) {
        setClasses(classData);
        if (!selectedClassId) {
          setSelectedClassId(classData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBooks() {
    try {
      // Get books for this class via student_commitments
      const { data: commitmentData } = await supabase
        .from('student_commitments')
        .select('book_id')
        .eq('class_id', selectedClassId)
        .eq('date', date);

      const bookIds = [
        ...new Set(
          (commitmentData || []).map((c: any) => c.book_id).filter(Boolean)
        ),
      ];

      if (bookIds.length > 0) {
        const { data: bookData } = await supabase
          .from('books')
          .select('id, name')
          .in('id', bookIds);

        setBooks(
          (bookData || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            selected: true,
          }))
        );
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }

  function toggleBook(bookId: string) {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId ? { ...b, selected: !b.selected } : b
      )
    );
    // Reset preview when books change
    setPreviewText('');
    setTemplateId(null);
    setSendResult(null);
  }

  async function handlePreview() {
    const selectedBookIds = books.filter((b) => b.selected).map((b) => b.id);
    if (selectedBookIds.length === 0) {
      Alert.alert('Error', 'Please select at least one book');
      return;
    }

    setPreviewing(true);
    setPreviewText('');
    setSendResult(null);

    try {
      const params = new URLSearchParams({
        class_id: selectedClassId,
        date,
        book_ids: selectedBookIds.join(','),
      });

      const res = await apiFetch(
        `/api/teacher/morning-message/preview?${params}`
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate preview');
      }

      setPreviewText(json.message_text || '');
      setTemplateId(json.template_id || null);
    } catch (error: any) {
      console.error('Error previewing:', error);
      Alert.alert('Error', error.message || 'Failed to generate preview');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSend() {
    if (!previewText) {
      Alert.alert('Error', 'Please preview the message first');
      return;
    }

    Alert.alert(
      'Send Morning Message',
      'Send this message to all parents in this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const selectedBookIds = books
                .filter((b) => b.selected)
                .map((b) => b.id);

              const res = await apiFetch(
                '/api/teacher/morning-message/send',
                {
                  method: 'POST',
                  body: JSON.stringify({
                    class_id: selectedClassId,
                    date,
                    book_ids: selectedBookIds,
                    template_id: templateId,
                  }),
                }
              );

              const json = await res.json();

              if (!res.ok) {
                throw new Error(json.error || 'Failed to send');
              }

              setSendResult({
                sent_to_parents: json.sent_to_parents || 0,
                push_success: json.push_success || 0,
                push_failed: json.push_failed || 0,
              });

              Alert.alert(
                'Success',
                `Message sent to ${json.sent_to_parents || 0} parents!`
              );
            } catch (error: any) {
              console.error('Error sending:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to send message'
              );
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  }

  function onRefresh() {
    setRefreshing(true);
    setPreviewText('');
    setTemplateId(null);
    setSendResult(null);
    loadBooks().finally(() => setRefreshing(false));
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Class Selector */}
      <View style={styles.classSelector}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classScroll}
        >
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[
                styles.classChip,
                selectedClassId === cls.id && styles.classChipSelected,
              ]}
              onPress={() => setSelectedClassId(cls.id)}
            >
              <Text
                style={[
                  styles.classChipText,
                  selectedClassId === cls.id && styles.classChipTextSelected,
                ]}
              >
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Book Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Books</Text>
          {books.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="book-outline"
                size={48}
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>No books for today</Text>
              <Text style={styles.emptySubtext}>
                Commitments need to be set up in the web app first
              </Text>
            </View>
          ) : (
            books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={[
                  styles.bookItem,
                  book.selected && styles.bookItemSelected,
                ]}
                onPress={() => toggleBook(book.id)}
              >
                <Ionicons
                  name={book.selected ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={book.selected ? '#0066CC' : '#CBD5E1'}
                />
                <Text
                  style={[
                    styles.bookName,
                    book.selected && styles.bookNameSelected,
                  ]}
                >
                  {book.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Preview Button */}
        {books.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.previewButton,
                previewing && styles.previewButtonDisabled,
              ]}
              onPress={handlePreview}
              disabled={previewing}
            >
              {previewing ? (
                <ActivityIndicator size="small" color="#0066CC" />
              ) : (
                <Ionicons name="eye-outline" size={20} color="#0066CC" />
              )}
              <Text style={styles.previewButtonText}>
                {previewing ? 'Generating...' : 'Preview Message'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Preview Text */}
        {previewText ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewCardText}>{previewText}</Text>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                (sending || !!sendResult) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={sending || !!sendResult}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={sendResult ? 'checkmark-circle' : 'send'}
                  size={20}
                  color="#FFFFFF"
                />
              )}
              <Text style={styles.sendButtonText}>
                {sending
                  ? 'Sending...'
                  : sendResult
                  ? `Sent to ${sendResult.sent_to_parents} parents`
                  : 'Send to Parents'}
              </Text>
            </TouchableOpacity>

            {/* Send Result */}
            {sendResult && (
              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Parents notified</Text>
                  <Text style={styles.resultValue}>
                    {sendResult.sent_to_parents}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Push success</Text>
                  <Text style={[styles.resultValue, { color: '#22C55E' }]}>
                    {sendResult.push_success}
                  </Text>
                </View>
                {sendResult.push_failed > 0 && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Push failed</Text>
                    <Text style={[styles.resultValue, { color: '#EF4444' }]}>
                      {sendResult.push_failed}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },

  // Class Selector
  classSelector: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
  },
  classScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  classChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  classChipSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  classChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  classChipTextSelected: {
    color: '#FFFFFF',
  },

  // Sections
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },

  // Book Items
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookItemSelected: {
    borderColor: '#0066CC',
    backgroundColor: '#F0F7FF',
  },
  bookName: {
    fontSize: 16,
    color: '#64748B',
    flex: 1,
  },
  bookNameSelected: {
    color: '#1E293B',
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },

  // Preview Button
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  previewButtonDisabled: {
    borderColor: '#94A3B8',
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },

  // Preview Card
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  previewCardText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 24,
  },

  // Send Button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Result Card
  resultCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
});

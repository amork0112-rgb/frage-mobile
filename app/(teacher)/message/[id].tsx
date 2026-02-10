import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

interface MessageDetails {
  id: string;
  subject: string;
  body: string;
  recipient_name: string;
  student_name: string;
  created_at: string;
}

export default function MessageDetail() {
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState<MessageDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessage();
  }, [id]);

  async function loadMessage() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          subject,
          body,
          created_at,
          recipient:profiles!messages_recipient_id_fkey(first_name, last_name),
          student:students(first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const messageData = {
        id: data.id,
        subject: data.subject,
        body: data.body,
        recipient_name: `${data.recipient.first_name} ${data.recipient.last_name}`,
        student_name: `${data.student.first_name} ${data.student.last_name}`,
        created_at: data.created_at,
      };

      setMessage(messageData);
    } catch (error) {
      console.error('Error loading message:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!message) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load message</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Message',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.studentTag}>
            <Ionicons name="person" size={16} color="#0066CC" />
            <Text style={styles.studentName}>{message.student_name}</Text>
          </View>
          <Text style={styles.subject}>{message.subject}</Text>
          <View style={styles.metadata}>
            <Text style={styles.recipient}>To {message.recipient_name}</Text>
            <Text style={styles.date}>{formatDate(message.created_at)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.bodyText}>{message.body}</Text>
        </View>
      </ScrollView>
    </>
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  studentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    gap: 6,
  },
  studentName: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
  subject: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  metadata: {
    gap: 4,
  },
  recipient: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#94A3B8',
  },
  body: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  bodyText: {
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
  },
});

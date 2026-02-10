import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getChildDetails } from '../../../lib/parent';

interface ChildDetails {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  teacher_name: string;
  attendance_percentage: number;
  recent_messages: Array<{
    id: string;
    subject: string;
    sender_name: string;
    created_at: string;
  }>;
}

export default function ChildDetail() {
  const { id } = useLocalSearchParams();
  const [child, setChild] = useState<ChildDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildDetails();
  }, [id]);

  async function loadChildDetails() {
    try {
      const childData = await getChildDetails(id as string);
      setChild(childData);
    } catch (error) {
      console.error('Error loading child details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!child) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load child details</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${child.first_name} ${child.last_name}`,
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {child.first_name[0]}
              {child.last_name[0]}
            </Text>
          </View>
          <Text style={styles.name}>
            {child.first_name} {child.last_name}
          </Text>
          <Text style={styles.grade}>Grade {child.grade}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Teacher</Text>
              <Text style={styles.infoValue}>{child.teacher_name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Attendance</Text>
              <Text style={styles.infoValue}>
                {child.attendance_percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>
          {child.recent_messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyText}>No recent messages</Text>
            </View>
          ) : (
            <View style={styles.messagesList}>
              {child.recent_messages.map((message) => (
                <TouchableOpacity key={message.id} style={styles.messageItem}>
                  <View style={styles.messageContent}>
                    <Text style={styles.messageSubject} numberOfLines={1}>
                      {message.subject}
                    </Text>
                    <Text style={styles.messageSender}>
                      From {message.sender_name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#0066CC" />
            <Text style={styles.actionButtonText}>Message Teacher</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  grade: {
    fontSize: 16,
    color: '#64748B',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  emptyMessages: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  messagesList: {
    gap: 8,
  },
  messageItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  messageContent: {
    flex: 1,
    marginRight: 12,
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 14,
    color: '#64748B',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
    marginLeft: 8,
  },
});

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Notice = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function AdminNotices() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    loadNotices();
  }, []);

  async function loadNotices() {
    try {
      const { data } = await supabase
        .from('notices')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false });

      if (data) {
        setNotices(data);
      }
    } catch (error) {
      console.error('Error loading notices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadNotices();
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function renderNotice({ item }: { item: Notice }) {
    return (
      <TouchableOpacity style={styles.noticeItem}>
        <View style={styles.noticeHeader}>
          <Text style={styles.noticeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.noticeDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.noticePreview} numberOfLines={3}>
          {item.content}
        </Text>
      </TouchableOpacity>
    );
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
      <FlatList
        data={notices}
        renderItem={renderNotice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notices found</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  noticeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noticeHeader: {
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  noticeDate: {
    fontSize: 12,
    color: '#64748B',
  },
  noticePreview: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Types
type AbsenceItem = {
  id: string;
  studentName: string;
  type: 'absence' | 'early_pickup';
  time?: string;
};

type ChangeItem = {
  id: string;
  studentName: string;
  note: string;
};

type OperationState = 'idle' | 'running' | 'ended';

export default function DriverHome() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [absences, setAbsences] = useState<AbsenceItem[]>([]);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [operation, setOperation] = useState<OperationState>('idle');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Section 1: Absences & early pickups
      const { data: absenceData } = await supabase
        .from('portal_requests')
        .select('id, type, payload, students ( name, english_name )')
        .in('type', ['absence', 'early_pickup'])
        .eq('status', 'pending');

      const absenceItems: AbsenceItem[] = [];
      (absenceData || []).forEach((r: any) => {
        const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
        const dateStart = payload?.dateStart;
        const dateEnd = payload?.dateEnd;

        // Check if today falls within the request date range
        const isToday = dateEnd
          ? today >= dateStart && today <= dateEnd
          : today === dateStart;

        if (isToday) {
          absenceItems.push({
            id: r.id,
            studentName: r.students?.name || r.students?.english_name || '이름 없음',
            type: r.type,
            time: r.type === 'early_pickup' ? payload?.time : undefined,
          });
        }
      });
      setAbsences(absenceItems);

      // Section 2: Bus changes & requests
      const { data: changeData } = await supabase
        .from('portal_requests')
        .select('id, type, payload, students ( name, english_name )')
        .eq('type', 'bus_change')
        .eq('status', 'pending');

      const changeItems: ChangeItem[] = [];
      (changeData || []).forEach((r: any) => {
        const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
        const dateStart = payload?.dateStart;

        if (today === dateStart) {
          changeItems.push({
            id: r.id,
            studentName: r.students?.name || r.students?.english_name || '이름 없음',
            note: payload?.note || getChangeTypeLabel(payload?.changeType),
          });
        }
      });
      setChanges(changeItems);
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getChangeTypeLabel(changeType?: string): string {
    switch (changeType) {
      case 'no_bus': return '버스 미탑승';
      case 'pickup_change': return '등원 변경';
      case 'dropoff_change': return '하원 변경';
      default: return '차량 변경';
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  function handleOperationPress() {
    switch (operation) {
      case 'idle':
        setOperation('running');
        break;
      case 'running':
        setOperation('ended');
        break;
      case 'ended':
        // No action after ended
        break;
    }
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Section 1: Absences / Early Dismissals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIconRed}>{"❌"}</Text>
            <Text style={styles.sectionTitleRed}>결석 / 조퇴</Text>
          </View>

          <View style={styles.cardRed}>
            {absences.length === 0 ? (
              <Text style={styles.emptyText}>오늘 결석/조퇴 없음</Text>
            ) : (
              absences.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <Text style={styles.studentName}>{item.studentName}</Text>
                  <Text
                    style={[
                      styles.statusLabel,
                      item.type === 'absence'
                        ? styles.statusAbsence
                        : styles.statusEarly,
                    ]}
                  >
                    {item.type === 'absence'
                      ? '결석'
                      : `조퇴 · ${item.time || ''}`}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Section 2: Vehicle Changes / Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIconOrange}>{"🔁"}</Text>
            <Text style={styles.sectionTitleOrange}>차량 변경 / 요청사항</Text>
          </View>

          <View style={styles.cardOrange}>
            {changes.length === 0 ? (
              <Text style={styles.emptyText}>오늘 차량 변경 없음</Text>
            ) : (
              changes.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <Text style={styles.studentName}>{item.studentName}</Text>
                  <Text style={styles.changeNote}>→ {item.note}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Section 3: Operation Status - Sticky Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.operationButton,
            operation === 'idle' && styles.operationIdle,
            operation === 'running' && styles.operationRunning,
            operation === 'ended' && styles.operationEnded,
          ]}
          onPress={handleOperationPress}
          disabled={operation === 'ended'}
          activeOpacity={0.8}
        >
          <Text style={styles.operationButtonText}>
            {operation === 'idle' && '🚍  운행 시작'}
            {operation === 'running' && '운행중…'}
            {operation === 'ended' && '운행 종료'}
          </Text>
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    padding: 16,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionIconRed: {
    fontSize: 18,
  },
  sectionTitleRed: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  sectionIconOrange: {
    fontSize: 18,
  },
  sectionTitleOrange: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
  },

  // Cards
  cardRed: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardOrange: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },

  // List Items
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  statusAbsence: {
    color: '#EF4444',
  },
  statusEarly: {
    color: '#D97706',
  },
  changeNote: {
    fontSize: 15,
    color: '#64748B',
    marginLeft: 12,
    flex: 1,
    textAlign: 'right',
  },

  // Empty State
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Bottom Operation Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#F8FAFC',
  },
  operationButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  operationIdle: {
    backgroundColor: '#0066CC',
    shadowColor: '#0066CC',
  },
  operationRunning: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
  },
  operationEnded: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  operationButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

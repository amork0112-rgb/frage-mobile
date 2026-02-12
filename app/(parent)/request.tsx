import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getParentChildren, submitPortalRequest } from '../../lib/parent';

type Child = {
  id: string;
  student_name: string;
  english_first_name: string;
  campus: string;
  class_id: string;
};

type RequestType = 'absence' | 'early_pickup' | 'bus_change';

const REQUEST_TYPES: { key: RequestType; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'absence', label: '결석 신청', icon: 'close-circle-outline', color: '#EF4444', bg: '#FEF2F2' },
  { key: 'early_pickup', label: '조퇴 신청', icon: 'time-outline', color: '#F59E0B', bg: '#FFF7ED' },
  { key: 'bus_change', label: '차량 변경', icon: 'bus-outline', color: '#0066CC', bg: '#EFF6FF' },
];

const BUS_CHANGE_TYPES = [
  { key: 'no_bus', label: '버스 미탑승' },
  { key: 'pickup_change', label: '등원 변경' },
  { key: 'dropoff_change', label: '하원 변경' },
];

export default function PortalRequest() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [time, setTime] = useState('');
  const [changeType, setChangeType] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadChildren();
  }, []);

  async function loadChildren() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await getParentChildren(user.id);
      setChildren(data);

      // Auto-select if single child
      if (data.length === 1) {
        setSelectedChild(data[0].id);
      }
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }

  function getChildName(child: Child) {
    return child.english_first_name || child.student_name || '';
  }

  function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  function isFormValid() {
    if (!selectedChild || !selectedType) return false;
    if (!dateStart) return false;
    if (selectedType === 'early_pickup' && !time) return false;
    if (selectedType === 'bus_change' && !changeType) return false;
    return true;
  }

  async function handleSubmit() {
    if (!isFormValid() || !selectedChild || !selectedType) return;

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        dateStart: dateStart || getTodayStr(),
      };

      if (dateEnd) payload.dateEnd = dateEnd;
      if (time) payload.time = time;
      if (changeType) payload.changeType = changeType;
      if (note.trim()) payload.note = note.trim();

      await submitPortalRequest(selectedChild, selectedType, payload);

      Alert.alert(
        '신청 완료',
        '요청이 성공적으로 접수되었습니다.',
        [{ text: '확인', onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert('오류', error.message || '신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Step 1: Select Child */}
      {children.length > 1 && (
        <View style={styles.formSection}>
          <Text style={styles.label}>자녀 선택</Text>
          <View style={styles.optionRow}>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.optionChip,
                  selectedChild === child.id && styles.optionChipSelected,
                ]}
                onPress={() => setSelectedChild(child.id)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    selectedChild === child.id && styles.optionChipTextSelected,
                  ]}
                >
                  {getChildName(child)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Step 2: Request Type */}
      <View style={styles.formSection}>
        <Text style={styles.label}>신청 유형</Text>
        <View style={styles.typeGrid}>
          {REQUEST_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeCard,
                selectedType === type.key && { borderColor: type.color, borderWidth: 2 },
              ]}
              onPress={() => {
                setSelectedType(type.key);
                // Reset type-specific fields
                setTime('');
                setChangeType('');
              }}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.bg }]}>
                <Ionicons name={type.icon as any} size={24} color={type.color} />
              </View>
              <Text style={styles.typeLabel}>{type.label}</Text>
              {selectedType === type.key && (
                <View style={[styles.typeCheck, { backgroundColor: type.color }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Step 3: Date */}
      {selectedType && (
        <View style={styles.formSection}>
          <Text style={styles.label}>
            {selectedType === 'absence' ? '결석 날짜' : selectedType === 'early_pickup' ? '조퇴 날짜' : '변경 날짜'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dateStart}
            onChangeText={setDateStart}
            keyboardType="numbers-and-punctuation"
          />

          {selectedType === 'absence' && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>종료 날짜 (선택)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (연속 결석 시)"
                value={dateEnd}
                onChangeText={setDateEnd}
                keyboardType="numbers-and-punctuation"
              />
            </>
          )}
        </View>
      )}

      {/* Early Pickup: Time */}
      {selectedType === 'early_pickup' && (
        <View style={styles.formSection}>
          <Text style={styles.label}>조퇴 시간</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM (예: 14:30)"
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}

      {/* Bus Change: Change Type */}
      {selectedType === 'bus_change' && (
        <View style={styles.formSection}>
          <Text style={styles.label}>변경 유형</Text>
          <View style={styles.optionRow}>
            {BUS_CHANGE_TYPES.map((ct) => (
              <TouchableOpacity
                key={ct.key}
                style={[
                  styles.optionChip,
                  changeType === ct.key && styles.optionChipSelected,
                ]}
                onPress={() => setChangeType(ct.key)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    changeType === ct.key && styles.optionChipTextSelected,
                  ]}
                >
                  {ct.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Note */}
      {selectedType && (
        <View style={styles.formSection}>
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="추가 요청사항을 입력해주세요"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <TouchableOpacity
          style={[styles.submitButton, !isFormValid() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isFormValid() || submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? '제출 중...' : '신청하기'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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
  content: {
    padding: 16,
  },

  // Form Sections
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },

  // Option chips
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  optionChipSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  optionChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  optionChipTextSelected: {
    color: '#FFFFFF',
  },

  // Type cards
  typeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  typeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Input
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },

  // Submit
  submitSection: {
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

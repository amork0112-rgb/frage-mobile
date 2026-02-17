import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../../lib/supabase';
import { uploadVideoSubmission } from '../../../lib/parent';

type RecordingState = 'READY' | 'RECORDING' | 'PREVIEW' | 'UPLOADING';

export default function RecordVideo() {
  const router = useRouter();
  const { assignment_id, student_id } = useLocalSearchParams<{
    assignment_id: string;
    student_id: string;
  }>();

  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const [state, setState] = useState<RecordingState>('READY');
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignment();
  }, [assignment_id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'RECORDING') {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [state]);

  async function loadAssignment() {
    try {
      const { data, error } = await supabase
        .from('video_assignments')
        .select('id, title, module, class_name, campus, due_date, release_at')
        .eq('id', assignment_id)
        .single();

      if (error) throw error;
      setAssignment(data);
    } catch (error) {
      console.error('Error loading assignment:', error);
      Alert.alert('오류', '과제 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePermissions() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          '카메라 권한 필요',
          '영상 촬영을 위해 카메라 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
        return false;
      }
    }

    if (!microphonePermission?.granted) {
      const result = await requestMicrophonePermission();
      if (!result.granted) {
        Alert.alert(
          '마이크 권한 필요',
          '영상 녹음을 위해 마이크 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
        return false;
      }
    }

    return true;
  }

  async function startRecording() {
    const hasPermissions = await handlePermissions();
    if (!hasPermissions) return;

    try {
      if (!cameraRef.current) return;

      setState('RECORDING');
      const recording = await cameraRef.current.recordAsync({
        maxDuration: 120, // 2 minutes max
      });

      if (recording && recording.uri) {
        setVideoUri(recording.uri);
        setState('PREVIEW');
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('오류', '영상 녹화 중 오류가 발생했습니다.');
      setState('READY');
    }
  }

  function stopRecording() {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  async function handleRetake() {
    if (videoUri) {
      try {
        await FileSystem.deleteAsync(videoUri, { idempotent: true });
      } catch (error) {
        console.error('Error deleting video file:', error);
      }
    }
    setVideoUri(null);
    setState('READY');
  }

  async function handleSubmit() {
    if (!videoUri || !student_id || !assignment_id) return;

    setState('UPLOADING');

    try {
      await uploadVideoSubmission(student_id, assignment_id, videoUri);

      // Clean up local file
      try {
        await FileSystem.deleteAsync(videoUri, { idempotent: true });
      } catch (error) {
        console.error('Error deleting local file:', error);
      }

      Alert.alert('제출 완료', '영상 숙제가 성공적으로 제출되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error submitting video:', error);
      Alert.alert(
        '제출 실패',
        '영상 업로드에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.',
        [
          { text: '다시 시도', onPress: handleSubmit },
          { text: '취소', style: 'cancel', onPress: () => setState('PREVIEW') },
        ]
      );
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: assignment?.title || '영상 녹화' }} />

      <View style={styles.container}>
        {/* Assignment Info Header */}
        <View style={styles.infoHeader}>
          <Text style={styles.assignmentTitle}>{assignment?.title}</Text>
          {assignment?.due_date && (
            <Text style={styles.dueDate}>
              마감: {new Date(assignment.due_date).toLocaleDateString('ko-KR')}
            </Text>
          )}
        </View>

        {/* Camera/Preview Area */}
        <View style={styles.cameraContainer}>
          {state === 'PREVIEW' && videoUri ? (
            <Video
              source={{ uri: videoUri }}
              style={styles.camera}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              mode="video"
            >
              {/* Flip Camera Button */}
              {state === 'READY' && (
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {/* Recording Timer */}
              {state === 'RECORDING' && (
                <View style={styles.timerContainer}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
                  <Text style={styles.maxTimeText}>/ 2:00</Text>
                </View>
              )}
            </CameraView>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {state === 'READY' && (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={startRecording}
            >
              <View style={styles.recordButtonInner} />
            </TouchableOpacity>
          )}

          {state === 'RECORDING' && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
            >
              <View style={styles.stopButtonInner} />
            </TouchableOpacity>
          )}

          {state === 'PREVIEW' && (
            <View style={styles.previewControls}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleRetake}
              >
                <Ionicons name="refresh" size={24} color="#64748B" />
                <Text style={styles.retakeButtonText}>다시 촬영</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>제출하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upload Progress Modal */}
        <Modal visible={state === 'UPLOADING'} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ActivityIndicator size="large" color="#0066CC" />
              <Text style={styles.modalText}>영상 업로드 중...</Text>
              <Text style={styles.modalSubtext}>잠시만 기다려주세요</Text>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  infoHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  flipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  maxTimeText: {
    fontSize: 14,
    color: '#E2E8F0',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  previewControls: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
});

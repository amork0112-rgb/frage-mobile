import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    bus: '🚌',
    video: '🎥',
    settings: '⚙️',
  };

  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '•'}
    </Text>
  );
}

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        headerStyle: {
          backgroundColor: '#0066CC',
        },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '차량위치',
          tabBarIcon: ({ focused }) => <TabBarIcon name="bus" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="video-homework"
        options={{
          title: 'Video HW',
          tabBarIcon: ({ focused }) => <TabBarIcon name="video" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabBarIcon name="settings" focused={focused} />,
        }}
      />
      {/* Hide screens that exist as files but shouldn't show as tabs */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="notices" options={{ href: null, title: '공지사항' }} />
      <Tabs.Screen name="coaching-report" options={{ href: null, title: '코칭 리포트' }} />
      <Tabs.Screen name="request" options={{ href: null, title: '신청하기' }} />
      <Tabs.Screen name="child/[id]" options={{ href: null }} />
      <Tabs.Screen name="message/[id]" options={{ href: null }} />
      <Tabs.Screen name="video-homework/record" options={{ href: null, title: '영상 녹화' }} />
      <Tabs.Screen name="video-homework/submission/[id]" options={{ href: null, title: '제출 내역' }} />
    </Tabs>
  );
}

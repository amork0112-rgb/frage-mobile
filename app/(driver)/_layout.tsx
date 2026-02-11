import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066CC',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700' as const,
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="home"
        options={{
          title: '오늘 셔틀 운행',
        }}
      />
    </Stack>
  );
}

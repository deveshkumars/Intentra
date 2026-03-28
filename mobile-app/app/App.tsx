import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SetupScreen } from './src/screens/SetupScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { useEventStream } from './src/useEventStream';
import { getServerUrl } from './src/storage';
import { TrackedAgent } from './src/types';

type Screen = 'loading' | 'setup' | 'dashboard' | 'detail';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<TrackedAgent | null>(null);

  const { events, trackedAgents, status, reconnect } = useEventStream(serverUrl);

  useEffect(() => {
    getServerUrl().then(url => {
      if (url) {
        setServerUrl(url);
        setScreen('dashboard');
      } else {
        setScreen('setup');
      }
    });
  }, []);

  if (screen === 'loading') return null;

  if (screen === 'setup') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SetupScreen
          onConnected={url => {
            setServerUrl(url);
            setScreen('dashboard');
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (screen === 'detail' && selectedAgent) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <DetailScreen
          agent={selectedAgent}
          onBack={() => setScreen('dashboard')}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <DashboardScreen
          events={events}
          trackedAgents={trackedAgents}
          status={status}
          onReconnect={reconnect}
          onAgentPress={agent => {
            setSelectedAgent(agent);
            setScreen('detail');
          }}
          onSetupPress={() => setScreen('setup')}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);

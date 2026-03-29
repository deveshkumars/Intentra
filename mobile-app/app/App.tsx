import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SetupScreen } from './src/screens/SetupScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { IntentScreen } from './src/screens/IntentScreen';
import { useEventStream } from './src/useEventStream';
import { getServerUrl } from './src/storage';
import { TrackedAgent } from './src/types';

type Screen = 'loading' | 'setup' | 'dashboard' | 'intent' | 'detail';
type Tab = 'dashboard' | 'intent';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<TrackedAgent | null>(null);
  const [intentEventFilter, setIntentEventFilter] = useState<string | null>(null);

  const { events, trackedAgents, status, reconnect } = useEventStream(serverUrl);

  const filteredEvents = useMemo(
    () =>
      intentEventFilter
        ? events.filter(e => e.intent_id === intentEventFilter)
        : events,
    [events, intentEventFilter],
  );

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
          onBack={() => setScreen(activeTab)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={tabStyles.container}>
          {/* Screen content */}
          <View style={tabStyles.content}>
            {activeTab === 'dashboard' ? (
              <DashboardScreen
                events={filteredEvents}
                trackedAgents={trackedAgents}
                status={status}
                serverUrl={serverUrl}
                intentEventFilter={intentEventFilter}
                onIntentEventFilterChange={setIntentEventFilter}
                onReconnect={reconnect}
                onAgentPress={agent => {
                  setSelectedAgent(agent);
                  setScreen('detail');
                }}
                onSetupPress={() => setScreen('setup')}
              />
            ) : (
              <IntentScreen serverUrl={serverUrl} />
            )}
          </View>

          {/* Tab bar */}
          <View style={tabStyles.tabBar}>
            <TouchableOpacity
              style={tabStyles.tab}
              onPress={() => setActiveTab('dashboard')}
              activeOpacity={0.7}
            >
              <Text style={[
                tabStyles.tabLabel,
                activeTab === 'dashboard' && tabStyles.tabLabelActive,
              ]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tabStyles.tab}
              onPress={() => setActiveTab('intent')}
              activeOpacity={0.7}
            >
              <Text style={[
                tabStyles.tabLabel,
                activeTab === 'intent' && tabStyles.tabLabelActive,
              ]}>Intent</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1e293b',
    backgroundColor: '#0d0d0d',
    paddingBottom: 28, // safe area for home indicator
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#4ade80',
  },
});

registerRootComponent(App);

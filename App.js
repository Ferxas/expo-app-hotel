import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  BackHandler,
  LayoutAnimation,
  StyleSheet,
  UIManager,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  Timestamp,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import Constants from 'expo-constants';
import { db } from './firebaseConfig';
import { Audio } from 'expo-av';
import { Provider as PaperProvider, Banner, Button, Surface } from 'react-native-paper';

import RoomListScreen from './screens/RoomListScreen';
import RoomDetailScreen from './screens/RoomDetailScreen';
import ReportProblemScreen from './screens/ReportProblemScreen';
import MaintenanceReminderScreen from './screens/MaintenanceReminderScreen';
import MaintenanceDashboardScreen from './screens/MaintenanceDashboardScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function LimpiezaStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RoomList" component={RoomListScreen} options={{ title: 'Habitaciones por limpiar' }} />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
      <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
    </Stack.Navigator>
  );
}

function MantenimientoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MaintenanceReminder" component={MaintenanceReminderScreen} options={{ title: 'A/C' }} />
    </Stack.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MaintenanceDashboard" component={MaintenanceDashboardScreen} options={{ title: 'General Maintenance' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  console.log('🚀 App started');
  const [blocked, setBlocked] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [deviceReady, setDeviceReady] = useState(false);
  const [internalMessage, setInternalMessage] = useState(null);
  
  console.log('🧠 App render: blocked=', blocked, 'deviceReady=', deviceReady);
  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require('./assets/notification.mp3'));
      await sound.playAsync();
    } catch (error) {
      console.log('🔇 Error reproduciendo sonido:', error.message);
    }
  };

  useEffect(() => {
    checkUpcomingMaintenances();
    registerDevice();
  }, []);

  const checkUpcomingMaintenances = async () => {
    const snapshot = await getDocs(collection(db, 'rooms'));
    const now = new Date();
    const MAINTENANCE_INTERVAL_DAYS = 76;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.lastMaintenance?.seconds) {
        const last = new Date(data.lastMaintenance.seconds * 1000);
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays >= MAINTENANCE_INTERVAL_DAYS - 7) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🔧 Mantenimiento pendiente',
              body: `Habitación ${data.number} necesita mantenimiento pronto`,
            },
            trigger: null,
          });
        }
      }
    }
  };

  const registerDevice = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants?.manifest?.extra?.eas?.projectId || "15c04e60-5c12-4cbe-aa7e-a409ec8458a0",
      });
      const token = tokenData.data;

      const id = Device.osInternalBuildId || Application.androidId || (await Application.getIosIdForVendorAsync()) || Date.now().toString();
      setDeviceId(id);

      const ref = doc(db, 'device_tokens', id);
      const snapshot = await getDoc(ref);

      let available = true;

      if (snapshot.exists()) {
        const data = snapshot.data();
        available = data.available !== false;
        await setDoc(ref, { token, deviceId: id }, { merge: true });
      } else {
        await setDoc(ref, {
          token,
          deviceId: id,
          available: true,
          createdAt: Timestamp.now(),
        });
      }

      setBlocked(!available);
      setDeviceReady(true);

      onSnapshot(ref, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const currentlyAvailable = data.available !== false;
          setBlocked(!currentlyAvailable);
        }
      });

      onSnapshot(ref, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const message = data.customMessage;

          if (message?.text && message?.sentAt) {
            const lastShown = globalThis.lastMessageShown || 0;
            const sentTime = message.sentAt.seconds || 0;

            if (sentTime > lastShown) {
              globalThis.lastMessageShown = sentTime;

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '📩 Nuevo mensaje',
                  body: message.text,
                },
                trigger: null,
              });

              await playSound();
              LayoutAnimation.easeInEaseOut();
              setInternalMessage(message.text);

              setTimeout(() => {
                LayoutAnimation.easeInEaseOut();
                setInternalMessage(null);
              }, 10000);
            }
          }
        }
      });
    } catch (error) {
      console.log('❌ Error al registrar dispositivo:', error.message);
    }
  };

  if (!deviceReady) return null;

  if (blocked) {
    return (
      <PaperProvider>
        <View style={styles.centered}>
          <Surface style={styles.blockSurface}>
            <Text style={styles.blockedText}>⛔ Acceso restringido. Hoy no estás disponible para usar la app.</Text>
            <Button mode="contained" onPress={() => BackHandler.exitApp()}>
              Salir
            </Button>
          </Surface>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      {internalMessage && (
        <Banner
          visible
          actions={[{ label: 'Cerrar', onPress: () => setInternalMessage(null) }]}
          icon="message-alert"
        >
          {internalMessage}
        </Banner>
      )}
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Limpieza 🧹" component={LimpiezaStack} />
          <Tab.Screen name="A/C 𖣘" component={MantenimientoStack} />
          <Tab.Screen name="Dashboard 📺" component={DashboardStack} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  blockSurface: {
    padding: 20,
    width: '90%',
    elevation: 4,
    borderRadius: 12,
  },
  blockedText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
});
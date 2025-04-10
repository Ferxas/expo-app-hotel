import React, { useEffect } from 'react';
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
} from 'firebase/firestore';
import { db } from './firebaseConfig';

import RoomListScreen from './screens/RoomListScreen';
import RoomDetailScreen from './screens/RoomDetailScreen';
import ReportProblemScreen from './screens/ReportProblemScreen';
import MaintenanceReminderScreen from './screens/MaintenanceReminderScreen';
import MaintenanceDashboardScreen from './screens/MaintenanceDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function LimpiezaStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RoomList"
        component={RoomListScreen}
        options={{ title: 'Habitaciones por limpiar' }}
      />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
      <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
    </Stack.Navigator>
  );
}

function MantenimientoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MaintenanceReminder"
        component={MaintenanceReminderScreen}
        options={{ title: 'Mantenimiento de A/C' }}
      />
    </Stack.Navigator>
  );
}

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MaintenanceDashboard"
        component={MaintenanceDashboardScreen}
        options={{ title: 'Dashboard de Mantenimiento' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    checkUpcomingMaintenances();
    registerDevice(); // ✅ asegurado aquí
  }, []);
  

  const registerDevice = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
  
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
  
      if (finalStatus !== 'granted') {
        console.log('❌ Permisos no otorgados');
        return;
      }
  
      const tokenData = await Notifications.getExpoPushTokenAsync({
        'projectId': Constants.expoConfig?.extra.eas.projectId, 
      });
      const token = tokenData.data;
  
      const id =
        Device.osInternalBuildId ||
        Application.androidId ||
        (await Application.getIosIdForVendorAsync()) ||
        Date.now().toString();
  
      console.log('📲 Registrando dispositivo:', id, token);
  
      await setDoc(doc(db, 'device_tokens', id), {
        token,
        deviceId: id,
        available: true,
        createdAt: Timestamp.now(),
      }, { merge: true });
  
      console.log('✅ Dispositivo registrado correctamente');
    } catch (error) {
      console.log('❌ Error al registrar dispositivo:', error.message);
    }
  };

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

  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Limpieza" component={LimpiezaStack} />
        <Tab.Screen name="Mantenimiento" component={MantenimientoStack} />
        <Tab.Screen name="Dashboard" component={DashboardStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Alert,
  AppState,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Text, Button, TextInput, Surface, Divider, Switch } from 'react-native-paper';
import { db } from '../firebaseConfig';
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RoomDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const [employeeName, setEmployeeName] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStart, setPauseStart] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [deviceId, setDeviceId] = useState(null);
  const [hasOngoingCleaning, setHasOngoingCleaning] = useState(false);
  const [cleaningBy, setCleaningBy] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    registerDevice();
    loadTimer();

    const unsub = onSnapshot(doc(db, 'rooms', room.id), (docSnap) => {
      const data = docSnap.data();
      setCleaningBy(data.cleaningBy || null);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && startTime) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: '⏳ Limpieza en curso',
            body: `Recuerda finalizar la habitación ${room.number}`,
            sticky: true,
          },
          trigger: null,
        });
      }
    });
    return () => subscription.remove();
  }, [startTime]);

  const registerDevice = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants?.manifest?.extra?.eas?.projectId,
    });
    const id =
      Device.osInternalBuildId ||
      Application.androidId ||
      (await Application.getIosIdForVendorAsync()) ||
      Date.now().toString();

    setDeviceId(id);

    const q = query(collection(db, 'device_tokens'), where('deviceId', '==', id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(collection(db, 'device_tokens'), {
        token: tokenData.data,
        deviceId: id,
        active: true,
        createdAt: Timestamp.now(),
      });
    }
  };

  const notifyOthers = async (roomNumber, cleaner) => {
    const q = query(collection(db, 'device_tokens'), where('active', '==', true));
    const snapshot = await getDocs(q);

    const message = {
      title: '🧹 Limpieza iniciada',
      body: `La habitación ${roomNumber} está siendo limpiada por ${cleaner}`,
    };

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const token = data.token;
      if (!token) continue;

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title: message.title,
          body: message.body,
        }),
      });
    }
  };

  const toggleAvailability = async () => {
    if (!deviceId) return;
    const q = query(collection(db, 'device_tokens'), where('deviceId', '==', deviceId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, { active: !isAvailable });
      LayoutAnimation.easeInEaseOut();
      setIsAvailable(!isAvailable);
    }
  };

  const loadTimer = async () => {
    const saved = await AsyncStorage.getItem(`timer-${room.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setStartTime(parsed.startTime);
      setTotalPausedTime(parsed.totalPausedTime || 0);
      const now = Date.now();
      setElapsed(Math.floor((now - parsed.startTime - (parsed.totalPausedTime || 0)) / 1000));
      setHasOngoingCleaning(true);

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - parsed.startTime - (parsed.totalPausedTime || 0)) / 1000));
      }, 1000);
    } else {
      setHasOngoingCleaning(false);
    }
  };

  const startCleaning = async () => {
    if (!employeeName.trim()) {
      Alert.alert('⚠️ Debes ingresar tu nombre antes de comenzar.');
      return;
    }

    if (startTime && isPaused) {
      const resumedAt = Date.now();
      const pausedDuration = resumedAt - pauseStart;
      const newTotalPaused = totalPausedTime + pausedDuration;
      setTotalPausedTime(newTotalPaused);
      setIsPaused(false);

      await AsyncStorage.setItem(`timer-${room.id}`, JSON.stringify({
        startTime,
        totalPausedTime: newTotalPaused,
      }));

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime - newTotalPaused) / 1000));
      }, 1000);
      return;
    }

    if (startTime) return;

    const newStart = Date.now();
    setStartTime(newStart);
    setIsPaused(false);
    setHasOngoingCleaning(true);

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - newStart) / 1000));
    }, 1000);

    await AsyncStorage.setItem(`timer-${room.id}`, JSON.stringify({ startTime: newStart, totalPausedTime: 0 }));

    await updateDoc(doc(db, 'rooms', room.id), {
      cleaningBy: employeeName.trim(),
    });

    await notifyOthers(room.number, employeeName.trim());

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ Limpieza en curso`,
        body: `Habitación ${room.number} en limpieza`,
        sticky: true,
      },
      trigger: null,
    });
  };

  const pauseCleaning = () => {
    clearInterval(timerRef.current);
    setPauseStart(Date.now());
    setIsPaused(true);
  };

  const stopCleaning = () => {
    Alert.alert('Finalizar limpieza', '¿Estás seguro de que deseas finalizar el servicio de limpieza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí',
        onPress: async () => {
          clearInterval(timerRef.current);
          const end = Date.now();
          const totalDuration = end - startTime - totalPausedTime;
          const durationSeconds = Math.floor(totalDuration / 1000);

          try {
            await addDoc(collection(db, 'cleaning_logs'), {
              roomNumber: room.number,
              startedAt: Timestamp.fromDate(new Date(startTime)),
              endedAt: Timestamp.fromDate(new Date(end)),
              durationMinutes: Math.ceil(durationSeconds / 60),
              employeeName: employeeName.trim(),
              deviceId: deviceId || 'unknown',
            });

            await updateDoc(doc(db, 'rooms', room.id), {
              state: 'CLEAN',
              lastCleaned: Timestamp.now(),
              cleaningBy: null,
            });

            await AsyncStorage.removeItem(`timer-${room.id}`);
            await Notifications.dismissAllNotificationsAsync();

            Alert.alert('✅ Limpieza registrada');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error al guardar:', error.message);
          }
        },
      },
    ]);
  };

  const cancelCleaning = () => {
    Alert.alert('Cancelar limpieza', '¿Seguro que deseas cancelar esta limpieza?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        onPress: async () => {
          clearInterval(timerRef.current);
          await AsyncStorage.removeItem(`timer-${room.id}`);
          await Notifications.dismissAllNotificationsAsync();
          await updateDoc(doc(db, 'rooms', room.id), {
            cleaningBy: null,
          });

          setStartTime(null);
          setElapsed(0);
          setIsPaused(false);
          setPauseStart(null);
          setTotalPausedTime(0);
          setHasOngoingCleaning(false);
          Alert.alert('⛔ Limpieza cancelada');
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="titleLarge">🛏️ Habitación {room.number}</Text>
        <Text variant="bodyMedium" style={styles.status}>Estado actual: {room.state}</Text>

        {cleaningBy && (
          <Text style={styles.warning}>🔄 Actualmente está siendo limpiada por: {cleaningBy}</Text>
        )}

        <Divider style={{ marginVertical: 10 }} />

        <TextInput
          label="Empleado (obligatorio)"
          mode="outlined"
          value={employeeName}
          onChangeText={setEmployeeName}
          style={{ marginBottom: 16 }}
        />

        <View style={styles.row}>
          <Text style={{ marginRight: 8 }}>¿Disponible?</Text>
          <Switch value={isAvailable} onValueChange={toggleAvailability} />
        </View>

        {!startTime ? (
          <Button mode="contained" onPress={startCleaning} style={styles.button}>
            Iniciar limpieza
          </Button>
        ) : (
          <>
            <Text style={styles.timer}>
              ⏱ Tiempo: {Math.floor(elapsed / 60)} min {elapsed % 60} s
            </Text>

            {!isPaused ? (
              <Button mode="outlined" onPress={pauseCleaning} style={styles.button}>
                ⏸️ Pausar temporizador
              </Button>
            ) : (
              <Button mode="contained" onPress={startCleaning} style={styles.button}>
                ▶️ Reanudar temporizador
              </Button>
            )}

            <Button mode="contained" onPress={stopCleaning} style={[styles.button, { backgroundColor: '#4CAF50' }]}>
              Finalizar limpieza
            </Button>

            <Button mode="outlined" onPress={cancelCleaning} style={styles.button}>
              ❌ Cancelar limpieza
            </Button>
          </>
        )}

        <Divider style={{ marginVertical: 12 }} />

        <Button
          mode="elevated"
          onPress={() => navigation.navigate('ReportProblem', { room, employeeName })}
          style={{ backgroundColor: '#f44336' }}
          textColor="white"
        >
          📸 Reportar un problema
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    flexGrow: 1,
  },
  surface: {
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 10,
  },
  timer: {
    fontSize: 16,
    marginVertical: 10,
  },
  warning: {
    fontSize: 14,
    color: 'orange',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  status: {
    marginTop: 4,
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
});
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Alert, AppState } from 'react-native';
import { db } from '../firebaseConfig';
import { doc, updateDoc, collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

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
  const [deviceToken, setDeviceToken] = useState(null);
  const [hasOngoingCleaning, setHasOngoingCleaning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    registerDevice();
    loadTimer();
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

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    setDeviceToken(token);

    const id = Device.osInternalBuildId || Application.androidId || Application.getIosIdForVendorAsync() || Date.now().toString();
    setDeviceId(id);

    const q = query(collection(db, 'device_tokens'), where('deviceId', '==', id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(collection(db, 'device_tokens'), {
        token,
        deviceId: id,
        active: true,
        createdAt: Timestamp.now(),
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

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ Limpieza en curso`,
        body: `Habitación ${room.number} en limpieza`,
        sticky: true,
      },
      trigger: null,
    });
  };

  const pauseCleaning = async () => {
    clearInterval(timerRef.current);
    setPauseStart(Date.now());
    setIsPaused(true);
  };

  const stopCleaning = () => {
    Alert.alert(
      'Finalizar limpieza',
      '¿Estás seguro de que deseas finalizar el servicio de limpieza?',
      [
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
                employeeName: employeeName.trim() || null,
                deviceId: deviceId || 'unknown',
              });

              const roomRef = doc(db, 'rooms', room.id);
              await updateDoc(roomRef, {
                state: 'CLEAN',
                lastCleaned: Timestamp.now(),
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
      ]
    );
  };

  const cancelCleaning = () => {
    Alert.alert(
      'Cancelar limpieza',
      '¿Seguro que deseas cancelar esta limpieza? No se guardará ningún registro.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          onPress: async () => {
            clearInterval(timerRef.current);
            await AsyncStorage.removeItem(`timer-${room.id}`);
            await Notifications.dismissAllNotificationsAsync();
            setStartTime(null);
            setElapsed(0);
            setIsPaused(false);
            setPauseStart(null);
            setTotalPausedTime(0);
            setHasOngoingCleaning(false);
            Alert.alert('⛔ Limpieza cancelada');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habitación {room.number}</Text>
      <Text>Estado actual: {room.state}</Text>

      {hasOngoingCleaning && (
        <Text style={styles.warning}>🚧 Esta limpieza ya estaba en curso.</Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Nombre del empleado (opcional)"
        value={employeeName}
        onChangeText={setEmployeeName}
      />

      <Button
        title={isAvailable ? '🟢 Disponible para notificaciones' : '🔕 No disponible'}
        onPress={toggleAvailability}
        color={isAvailable ? '#4CAF50' : '#9E9E9E'}
      />

      {!startTime ? (
        <Button title="Iniciar limpieza" onPress={startCleaning} />
      ) : (
        <>
          <Text style={styles.timer}>
            ⏱ Tiempo: {Math.floor(elapsed / 60)} min {elapsed % 60} s
          </Text>

          {!isPaused ? (
            <Button title="Pausar temporizador ⏸️" onPress={pauseCleaning} color="#FF9800" />
          ) : (
            <Button title="Reanudar temporizador ▶️" onPress={startCleaning} color="#4CAF50" />
          )}

          <View style={{ height: 10 }} />
          <Button title="Finalizar limpieza" onPress={stopCleaning} color="#4CAF50" />
          <View style={{ height: 10 }} />
          <Button title="Cancelar limpieza ❌" onPress={cancelCleaning} color="#9E9E9E" />
        </>
      )}

      <View style={{ height: 10 }} />
      <Button
        title="📸 Reportar un problema"
        onPress={() => navigation.navigate('ReportProblem', { room, employeeName })}
        color="#f44336"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginVertical: 12,
  },
  timer: { fontSize: 16, marginVertical: 12 },
  warning: {
    fontSize: 14,
    color: 'orange',
    marginBottom: 10,
    fontWeight: 'bold',
  },
});
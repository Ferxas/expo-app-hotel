import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, Alert } from 'react-native';
import { collection, onSnapshot, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function MaintenanceReminderScreen() {
  const [rooms, setRooms] = useState([]);
  const MAINTENANCE_INTERVAL_DAYS = 76;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const now = new Date();
      const updatedRooms = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const last = data.lastMaintenance?.seconds
          ? new Date(data.lastMaintenance.seconds * 1000)
          : null;

        const diffDays = last
          ? Math.floor((now - last) / (1000 * 60 * 60 * 24))
          : MAINTENANCE_INTERVAL_DAYS + 1;

        const daysLeft = MAINTENANCE_INTERVAL_DAYS - diffDays;
        const needsMaintenance = diffDays >= MAINTENANCE_INTERVAL_DAYS;

        return {
          id: docSnap.id,
          number: data.number,
          lastMaintenance: last,
          needsMaintenance,
          daysLeft,
        };
      });

      setRooms(updatedRooms);
    });

    return () => unsubscribe();
  }, []);

  const logMaintenance = async (roomId, number, action) => {
    try {
      await addDoc(collection(db, 'maintenance_logs'), {
        roomNumber: number,
        action,
        date: Timestamp.now(),
      });

      if (action === 'done') {
        await updateDoc(doc(db, 'rooms', roomId), {
          lastMaintenance: Timestamp.now(),
        });
      }

      Alert.alert('✅ Registro guardado');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mantenimiento de Aire Acondicionado</Text>

      {rooms.map((room, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.room}>Habitación {room.number}</Text>
          <Text>Último mantenimiento: {room.lastMaintenance ? room.lastMaintenance.toDateString() : 'Ninguno'}</Text>

          <Text style={{ marginTop: 4 }}>
            {room.needsMaintenance
              ? `⚠️ Mantenimiento vencido por ${-room.daysLeft} días`
              : `⏳ Faltan ${room.daysLeft} días`}
          </Text>

          {room.needsMaintenance && (
            <>
              <Button title="Registrar mantenimiento ✅" onPress={() => logMaintenance(room.id, room.number, 'done')} />
              <View style={{ height: 8 }} />
              <Button title="Omitir ❌" color="red" onPress={() => logMaintenance(room.id, room.number, 'skipped')} />
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  room: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
});

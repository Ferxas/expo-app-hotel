import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Surface, useTheme, Divider, Snackbar } from 'react-native-paper';
import { collection, onSnapshot, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function MaintenanceReminderScreen() {
  const [rooms, setRooms] = useState([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const MAINTENANCE_INTERVAL_DAYS = 76;
  const theme = useTheme();

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

      setSnackbar({
        visible: true,
        message:
          action === 'done'
            ? `✅ Mantenimiento registrado para habitación ${number}`
            : `⚠️ Mantenimiento omitido en habitación ${number}`,
      });
    } catch (err) {
      setSnackbar({ visible: true, message: '❌ Error: ' + err.message });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        🛠️ Mantenimiento de Aire Acondicionado
      </Text>

      {rooms.map((room, index) => (
        <Surface key={index} style={[styles.card, room.needsMaintenance && styles.danger]}>
          <Text variant="titleMedium" style={styles.room}>
            Habitación {room.number}
          </Text>

          <Text style={{ marginBottom: 4 }}>
            Último mantenimiento:{' '}
            {room.lastMaintenance ? room.lastMaintenance.toDateString() : '—'}
          </Text>

          <Text style={{ marginBottom: 8 }}>
            {room.needsMaintenance
              ? `⚠️ Vencido por ${-room.daysLeft} días`
              : `⏳ Faltan ${room.daysLeft} días`}
          </Text>

          {room.needsMaintenance && (
            <>
              <Button
                icon="check"
                mode="contained"
                onPress={() => logMaintenance(room.id, room.number, 'done')}
                style={{ marginBottom: 8 }}
              >
                Registrar mantenimiento
              </Button>
              <Button
                icon="close"
                mode="outlined"
                onPress={() => logMaintenance(room.id, room.number, 'skipped')}
                textColor={theme.colors.error}
              >
                Omitir
              </Button>
            </>
          )}
        </Surface>
      ))}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  card: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: 'white',
    elevation: 3,
  },
  danger: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  room: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
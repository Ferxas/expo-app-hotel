import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Surface, useTheme, Divider, Snackbar, Chip } from 'react-native-paper';
import { collection, onSnapshot, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const MAINTENANCE_INTERVAL_DAYS = 76;

export default function MaintenanceReminderScreen() {
  const [spaces, setSpaces] = useState([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const theme = useTheme();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const now = new Date();
      const updated = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const last = data.lastMaintenance?.seconds
          ? new Date(data.lastMaintenance.seconds * 1000)
          : null;

        const diffDays = last
          ? Math.floor((now - last) / (1000 * 60 * 60 * 24))
          : MAINTENANCE_INTERVAL_DAYS + 1;

        return {
          id: docSnap.id,
          number: data.number,
          type: data.type || 'room', // room, office, laundry, etc.
          lastMaintenance: last,
          daysLeft: MAINTENANCE_INTERVAL_DAYS - diffDays,
          needsMaintenance: diffDays >= MAINTENANCE_INTERVAL_DAYS,
        };
      });

      setSpaces(updated);
    });

    return () => unsubscribe();
  }, []);

  const logMaintenance = async (spaceId, number, type, action) => {
    try {
      await addDoc(collection(db, 'maintenance_logs'), {
        targetNumber: number,
        targetType: type,
        action,
        date: Timestamp.now(),
      });

      if (action === 'done') {
        await updateDoc(doc(db, 'rooms', spaceId), {
          lastMaintenance: Timestamp.now(),
        });
      }

      setSnackbar({
        visible: true,
        message:
          action === 'done'
            ? `✅ Mantenimiento registrado para ${type} ${number}`
            : `⚠️ Mantenimiento omitido en ${type} ${number}`,
      });
    } catch (err) {
      setSnackbar({ visible: true, message: '❌ Error: ' + err.message });
    }
  };

  const getLabel = (type) => {
    switch (type) {
      case 'office': return '🏢 Oficina';
      case 'laundry': return '🧺 Laundry';
      case 'room':
      default:
        return '🛏️ Habitación';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>🛠️ Mantenimiento Preventivo</Text>

      {spaces.map((space) => (
        <Surface
          key={space.id}
          style={[
            styles.card,
            space.needsMaintenance && styles.danger,
          ]}
        >
          <Text variant="titleMedium" style={styles.label}>
            {getLabel(space.type)} {space.number}
          </Text>

          <Chip style={{ alignSelf: 'flex-start', marginBottom: 6 }} mode="outlined">
            Tipo: {space.type.toUpperCase()}
          </Chip>

          <Text>
            Último mantenimiento: {space.lastMaintenance ? space.lastMaintenance.toDateString() : '—'}
          </Text>

          <Text style={{ marginBottom: 10 }}>
            {space.needsMaintenance
              ? `⚠️ Vencido por ${-space.daysLeft} días`
              : `⏳ Faltan ${space.daysLeft} días`}
          </Text>

          {space.needsMaintenance && (
            <>
              <Button
                icon="check"
                mode="contained"
                onPress={() => logMaintenance(space.id, space.number, space.type, 'done')}
                style={{ marginBottom: 8 }}
              >
                Registrar mantenimiento
              </Button>
              <Button
                icon="close"
                mode="outlined"
                onPress={() => logMaintenance(space.id, space.number, space.type, 'skipped')}
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
  label: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
});
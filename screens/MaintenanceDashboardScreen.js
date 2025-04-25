import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet } from 'react-native';
import { Text, Surface, Button, Snackbar, useTheme } from 'react-native-paper';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function MaintenanceDashboardScreen() {
  const [reports, setReports] = useState([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const theme = useTheme();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'problem_reports'), (snapshot) => {
      const all = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(all);
    });

    return () => unsubscribe();
  }, []);

  const handleResolve = async (reportId) => {
    try {
      await updateDoc(doc(db, 'problem_reports', reportId), { resolved: true });
      setSnackbar({ visible: true, message: '✅ Reporte marcado como resuelto' });
    } catch (err) {
      setSnackbar({ visible: true, message: '❌ Error: ' + err.message });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgente':
        return '#ffcdd2';
      case 'medio':
        return '#fff9c4';
      case 'bajo':
        return '#eeeeee';
      default:
        return '#f5f5f5';
    }
  };

  const renderItem = ({ item }) => {
    if (item.resolved) return null;

    const isGeneral = item.isGeneralReport;
    const locationLabel = isGeneral
      ? `🌐 Ubicación: ${item.generalLocation || '—'}`
      : `🛏️ Habitación ${item.roomNumber}`;

    return (
      <Surface style={[styles.card, { backgroundColor: getPriorityColor(item.priority) }]}>
        <Text variant="titleMedium" style={styles.room}>
          {locationLabel}
        </Text>

        <Text style={styles.desc}>{item.description || 'Sin descripción'}</Text>
        <Text style={styles.priority}>Prioridad: {item.priority || '—'}</Text>

        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.img} />
        )}

        <Button
          icon="check"
          mode="contained"
          onPress={() => handleResolve(item.id)}
          style={styles.btn}
        >
          Marcar como resuelto
        </Button>
      </Surface>
    );
  };

  return (
    <>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <Text style={styles.empty}>✅ No hay reportes pendientes</Text>
        }
      />
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  card: {
    padding: 16,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  room: {
    marginBottom: 4,
    fontWeight: 'bold',
  },
  desc: {
    marginBottom: 8,
    fontSize: 14,
    color: '#333',
  },
  priority: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 10,
    color: '#444',
  },
  img: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 10,
  },
  btn: {
    alignSelf: 'flex-start',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#888',
  },
});
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Button, Alert } from 'react-native';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function MaintenanceDashboardScreen() {
  const [reports, setReports] = useState([]);

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
      Alert.alert('✅ Problema marcado como resuelto');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const getColor = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('urgente') || desc.includes('fuga') || desc.includes('inundación') || desc.includes('enchufe')) return '#ffcdd2'; // rojo claro
    if (desc.includes('falla') || desc.includes('no funciona')) return '#fff9c4'; // amarillo claro
    if (desc.includes('pintura') || desc.includes('estético')) return '#eeeeee'; // gris claro
    return '#ddd'; // neutro
  };

  const renderItem = ({ item }) => {
    if (item.resolved) return null;

    return (
      <View style={[styles.card, { backgroundColor: getColor(item.description) }]}>
        <Text style={styles.room}>Habitación {item.roomNumber}</Text>
        <Text style={styles.desc}>{item.description}</Text>
        {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.img} />}
        <Button title="Marcar como resuelto" onPress={() => handleResolve(item.id)} />
      </View>
    );
  };

  return (
    <FlatList
      data={reports}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.empty}>No hay reportes pendientes</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  room: { fontWeight: 'bold', fontSize: 16 },
  desc: { marginVertical: 8 },
  img: { width: '100%', height: 200, borderRadius: 6, marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 20, color: '#666' },
});
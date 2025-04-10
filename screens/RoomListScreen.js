import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function RoomListScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'),
      where('state', 'in', ['SE', 'CO']) // solo habitaciones que requieren limpieza
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRooms(roomData);
    });

    return () => unsubscribe(); // Limpia el listener al desmontar el componente
  }, []);

  const renderItem = ({ item }) => {
    let bgColor = '#eee';

    if (item.state === 'SE') bgColor = '#fff9c4';        // amarillo claro
    else if (item.state === 'CO') bgColor = '#ffcdd2';   // rojo claro
    else if (item.state === 'CLEAN') bgColor = '#c8e6c9'; // verde claro

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: bgColor }]}
        onPress={() => navigation.navigate('RoomDetail', { room: item })}
      >
        <Text style={styles.title}>Room {item.number}</Text>
        <Text style={styles.state}>Estado: {item.state}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No hay habitaciones para limpiar</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  state: { marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 20, color: '#888' }
});

import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { Text, Surface, useTheme, Badge } from 'react-native-paper';
import { db } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

export default function RoomListScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const theme = useTheme();
  const [touchStartY, setTouchStartY] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('state', 'in', ['SE', 'CO']));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRooms(roomData);
    });

    return () => unsubscribe();
  }, []);

  const getCardColor = (room) => {
    if (room.isBeingCleaned) return '#bbdefb'; // azul claro
    if (room.state === 'SE') return '#fff59d'; // amarillo
    if (room.state === 'CO') return '#ef9a9a'; // rojo
    if (room.state === 'CLEAN') return '#a5d6a7'; // verde
    return '#eeeeee'; // neutro
  };

  const renderItem = ({ item }) => (
    <Pressable
      onTouchStart={(e) => setTouchStartY(e.nativeEvent.pageY)}
      onTouchEnd={(e) => {
        const deltaY = Math.abs(e.nativeEvent.pageY - touchStartY);
        if (deltaY < 10) {
          navigation.navigate('RoomDetail', { room: item });
        }
      }}
      android_ripple={{
        color: 'rgba(0,0,0,0.1)',
        borderless: false,
      }}
      style={{ borderRadius: 10, marginBottom: 12 }}
    >
      <Surface
        style={[styles.card, { backgroundColor: getCardColor(item) }]}
        elevation={2}
      >
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.title}>
            🛏️ Habitación {item.number}
          </Text>
          {item.isBeingCleaned && (
            <Badge style={styles.badge}>En limpieza</Badge>
          )}
        </View>
        <Text style={styles.state}>Estado: {item.state}</Text>
      </Surface>
    </Pressable>
  );

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <Text style={styles.empty}>✅ No hay habitaciones para limpiar</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  card: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#ccc',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  state: {
    marginTop: 6,
    fontSize: 14,
    color: '#333',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#777',
  },
  badge: {
    backgroundColor: '#1976d2',
    color: 'white',
    alignSelf: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
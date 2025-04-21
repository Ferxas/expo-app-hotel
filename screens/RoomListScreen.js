import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function RoomListScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'),
      where('state', 'in', ['SE', 'CO'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRooms(roomData);
    });

    return () => unsubscribe();
  }, []);

  const getCardColor = (state) => {
    if (state === 'SE') return '#fff59d';
    if (state === 'CO') return '#ef9a9a';
    if (state === 'CLEAN') return '#a5d6a7';
    return '#eeeeee';
  };

  const renderItem = ({ item }) => (
    <TouchableWithoutFeedback
      delayPressIn={150}
      onPress={() => navigation.navigate('RoomDetail', { room: item })}
    >
      <View style={{ marginBottom: 12 }}>
        <Surface
          style={[styles.card, { backgroundColor: getCardColor(item.state) }]}
          elevation={2}
        >
          <Text variant="titleMedium" style={styles.title}>
            🛏️ Habitación {item.number}
          </Text>
          <Text style={styles.state}>Estado: {item.state}</Text>
        </Surface>
      </View>
    </TouchableWithoutFeedback>
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
});
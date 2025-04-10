import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ReportProblemScreen({ route, navigation }) {
  const { room, employeeName } = route.params;
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const submitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Descripción requerida');
      return;
    }

    setUploading(true);

    let imageUrl = null;

    try {
      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        const fileRef = ref(storage, `problems/${Date.now()}.jpg`);
        await uploadBytes(fileRef, blob);
        imageUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, 'problem_reports'), {
        roomNumber: room.number,
        description,
        imageUrl,
        reportedAt: Timestamp.now(),
        employeeName: employeeName?.trim() || null,
      });

      Alert.alert('✅ Problema reportado');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error al enviar', error.message);
    }

    setUploading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reportar problema en habitación {room.number}</Text>

      <TextInput
        style={styles.input}
        placeholder="Describe el problema"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {image && (
        <Image source={{ uri: image }} style={styles.image} />
      )}

      <View style={styles.buttons}>
        <Button title="📷 Tomar foto" onPress={takePhoto} />
        <Button title="🖼️ Elegir imagen" onPress={pickImage} />
      </View>

      <Button title={uploading ? 'Enviando...' : 'Enviar reporte'} onPress={submitReport} disabled={uploading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    textAlignVertical: 'top'
  },
  image: { width: '100%', height: 200, marginBottom: 12, borderRadius: 8 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
});

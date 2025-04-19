import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Text, Button, TextInput, Surface, ActivityIndicator } from 'react-native-paper';
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
    const { status } = await ImagePicker.launchCameraAsync();
    if (status !== 'granted') {
      console.log("Permisos de cámara denegado");
      alert("Permisos de cámara denegado");
      return;
    }
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
      alert('⚠️ Debes escribir una descripción');
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

      alert('✅ Problema reportado exitosamente');
      navigation.goBack();
    } catch (error) {
      alert('❌ Error al enviar el reporte: ' + error.message);
    }

    setUploading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="titleLarge" style={{ marginBottom: 8 }}>
          🧾 Reportar problema en habitación {room.number}
        </Text>

        <TextInput
          label="Descripción del problema"
          mode="outlined"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          style={{ marginBottom: 16 }}
        />

        {image && (
          <Image source={{ uri: image }} style={styles.image} />
        )}

        <View style={styles.buttons}>
          <Button icon="camera" mode="outlined" onPress={takePhoto} style={{ flex: 1, marginRight: 6 }}>
            Tomar foto
          </Button>
          <Button icon="image" mode="outlined" onPress={pickImage} style={{ flex: 1, marginLeft: 6 }}>
            Elegir imagen
          </Button>
        </View>

        {uploading ? (
          <ActivityIndicator animating={true} size="large" style={{ marginVertical: 12 }} />
        ) : (
          <Button
            mode="contained"
            onPress={submitReport}
            style={{ marginTop: 8 }}
          >
            Enviar reporte
          </Button>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    flexGrow: 1,
  },
  surface: {
    padding: 20,
    elevation: 4,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
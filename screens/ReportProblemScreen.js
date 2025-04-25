import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Text, Button, TextInput, Surface, ActivityIndicator, RadioButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ReportProblemScreen({ route, navigation }) {
  const { room, employeeName } = route.params ?? {};
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [isGeneralReport, setIsGeneralReport] = useState(!room);
  const [generalLocation, setGeneralLocation] = useState('');

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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Se requiere permiso de cámara para tomar fotos.');
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

    if (isGeneralReport && !generalLocation.trim()) {
      alert('⚠️ Debes especificar la ubicación del problema');
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
        roomNumber: room?.number ?? null,
        generalLocation: isGeneralReport ? generalLocation.trim() : null,
        isGeneralReport,
        description,
        priority,
        imageUrl,
        reportedAt: Timestamp.now(),
        employeeName: employeeName?.trim() || null,
        resolved: false,
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
          🧾 Reportar problema {isGeneralReport ? 'general' : `en habitación ${room?.number}`}
        </Text>

        <View style={styles.radioRow}>
          <RadioButton.Group
            onValueChange={(value) => setIsGeneralReport(value === 'general')}
            value={isGeneralReport ? 'general' : 'room'}
          >
            <View style={styles.radioOption}>
              <RadioButton value="room" disabled={!room} />
              <Text>Habitación</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="general" />
              <Text>General</Text>
            </View>
          </RadioButton.Group>
        </View>

        {isGeneralReport && (
          <TextInput
            label="Ubicación del problema (ej. Patio, Recepción)"
            mode="outlined"
            value={generalLocation}
            onChangeText={setGeneralLocation}
            style={{ marginBottom: 16 }}
          />
        )}

        <TextInput
          label="Descripción del problema"
          mode="outlined"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          style={{ marginBottom: 16 }}
        />

        <Text style={{ marginBottom: 4 }}>Prioridad</Text>
        <RadioButton.Group onValueChange={setPriority} value={priority}>
          <View style={styles.radioRow}>
            <View style={styles.radioOption}>
              <RadioButton value="bajo" />
              <Text>Baja</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="medio" />
              <Text>Media</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="urgente" />
              <Text>Urgente</Text>
            </View>
          </View>
        </RadioButton.Group>

        {image && <Image source={{ uri: image }} style={styles.image} />}

        <View style={styles.buttons}>
          <Button icon="camera" mode="outlined" onPress={takePhoto} style={{ flex: 1, marginRight: 6 }}>
            Tomar foto
          </Button>
          <Button icon="image" mode="outlined" onPress={pickImage} style={{ flex: 1, marginLeft: 6 }}>
            Elegir imagen
          </Button>
        </View>

        {uploading ? (
          <ActivityIndicator animating size="large" style={{ marginVertical: 12 }} />
        ) : (
          <Button mode="contained" onPress={submitReport} style={{ marginTop: 8 }}>
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
  radioRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
});
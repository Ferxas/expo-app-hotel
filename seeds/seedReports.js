const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBPpNDyOLZmB7DclJMywtW4rCh_SJiUTRo",
    authDomain: "fir-employee-app.firebaseapp.com",
    projectId: "fir-employee-app",
    storageBucket: "fir-employee-app.firebasestorage.app",
    messagingSenderId: "915065368441",
    appId: "1:915065368441:web:8eb124c309c565cfca09a8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedReports = async () => {
  const reports = [
    {
      roomNumber: '101',
      description: 'URGENTE: Fuga de agua en el baño',
      imageUrl: null,
      reportedAt: Timestamp.now(),
      employeeName: 'Carlos'
    },
    {
      roomNumber: '102',
      description: 'El aire acondicionado no funciona',
      imageUrl: null,
      reportedAt: Timestamp.now(),
      employeeName: 'Laura'
    },
    {
      roomNumber: '103',
      description: 'Falta pintura en la pared del baño (estético)',
      imageUrl: null,
      reportedAt: Timestamp.now(),
      employeeName: 'Luis'
    },
    {
      roomNumber: '104',
      description: 'Urgente: Hay un enchufe expuesto',
      imageUrl: null,
      reportedAt: Timestamp.now(),
      employeeName: 'Ana'
    },
    {
      roomNumber: '105',
      description: 'La TV no enciende',
      imageUrl: null,
      reportedAt: Timestamp.now(),
      employeeName: 'Daniel'
    }
  ];

  for (const report of reports) {
    await addDoc(collection(db, 'problem_reports'), report);
    console.log(`Reporte creado para habitación ${report.roomNumber}`);
  }

  console.log('✅ Seed completado');
};

seedReports();

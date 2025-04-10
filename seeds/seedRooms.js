const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

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

const rooms = [
    { number: '101', state: 'SE' },
    { number: '102', state: 'CO' },
    { number: '103', state: 'CLEAN' },
    { number: '104', state: 'SE' },
    { number: '105', state: 'CO' },
];

async function seedRooms() {
    for (const room of rooms) {
        await addDoc(collection(db, 'rooms'), room);
        console.log(`Habitación ${room.number} agregada`);
    }
}

seedRooms().then(() => {
    console.log('✔️ Habitaciones creadas');
    process.exit();
});

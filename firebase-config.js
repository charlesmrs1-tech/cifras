// Configuração do Firebase Realtime Database para Cifras Charles
// Substitua os valores abaixo com a sua chave obtida no Firebase Console (https://console.firebase.google.com)

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

let db = null;
let firebaseInitialized = false;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.warn("SDK do Firebase não carregado.");
    return false;
  }

  // Verifica se o usuário substituiu as credenciais de exemplo
  if (firebaseConfig.apiKey === "SUA_API_KEY" || !firebaseConfig.databaseURL || firebaseConfig.databaseURL.includes("SEU_PROJETO")) {
    console.warn("Firebase ainda não configurado com chaves reais. Usando modo de armazenamento local.");
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    firebaseInitialized = true;
    return true;
  } catch (err) {
    console.error("Erro ao inicializar Firebase:", err);
    return false;
  }
}

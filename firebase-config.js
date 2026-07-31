// Configuração do Firebase Realtime Database para Cifras Charles
// Projeto: musicas-5ee55

const firebaseConfig = {
  projectId: "musicas-5ee55",
  databaseURL: "https://musicas-5ee55-default-rtdb.firebaseio.com",
  authDomain: "musicas-5ee55.firebaseapp.com",
  storageBucket: "musicas-5ee55.appspot.com"
};

window.db = null;
window.firebaseInitialized = false;

function initFirebase() {
  if (typeof firebase === "undefined") {
    console.warn("SDK do Firebase não carregado.");
    return false;
  }

  if (!firebaseConfig.databaseURL || firebaseConfig.databaseURL.includes("SEU_PROJETO")) {
    console.warn("Firebase ainda não configurado com chaves reais. Usando modo de armazenamento local.");
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window.db = firebase.database();
    window.firebaseInitialized = true;
    return true;
  } catch (err) {
    console.error("Erro ao inicializar Firebase:", err);
    return false;
  }
}

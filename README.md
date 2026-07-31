# Cifras Charles

Aplicativo web para organizar músicas, cifras e sequências de repertório com sincronização na nuvem em tempo real.

## Recursos

- **Sincronização em Tempo Real (Nuvem)**: Adicione ou edite uma música no celular ou computador e ela aparece automaticamente para todos os usuários em tempo real.
- **Suporte Offline (PWA)**: Continua funcionando normalmente sem internet através do `localStorage`.
- **Biblioteca de músicas**: Busca por nome ou estilo.
- **Leitura em tela cheia**: Texto grande otimizado para palcos ou celulares distantes.
- **Autorrolagem**: Controle de velocidade ajustável.
- **Ajuste de fonte**: Botões dedicados e gesto de pinça na tela.
- **Sequências de repertório**: Organização de músicas por estilo ou ocasião.
- **Exportação/Importação**: Backup e restauração via arquivo `.json`.

---

## Ativar a Sincronização na Nuvem (Firebase)

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um projeto gratuito.
2. No menu lateral, acesse **Realtime Database** > **Criar Banco de Dados** (selecione o modo de teste para permitir leitura/escrita).
3. Nas **Configurações do Projeto** (⚙️), adicione um App Web.
4. Abra o arquivo `firebase-config.js` no projeto e cole suas credenciais no objeto `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

5. Faça commit e `git push`. A Vercel publicará a versão conectada automaticamente.

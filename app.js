const STORAGE_KEY = "cifras-charles-v34";

try {
  if (!localStorage.getItem("cifras-charles-purged-v34")) {
    localStorage.clear();
    localStorage.setItem("cifras-charles-purged-v34", "true");
  }
} catch (e) {}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9);
}

const sampleSongs = [
  {
    id: "sample-evidencias",
    title: "Evidencias",
    style: "Sertanejo moda",
    content: `Tom: G

G
Quando eu digo que deixei de te amar
D/F#
E porque eu te amo
Em
Quando eu digo que nao quero mais voce
C
E porque eu te quero`
  },
  {
    id: "sample-fio-de-cabelo",
    title: "Fio de Cabelo",
    style: "Sertanejo moda",
    content: `Tom: A

A
Quando a gente ama
E
Qualquer coisa serve para relembrar
Bm
Um vestido velho da mulher amada
E
Tem muito valor`
  },
  {
    id: "sample-tempo-perdido",
    title: "Tempo Perdido",
    style: "Rock",
    content: `Tom: C

C
Todos os dias quando acordo
Am
Nao tenho mais o tempo que passou
F
Mas tenho muito tempo
G
Temos todo o tempo do mundo`
  }
];

const sampleSets = [];

let state = loadState();
let currentSongId = null;
let currentQueue = [];
let editingSongId = null;
let autoScrollEnabled = false;
let autoScrollFrame = null;
let lastScrollTime = 0;
let currentScrollPos = 0;
let lastTouchWasPinch = false;

const el = {
  syncBadge: document.querySelector("#syncBadge"),
  backButton: document.querySelector("#backButton"),
  screenHint: document.querySelector("#screenHint"),
  searchButton: document.querySelector("#searchButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  floatingSearchButton: document.querySelector("#floatingSearchButton"),
  homeScreen: document.querySelector("#homeScreen"),
  readerScreen: document.querySelector("#readerScreen"),
  quickSearch: document.querySelector("#quickSearch"),
  songList: document.querySelector("#songList"),
  setList: document.querySelector("#setList"),
  songsPanel: document.querySelector("#songsPanel"),
  setsPanel: document.querySelector("#setsPanel"),
  tabs: document.querySelectorAll(".tab"),
  readerTitle: document.querySelector("#readerTitle"),
  readerMeta: document.querySelector("#readerMeta"),
  readerContent: document.querySelector("#readerContent"),
  prevSongButton: document.querySelector("#prevSongButton"),
  nextSongButton: document.querySelector("#nextSongButton"),
  fontDownButton: document.querySelector("#fontDownButton"),
  fontUpButton: document.querySelector("#fontUpButton"),
  scrollToggleButton: document.querySelector("#scrollToggleButton"),
  scrollSlowerButton: document.querySelector("#scrollSlowerButton"),
  scrollFasterButton: document.querySelector("#scrollFasterButton"),
  scrollSpeedDisplay: document.querySelector("#scrollSpeedDisplay"),
  editSongButton: document.querySelector("#editSongButton"),
  directDeleteSongButton: document.querySelector("#directDeleteSongButton"),
  newSongButton: document.querySelector("#newSongButton"),
  newSetButton: document.querySelector("#newSetButton"),
  searchDialog: document.querySelector("#searchDialog"),
  modalSearchInput: document.querySelector("#modalSearchInput"),
  modalSearchResults: document.querySelector("#modalSearchResults"),
  songDialog: document.querySelector("#songDialog"),
  closeSongDialogButton: document.querySelector("#closeSongDialogButton"),
  saveSongButton: document.querySelector("#saveSongButton"),
  songDialogTitle: document.querySelector("#songDialogTitle"),
  songTitleInput: document.querySelector("#songTitleInput"),
  songStyleInput: document.querySelector("#songStyleInput"),
  songContentInput: document.querySelector("#songContentInput"),
  deleteSongButton: document.querySelector("#deleteSongButton"),
  setDialog: document.querySelector("#setDialog"),
  closeSetDialogButton: document.querySelector("#closeSetDialogButton"),
  saveSetButton: document.querySelector("#saveSetButton"),
  clearAllSetsButton: document.querySelector("#clearAllSetsButton"),
  setNameInput: document.querySelector("#setNameInput"),
  setSongChoices: document.querySelector("#setSongChoices")
};

function updateSyncStatus(text, statusClass = "") {
  if (!el.syncBadge) return;
  el.syncBadge.textContent = text;
  el.syncBadge.className = `sync-badge ${statusClass}`;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          songs: Array.isArray(parsed.songs) ? parsed.songs : sampleSongs,
          sets: Array.isArray(parsed.sets) ? parsed.sets : [],
          readerSize: typeof parsed.readerSize === "number" ? parsed.readerSize : 24,
          scrollSpeed: typeof parsed.scrollSpeed === "number" ? parsed.scrollSpeed : 1
        };
      }
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
    }
  }

  return { songs: sampleSongs, sets: [], readerSize: 24, scrollSpeed: 1 };
}

function deduplicateSongs(songsList) {
  if (!Array.isArray(songsList)) return [];
  const seenTitles = new Set();
  const uniqueSongs = [];

  for (const song of songsList) {
    if (!song || !song.title) continue;
    const titleKey = normalize(song.title.trim());
    if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      uniqueSongs.push(song);
    }
  }

  return uniqueSongs;
}

function saveState() {
  state.songs = deduplicateSongs(state.songs);
  state.sets = deduplicateSets(state.sets);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (window.firebaseInitialized && window.db) {
    window.db.ref("repertoire/songs").set(state.songs.length ? state.songs : null);
    window.db.ref("repertoire/sets").set(state.sets.length ? state.sets : null);
    window.db.ref("repertoire/updatedAt").set(new Date().toISOString()).then(() => {
      updateSyncStatus("🟢 Nuvem ativa", "online");
    }).catch(err => {
      console.error("Erro ao salvar no Firebase:", err);
      updateSyncStatus("🟡 Modo local", "offline");
    });
  }
}

function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val && typeof val === "object") return Object.values(val).filter(Boolean);
  return [];
}

function deduplicateSets(setsList) {
  const sets = toArray(setsList);
  const seen = new Set();
  const result = [];
  for (const set of sets) {
    if (!set || !set.name) continue;
    const nameKey = normalize(set.name.trim());
    if (!seen.has(nameKey)) {
      seen.add(nameKey);
      result.push(set);
    }
  }
  return result;
}

function setupCloudSync() {
  const isCloudReady = typeof initFirebase === "function" && initFirebase();
  if (!isCloudReady) {
    updateSyncStatus("💾 Modo local (sem nuvem)", "offline");
    return;
  }

  window.db.ref(".info/connected").on("value", snap => {
    if (snap.val() === true) {
      updateSyncStatus("🟢 Nuvem ativa", "online");
    } else {
      updateSyncStatus("💾 Modo local (reconectando)", "offline");
    }
  });

  const repRef = window.db.ref("repertoire");
  repRef.on("value", snapshot => {
    const remoteData = snapshot.val();
    if (remoteData !== null && typeof remoteData === "object") {
      const rawSongs = toArray(remoteData.songs);
      const cleanSongs = deduplicateSongs(rawSongs);
      const rawSets = toArray(remoteData.sets);
      const cleanSets = deduplicateSets(rawSets);

      state.songs = cleanSongs;
      state.sets = cleanSets;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderHome();
    } else {
      saveState();
    }
  }, error => {
    console.error("Erro na escuta do Firebase:", error);
    updateSyncStatus("🟡 Modo local", "offline");
  });
}

function normalize(value) {
  return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

function filteredSongs(query = el.quickSearch.value) {
  const needle = normalize(query.trim());
  return [...state.songs]
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
    .filter(song => !needle || normalize(`${song.title} ${song.style}`).includes(needle));
}

function renderHome() {
  state.scrollSpeed ??= 1;
  renderSongs();
  renderSets();
  document.documentElement.style.setProperty("--reader-size", `${state.readerSize}px`);
  renderScrollControls();
  el.backButton.style.visibility = currentSongId ? "visible" : "hidden";
}

function renderSongs() {
  const songs = filteredSongs();
  el.songList.innerHTML = songs.length
    ? songs.map(song => `
      <button class="song-card" data-song-id="${song.id}">
        <strong>${escapeHtml(song.title)}</strong>
        <span>${escapeHtml(song.style || "Sem estilo")} · toque para abrir</span>
      </button>
    `).join("")
    : `<p class="reader-meta">Nenhuma música encontrada.</p>`;
}

function renderSets() {
  const sets = Array.isArray(state.sets) ? state.sets : [];
  const validSongs = Array.isArray(state.songs) ? state.songs : [];

  sets.forEach((set, index) => {
    if (!set.id) set.id = "set-" + index + "-" + Date.now();
  });

  el.setList.innerHTML = sets.length
    ? sets.map((set, index) => {
      const songIds = Array.isArray(set?.songIds) ? set.songIds : [];
      const songTitles = Array.isArray(set?.songTitles) ? set.songTitles : [];
      
      const count = validSongs.filter(song =>
        songIds.includes(song.id) || songTitles.includes(normalize(song.title))
      ).length;

      return `
        <div class="set-card-item">
          <button class="set-card" data-set-id="${set.id}">
            <strong>${escapeHtml(set.name)}</strong>
            <span>${count} musica${count === 1 ? "" : "s"} na sequência</span>
          </button>
          <button type="button" class="btn-delete-set" onclick="window.deleteSetDirect('${set.id}', event)">Excluir</button>
        </div>
      `;
    }).join("")
    : `<p class="reader-meta">Crie uma sequência para tocar por estilo ou ocasião.</p>`;
}

function deleteSet(setIdOrName, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const targetStr = String(setIdOrName || "").trim();
  const setIndex = state.sets.findIndex(s => 
    (s.id && String(s.id) === targetStr) ||
    (s.name && normalize(s.name) === normalize(targetStr))
  );

  if (setIndex === -1) return;

  state.sets.splice(setIndex, 1);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderHome();

  if (window.firebaseInitialized && window.db) {
    const setsRef = window.db.ref("repertoire/sets");
    setsRef.remove().then(() => {
      if (state.sets.length > 0) {
        setsRef.set(state.sets);
      }
    });
  }
}

window.deleteSetDirect = deleteSet;

function clearAllSets() {
  state.sets = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderHome();
  if (window.firebaseInitialized && window.db) {
    window.db.ref("repertoire/sets").remove();
  }
}
window.clearAllSets = clearAllSets;

function openReader(songId, queue = state.songs.map(song => song.id)) {
  const song = state.songs.find(item => item.id === songId);
  if (!song) return;
  currentSongId = songId;
  currentQueue = queue.filter(id => state.songs.some(item => item.id === id));
  el.readerTitle.textContent = song.title;
  el.readerMeta.textContent = song.style || "Sem estilo";
  el.readerContent.innerHTML = highlightChords(song.content);
  el.homeScreen.classList.remove("active");
  el.readerScreen.classList.add("active");
  el.screenHint.textContent = song.title;
  el.backButton.style.visibility = "visible";
  window.scrollTo({ top: 0, behavior: "instant" });
  lastScrollTime = 0;
  renderScrollControls();
  if (autoScrollEnabled) startAutoScroll();
}

function closeReader() {
  stopAutoScroll();
  currentSongId = null;
  currentQueue = [];
  el.readerScreen.classList.remove("active");
  el.homeScreen.classList.add("active");
  el.screenHint.textContent = "";
  el.backButton.style.visibility = "hidden";
  renderHome();
}

function highlightChords(text) {
  const chordLine = /^([A-G](#|b)?(m|maj|min|sus|dim|aug|add)?[0-9]?(\/[A-G](#|b)?)?\s*)+$/;
  return escapeHtml(text)
    .split("\n")
    .map(line => chordLine.test(line.trim()) || line.trim().startsWith("Tom:")
      ? `<span class="chord">${line}</span>`
      : line)
    .join("\n");
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function openSearch() {
  el.searchDialog.showModal();
  el.modalSearchInput.value = el.quickSearch.value;
  renderSearchResults();
  setTimeout(() => el.modalSearchInput.focus(), 50);
}

function renderSearchResults() {
  const songs = filteredSongs(el.modalSearchInput.value);
  el.modalSearchResults.innerHTML = songs.map(song => `
    <button class="song-card" value="cancel" data-song-id="${song.id}">
      <strong>${escapeHtml(song.title)}</strong>
      <span>${escapeHtml(song.style || "Sem estilo")}</span>
    </button>
  `).join("") || `<p class="reader-meta">Nenhuma música encontrada.</p>`;
}

function moveInQueue(step) {
  if (!currentQueue.length) return;
  const index = currentQueue.indexOf(currentSongId);
  const nextIndex = (index + step + currentQueue.length) % currentQueue.length;
  openReader(currentQueue[nextIndex], currentQueue);
}

function renderScrollControls() {
  if (!el.scrollToggleButton) return;
  el.scrollToggleButton.classList.toggle("active", autoScrollEnabled);
  el.scrollToggleButton.textContent = autoScrollEnabled ? "Pausar" : "Rolar";
  el.scrollSpeedDisplay.value = `${state.scrollSpeed || 1}x`;
  el.scrollSpeedDisplay.textContent = `${state.scrollSpeed || 1}x`;
}

function autoScrollStep(timestamp) {
  if (!autoScrollEnabled) return;
  if (!lastScrollTime) {
    lastScrollTime = timestamp;
    currentScrollPos = window.scrollY;
  }

  const elapsed = timestamp - lastScrollTime;
  lastScrollTime = timestamp;

  // Ajusta se o usuário fez rolagem manual
  if (Math.abs(window.scrollY - currentScrollPos) > 12) {
    currentScrollPos = window.scrollY;
  }

  const speedMultiplier = state.scrollSpeed || 1;
  const pixelsPerSecond = 20 * speedMultiplier;
  currentScrollPos += (pixelsPerSecond * elapsed) / 1000;

  const maxTop = document.documentElement.scrollHeight - window.innerHeight;

  if (currentScrollPos >= maxTop - 2) {
    window.scrollTo({ top: maxTop });
    stopAutoScroll();
    return;
  }

  window.scrollTo({ top: currentScrollPos });
  autoScrollFrame = requestAnimationFrame(autoScrollStep);
}

function startAutoScroll() {
  autoScrollEnabled = true;
  cancelAnimationFrame(autoScrollFrame);
  lastScrollTime = 0;
  currentScrollPos = window.scrollY;
  autoScrollFrame = requestAnimationFrame(autoScrollStep);
  renderScrollControls();
}

function stopAutoScroll() {
  autoScrollEnabled = false;
  cancelAnimationFrame(autoScrollFrame);
  autoScrollFrame = null;
  lastScrollTime = 0;
  renderScrollControls();
}

function toggleAutoScroll() {
  if (autoScrollEnabled) stopAutoScroll();
  else startAutoScroll();
}

function changeScrollSpeed(delta) {
  state.scrollSpeed = Math.min(8, Math.max(1, (state.scrollSpeed || 1) + delta));
  saveState();
  lastScrollTime = 0;
  currentScrollPos = window.scrollY;
  renderScrollControls();
}

function changeFont(delta) {
  state.readerSize = Math.min(48, Math.max(18, state.readerSize + delta));
  saveState();
  document.documentElement.style.setProperty("--reader-size", `${state.readerSize}px`);
}

function openSongEditor(songId = null) {
  editingSongId = songId;
  const song = state.songs.find(item => item.id === songId);
  el.songDialogTitle.textContent = song ? "Editar música" : "Nova música";
  el.songTitleInput.value = song?.title || "";
  el.songStyleInput.value = song?.style || "";
  el.songContentInput.value = song?.content || "";
  el.deleteSongButton.hidden = !song;
  el.songDialog.showModal();
}

function saveSong(event) {
  if (event) event.preventDefault();
  const data = {
    title: el.songTitleInput.value.trim(),
    style: el.songStyleInput.value.trim(),
    content: el.songContentInput.value.trim()
  };
  if (!data.title || !data.content) return;

  if (editingSongId) {
    state.songs = state.songs.map(song => song.id === editingSongId ? { ...song, ...data } : song);
  } else {
    state.songs.push({ id: generateId(), ...data });
  }

  saveState();
  if (el.songDialog.open) el.songDialog.close();
  renderHome();
  if (editingSongId === currentSongId) openReader(editingSongId, currentQueue);
}

function deleteSongByIdOrTitle(targetId) {
  if (!targetId) return false;

  const song = state.songs.find(s => s.id === targetId);
  const songTitle = song ? song.title : "esta música";
  const titleKey = song ? normalize(song.title) : "";

  if (!confirm(`Tem certeza que deseja excluir "${songTitle}"?`)) return false;

  const remainingSongs = state.songs.filter(s => {
    if (s.id === targetId) return false;
    if (titleKey && normalize(s.title) === titleKey) return false;
    return true;
  });

  const deletedIds = new Set(
    state.songs
      .filter(s => s.id === targetId || (titleKey && normalize(s.title) === titleKey))
      .map(s => s.id)
  );

  state.songs = remainingSongs;
  state.sets = state.sets.map(set => ({
    ...set,
    songIds: set.songIds.filter(id => !deletedIds.has(id))
  }));

  saveState();
  if (el.songDialog.open) el.songDialog.close();
  if (currentSongId && deletedIds.has(currentSongId)) closeReader();
  renderHome();
  return true;
}

function deleteSong(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!editingSongId) return;

  const idToDelete = editingSongId;
  editingSongId = null;

  el.songTitleInput.value = "";
  el.songStyleInput.value = "";
  el.songContentInput.value = "";

  deleteSongByIdOrTitle(idToDelete);
}

function openSetEditor() {
  el.setNameInput.value = "";
  el.setSongChoices.innerHTML = state.songs
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
    .map(song => `
      <label class="choice-item">
        <input type="checkbox" value="${song.id}">
        <span class="choice-title">${escapeHtml(song.title)}</span>
        <span class="choice-style">${escapeHtml(song.style || "Sem estilo")}</span>
      </label>
    `).join("");
  el.setDialog.showModal();
}

function switchTab(tabName) {
  el.tabs.forEach(item => item.classList.toggle("active", item.dataset.tab === tabName));
  el.songsPanel.classList.toggle("active", tabName === "songs");
  el.setsPanel.classList.toggle("active", tabName === "sets");
}

function saveSet(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const name = el.setNameInput.value.trim();
  if (!name) {
    alert("Por favor, digite um nome para a sequência.");
    if (el.setNameInput) el.setNameInput.focus();
    return;
  }

  const selectedInputs = [...el.setSongChoices.querySelectorAll("input:checked")];
  const songIds = selectedInputs.map(input => input.value);
  const songTitles = selectedInputs.map(input => {
    const song = state.songs.find(s => s.id === input.value);
    return song ? normalize(song.title) : "";
  }).filter(Boolean);

  const newSet = {
    id: generateId(),
    name,
    songIds,
    songTitles,
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(state.sets)) state.sets = [];
  state.sets.unshift(newSet);
  
  saveState();
  if (el.setDialog.open) el.setDialog.close();
  switchTab("sets");
  renderHome();
  alert(`Sequência "${name}" salva com sucesso!`);
}

function exportRepertoire() {
  const data = {
    app: "cifras-charles",
    version: 1,
    exportedAt: new Date().toISOString(),
    songs: state.songs,
    sets: state.sets
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `repertorio-cifras-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeImportedRepertoire(data) {
  if (!data || !Array.isArray(data.songs)) {
    throw new Error("Arquivo de repertorio invalido.");
  }

  const usedIds = new Set();
  const songs = data.songs.map(song => {
    const id = typeof song.id === "string" && song.id.trim() && !usedIds.has(song.id)
      ? song.id
      : crypto.randomUUID();
    usedIds.add(id);

    return {
      id,
      title: String(song.title || "").trim(),
      style: String(song.style || "").trim(),
      content: String(song.content || "").trim()
    };
  }).filter(song => song.title && song.content);

  if (!songs.length) {
    throw new Error("O arquivo nao tem musicas validas.");
  }

  const songIds = new Set(songs.map(song => song.id));
  const sets = Array.isArray(data.sets) ? data.sets.map(set => ({
    id: typeof set.id === "string" && set.id.trim() ? set.id : crypto.randomUUID(),
    name: String(set.name || "").trim(),
    songIds: Array.isArray(set.songIds) ? set.songIds.filter(id => songIds.has(id)) : []
  })).filter(set => set.name && set.songIds.length) : [];

  return {
    ...state,
    songs,
    sets
  };
}

function importRepertoireFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = sanitizeImportedRepertoire(JSON.parse(reader.result));
      const ok = confirm("Importar este arquivo vai substituir as musicas e sequencias salvas neste aparelho. Deseja continuar?");
      if (!ok) return;

      stopAutoScroll();
      state = imported;
      currentSongId = null;
      currentQueue = [];
      saveState();
      closeReader();
      renderHome();
      alert("Repertorio importado com sucesso.");
    } catch (error) {
      alert(error.message || "Nao foi possivel importar este arquivo.");
    } finally {
      el.importFileInput.value = "";
    }
  });
  reader.readAsText(file);
}

el.quickSearch.addEventListener("input", renderSongs);
el.searchButton.addEventListener("click", openSearch);
el.floatingSearchButton.addEventListener("click", openSearch);
el.modalSearchInput.addEventListener("input", renderSearchResults);
el.backButton.addEventListener("click", closeReader);
el.fullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

el.songList.addEventListener("click", event => {
  const card = event.target.closest("[data-song-id]");
  if (card) openReader(card.dataset.songId, filteredSongs().map(song => song.id));
});

el.setList.addEventListener("click", event => {
  const deleteBtn = event.target.closest("[data-delete-set-id]");
  if (deleteBtn) {
    event.preventDefault();
    event.stopPropagation();
    deleteSet(deleteBtn.dataset.deleteSetId, event);
    return;
  }

  const card = event.target.closest("[data-set-id]");
  if (card) {
    const set = state.sets.find(item => item.id === card.dataset.setId);
    if (set) {
      const queueSongs = Array.isArray(set.songIds) && set.songIds.length ? set.songIds : state.songs.map(s => s.id);
      openReader(queueSongs[0], queueSongs);
    }
  }
});

el.modalSearchResults.addEventListener("click", event => {
  const card = event.target.closest("[data-song-id]");
  if (card) {
    el.searchDialog.close();
    openReader(card.dataset.songId, filteredSongs(el.modalSearchInput.value).map(song => song.id));
  }
});

el.tabs.forEach(tab => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

el.prevSongButton.addEventListener("click", () => moveInQueue(-1));
el.nextSongButton.addEventListener("click", () => moveInQueue(1));
el.fontDownButton.addEventListener("click", () => changeFont(-2));
el.fontUpButton.addEventListener("click", () => changeFont(2));
el.scrollToggleButton.addEventListener("click", toggleAutoScroll);
el.scrollSlowerButton.addEventListener("click", () => changeScrollSpeed(-1));
el.scrollFasterButton.addEventListener("click", () => changeScrollSpeed(1));
el.editSongButton.addEventListener("click", () => openSongEditor(currentSongId));
el.directDeleteSongButton.addEventListener("click", () => deleteSongByIdOrTitle(currentSongId));
el.newSongButton.addEventListener("click", () => openSongEditor());
el.newSetButton.addEventListener("click", openSetEditor);
el.clearAllSetsButton?.addEventListener("click", clearAllSets);
el.saveSongButton.addEventListener("click", saveSong);
el.deleteSongButton.addEventListener("click", deleteSong);
el.saveSetButton.addEventListener("click", saveSet);
el.closeSetDialogButton.addEventListener("click", () => el.setDialog.close());

let pinchStartDistance = 0;
el.readerContent.addEventListener("touchstart", event => {
  if (event.touches.length === 2) {
    lastTouchWasPinch = true;
    pinchStartDistance = Math.hypot(
      event.touches[0].clientX - event.touches[1].clientX,
      event.touches[0].clientY - event.touches[1].clientY
    );
  }
}, { passive: true });

el.readerContent.addEventListener("touchend", event => {
  if (pinchStartDistance && event.changedTouches.length) {
    pinchStartDistance = 0;
  }
  setTimeout(() => {
    lastTouchWasPinch = false;
  }, 120);
}, { passive: true });

el.readerContent.addEventListener("touchmove", event => {
  if (event.touches.length !== 2 || !pinchStartDistance) return;
  const distance = Math.hypot(
    event.touches[0].clientX - event.touches[1].clientX,
    event.touches[0].clientY - event.touches[1].clientY
  );
  if (Math.abs(distance - pinchStartDistance) > 28) {
    changeFont(distance > pinchStartDistance ? 2 : -2);
    pinchStartDistance = distance;
  }
}, { passive: true });

el.readerScreen.addEventListener("click", event => {
  if (!currentSongId || lastTouchWasPinch) return;
  if (event.target.closest("button, input, textarea, dialog, .topbar, .reader-tools")) return;

  const middleBand = event.clientY > window.innerHeight * 0.15 && event.clientY < window.innerHeight * 0.88;
  if (!middleBand) return;

  const isRightSide = event.clientX >= window.innerWidth * 0.5;

  event.preventDefault();
  if (isRightSide) {
    moveInQueue(1); // Próxima música
  } else {
    moveInQueue(-1); // Música anterior
  }
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js");
}

setupCloudSync();
renderHome();

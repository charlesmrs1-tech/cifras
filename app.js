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
let state = loadState();
let isAdmin = localStorage.getItem("isAdmin") === "true";

if (Array.isArray(state.sets)) {
  state.sets = state.sets.filter(s => s && s.name && normalize(s.name) !== "teste");
}
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
  brandTitle: document.querySelector(".brand strong"),
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
  newSetButton: document.querySelector("#newSetButton"),
  setDialog: document.querySelector("#setDialog"),
  setDialogTitle: document.querySelector("#setDialogTitle"),
  closeSetDialogButton: document.querySelector("#closeSetDialogButton"),
  saveSetButton: document.querySelector("#saveSetButton"),
  clearAllSetsButton: document.querySelector("#clearAllSetsButton"),
  setNameInput: document.querySelector("#setNameInput"),
  selectedSetSongsList: document.querySelector("#selectedSetSongsList"),
  setAvailableSearch: document.querySelector("#setAvailableSearch"),
  availableSetSongsList: document.querySelector("#availableSetSongsList")
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
    .filter(song => !needle || normalize(`${song.title} ${song.style}`).includes(needle));
}

function renderHome() {
  renderSongs();
  renderSets();
  document.documentElement.style.setProperty("--reader-size", `${state.readerSize}px`);
  renderScrollControls();
  el.backButton.style.visibility = currentSongId ? "visible" : "hidden";
  
  // Controle de acesso aos botões principais
  el.newSongButton.style.display = isAdmin ? "inline-flex" : "none";
  if (el.newSetButton) el.newSetButton.style.display = isAdmin ? "inline-flex" : "none";
  if (el.clearAllSetsButton) el.clearAllSetsButton.style.display = isAdmin ? "inline-flex" : "none";
  el.editSongButton.style.display = isAdmin ? "inline-flex" : "none";
  el.directDeleteSongButton.style.display = isAdmin ? "inline-flex" : "none";
}

function renderSongs() {
  const songs = filteredSongs();
  el.songList.innerHTML = songs.length
    ? songs.map(song => `
      <div class="song-card-item">
        <button class="song-card" data-song-id="${song.id}">
          <strong>${escapeHtml(song.title)}</strong>
          <span>${escapeHtml(song.style || "Sem estilo")} · toque para abrir</span>
        </button>
        ${isAdmin ? `<button type="button" class="btn-delete-item" onclick="window.deleteSongDirect('${song.id}', event)">Excluir</button>` : ""}
      </div>
    `).join("")
    : `<p class="reader-meta">Nenhuma música encontrada.</p>`;
}

function deleteSongDirect(songId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const songIndex = state.songs.findIndex(s => s.id === songId);
  if (songIndex === -1) return;

  state.songs.splice(songIndex, 1);
  saveState();
  renderHome();
}

window.deleteSongDirect = deleteSongDirect;

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
          ${isAdmin ? `
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <button type="button" class="btn-delete-item" style="color: var(--primary); border-color: rgba(167, 243, 208, 0.4);" onclick="openSetEditor('${set.id}')">Editar</button>
            <button type="button" class="btn-delete-item" onclick="window.deleteSetDirect('${set.id}', event)">Excluir</button>
          </div>
          ` : ""}
        </div>
      `;
    }).join("")
    : `<p class="reader-meta">Crie uma sequência para organizar suas músicas.</p>`;
}

function deleteSet(setIdOrName, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const targetStr = String(setIdOrName || "").trim();
  const targetNorm = normalize(targetStr);

  state.sets = state.sets.filter(s => {
    if (!s) return false;
    const sId = String(s.id || "").trim();
    const sName = normalize(s.name || "");
    if (sId === targetStr || sName === targetNorm) return false;
    return true;
  });

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
  if (!confirm("Tem certeza que deseja apagar todas as sequências?")) return;
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

function exportRepertoire() {
  const data = {
    app: "cifras-charles",
    version: 1,
    exportedAt: new Date().toISOString(),
    songs: state.songs
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

  return {
    ...state,
    songs
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

let didDrag = false;

el.songList.addEventListener("click", event => {
  if (didDrag) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const card = event.target.closest("[data-song-id]");
  if (card) openReader(card.dataset.songId, filteredSongs().map(song => song.id));
});

let dragTimer = null;
let dragElement = null;
let dragStartIndex = -1;
let dragStartY = 0;
let isDragging = false;
let dragPlaceholder = null;

function handleDragStart(e, target) {
  didDrag = false;
  if (!isAdmin) return; // Somente administradores podem reordenar
  if (isDragging || (e.button !== undefined && e.button !== 0)) return;
  
  const item = target.closest(".song-card-item");
  if (!item) return;

  const button = target.closest("button:not(.song-card)");
  if (button) return; 

  dragTimer = setTimeout(() => {
    isDragging = true;
    didDrag = true;
    dragElement = item;
    
    if (el.quickSearch.value.trim()) {
       isDragging = false;
       return;
    }
    
    const allItems = [...el.songList.querySelectorAll('.song-card-item')];
    dragStartIndex = allItems.indexOf(item);
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY = clientY;
    
    const rect = item.getBoundingClientRect();
    
    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'song-card-item drag-placeholder';
    dragPlaceholder.style.height = rect.height + 'px';
    dragPlaceholder.style.border = '2px dashed var(--muted)';
    dragPlaceholder.style.borderRadius = '12px';
    dragPlaceholder.style.margin = '4px 0';
    
    item.parentNode.insertBefore(dragPlaceholder, item);
    
    item.classList.add('dragging');
    item.style.position = 'absolute';
    item.style.top = item.offsetTop + 'px';
    item.style.left = item.offsetLeft + 'px';
    item.style.width = item.offsetWidth + 'px';
    item.style.zIndex = '1000';
    item.style.margin = '0';
    
    if(navigator.vibrate) navigator.vibrate(50);
  }, 400); 
}

function handleDragMove(e) {
  if (!isDragging || !dragElement) {
    if (dragTimer) {
       const clientY = e.touches ? e.touches[0].clientY : e.clientY;
       if (dragStartY && Math.abs(clientY - dragStartY) > 10) {
           clearTimeout(dragTimer);
           dragTimer = null;
       }
    }
    return;
  }
  
  if (e.cancelable) e.preventDefault(); 
  
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const deltaY = clientY - dragStartY;
  dragElement.style.transform = `translateY(${deltaY}px)`;

  const allItems = [...el.songList.querySelectorAll('.song-card-item:not(.dragging)')];
  let hoverElement = null;
  
  for (const item of allItems) {
    if (item === dragPlaceholder) continue;
    const rect = item.getBoundingClientRect();
    if (clientY > rect.top && clientY < rect.bottom) {
      hoverElement = item;
      break;
    }
  }

  if (hoverElement) {
    const rect = hoverElement.getBoundingClientRect();
    const isAfter = clientY > rect.top + rect.height / 2;
    if (isAfter) {
      hoverElement.parentNode.insertBefore(dragPlaceholder, hoverElement.nextSibling);
    } else {
      hoverElement.parentNode.insertBefore(dragPlaceholder, hoverElement);
    }
  }
}

function handleDragEnd(e) {
  if (dragTimer) {
    clearTimeout(dragTimer);
    dragTimer = null;
  }
  
  if (!isDragging) return;
  
  isDragging = false;
  dragElement.classList.remove('dragging');
  dragElement.style.position = '';
  dragElement.style.top = '';
  dragElement.style.left = '';
  dragElement.style.width = '';
  dragElement.style.transform = '';
  dragElement.style.zIndex = '';
  dragElement.style.margin = '';
  
  if (dragPlaceholder && dragPlaceholder.parentNode) {
    dragPlaceholder.parentNode.insertBefore(dragElement, dragPlaceholder);
    dragPlaceholder.parentNode.removeChild(dragPlaceholder);
  }
  dragPlaceholder = null;
  
  const allItems = [...el.songList.querySelectorAll('.song-card-item')];
  const endIndex = allItems.indexOf(dragElement);
  
  if (dragStartIndex !== -1 && endIndex !== -1 && dragStartIndex !== endIndex) {
    const movedItem = state.songs.splice(dragStartIndex, 1)[0];
    state.songs.splice(endIndex, 0, movedItem);
    saveState();
  }
  
  dragStartIndex = -1;
  dragElement = null;
  
  setTimeout(() => didDrag = false, 50);
}

el.songList.addEventListener("mousedown", e => {
  dragStartY = e.clientY;
  handleDragStart(e, e.target);
});
el.songList.addEventListener("touchstart", e => {
  dragStartY = e.touches[0].clientY;
  handleDragStart(e, e.target);
}, {passive: true});

window.addEventListener("mousemove", handleDragMove, {passive: false});
window.addEventListener("touchmove", handleDragMove, {passive: false});

window.addEventListener("mouseup", handleDragEnd);
window.addEventListener("touchend", handleDragEnd);

el.modalSearchResults.addEventListener("click", event => {
  const card = event.target.closest("[data-song-id]");
  if (card) {
    el.searchDialog.close();
    openReader(card.dataset.songId, filteredSongs(el.modalSearchInput.value).map(song => song.id));
  }
});

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
el.saveSongButton.addEventListener("click", saveSong);
el.deleteSongButton.addEventListener("click", deleteSong);

el.setAvailableSearch.addEventListener("input", e => renderSetEditorLists(e.target.value));

el.setList.addEventListener("click", event => {
  const deleteBtn = event.target.closest(".btn-delete-item");
  if (deleteBtn) {
    return; // Os botões de excluir/editar usam onclick inline agora
  }

  const card = event.target.closest("[data-set-id]");
  if (card) {
    const set = state.sets.find(item => item.id === card.dataset.setId);
    if (set) {
      const queueSongs = Array.isArray(set.songIds) && set.songIds.length ? set.songIds : [];
      if (queueSongs.length > 0) {
        openReader(queueSongs[0], queueSongs);
      } else {
        alert("Esta sequência não possui músicas adicionadas.");
      }
    }
  }
});

el.tabs.forEach(tab => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

el.newSetButton.addEventListener("click", () => openSetEditor());
el.clearAllSetsButton?.addEventListener("click", clearAllSets);
el.saveSetButton.addEventListener("click", saveSet);
el.closeSetDialogButton.addEventListener("click", () => el.setDialog.close());

el.selectedSetSongsList.addEventListener("mousedown", e => {
  setDragStartY = e.clientY;
  handleSetDragStart(e, e.target);
});
el.selectedSetSongsList.addEventListener("touchstart", e => {
  setDragStartY = e.touches[0].clientY;
  handleSetDragStart(e, e.target);
}, {passive: true});

window.addEventListener("mousemove", handleSetDragMove, {passive: false});
window.addEventListener("touchmove", handleSetDragMove, {passive: false});

window.addEventListener("mouseup", handleSetDragEnd);
window.addEventListener("touchend", handleSetDragEnd);

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

// Lógica secreta de Admin
let brandTapCount = 0;
let brandTapTimer = null;
if (el.brandTitle) {
  el.brandTitle.addEventListener("click", () => {
    brandTapCount++;
    clearTimeout(brandTapTimer);
    if (brandTapCount >= 5) {
      brandTapCount = 0;
      if (isAdmin) {
         if (confirm("Deseja sair do modo administrador (voltar para Leitura)?")) {
           localStorage.removeItem("isAdmin");
           location.reload();
         }
      } else {
         const pwd = prompt("Digite a senha de administrador:");
         if (pwd === "charles123") {
           localStorage.setItem("isAdmin", "true");
           alert("Modo Administrador ativado!");
           location.reload();
         } else if (pwd !== null) {
           alert("Senha incorreta.");
         }
      }
    } else {
      brandTapTimer = setTimeout(() => brandTapCount = 0, 500);
    }
  });
}

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

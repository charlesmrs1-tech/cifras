const STORAGE_KEY = "cifras-charles-v1";

const sampleSongs = [
  {
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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

const sampleSets = [
  { id: crypto.randomUUID(), name: "Sertanejo modas", songIds: [] },
  { id: crypto.randomUUID(), name: "Rock nacional", songIds: [] }
];

let state = loadState();
let currentSongId = null;
let currentQueue = [];
let editingSongId = null;
let autoScrollEnabled = false;
let autoScrollFrame = null;
let lastScrollTime = 0;
let lastTouchWasPinch = false;

const el = {
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
  newSongButton: document.querySelector("#newSongButton"),
  newSetButton: document.querySelector("#newSetButton"),
  searchDialog: document.querySelector("#searchDialog"),
  modalSearchInput: document.querySelector("#modalSearchInput"),
  modalSearchResults: document.querySelector("#modalSearchResults"),
  songDialog: document.querySelector("#songDialog"),
  songForm: document.querySelector("#songForm"),
  songDialogTitle: document.querySelector("#songDialogTitle"),
  songTitleInput: document.querySelector("#songTitleInput"),
  songStyleInput: document.querySelector("#songStyleInput"),
  songContentInput: document.querySelector("#songContentInput"),
  deleteSongButton: document.querySelector("#deleteSongButton"),
  setDialog: document.querySelector("#setDialog"),
  setForm: document.querySelector("#setForm"),
  setNameInput: document.querySelector("#setNameInput"),
  setSongChoices: document.querySelector("#setSongChoices")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  sampleSets[0].songIds = sampleSongs.filter(song => song.style.includes("Sertanejo")).map(song => song.id);
  sampleSets[1].songIds = sampleSongs.filter(song => song.style.includes("Rock")).map(song => song.id);
  return { songs: sampleSongs, sets: sampleSets, readerSize: 24, scrollSpeed: 1 };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalize(value) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  el.setList.innerHTML = state.sets.length
    ? state.sets.map(set => {
      const count = set.songIds.filter(id => state.songs.some(song => song.id === id)).length;
      return `
        <button class="set-card" data-set-id="${set.id}">
          <strong>${escapeHtml(set.name)}</strong>
          <span>${count} musica${count === 1 ? "" : "s"} na sequência</span>
        </button>
      `;
    }).join("")
    : `<p class="reader-meta">Crie uma sequência para tocar por estilo ou ocasião.</p>`;
}

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
  el.screenHint.textContent = "Biblioteca";
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
  if (!lastScrollTime) lastScrollTime = timestamp;

  const elapsed = timestamp - lastScrollTime;
  const pixelsPerSecond = 16 * (state.scrollSpeed || 1);
  const maxTop = document.documentElement.scrollHeight - window.innerHeight;
  const nextTop = window.scrollY + (pixelsPerSecond * elapsed / 1000);
  lastScrollTime = timestamp;

  if (nextTop >= maxTop - 2) {
    window.scrollTo({ top: maxTop });
    stopAutoScroll();
    return;
  }

  window.scrollTo({ top: nextTop });
  autoScrollFrame = requestAnimationFrame(autoScrollStep);
}

function startAutoScroll() {
  autoScrollEnabled = true;
  cancelAnimationFrame(autoScrollFrame);
  lastScrollTime = 0;
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

function saveSong() {
  const data = {
    title: el.songTitleInput.value.trim(),
    style: el.songStyleInput.value.trim(),
    content: el.songContentInput.value.trim()
  };
  if (!data.title || !data.content) return;

  if (editingSongId) {
    state.songs = state.songs.map(song => song.id === editingSongId ? { ...song, ...data } : song);
  } else {
    state.songs.push({ id: crypto.randomUUID(), ...data });
  }

  saveState();
  renderHome();
  if (editingSongId === currentSongId) openReader(editingSongId, currentQueue);
}

function deleteSong() {
  if (!editingSongId) return;
  state.songs = state.songs.filter(song => song.id !== editingSongId);
  state.sets = state.sets.map(set => ({ ...set, songIds: set.songIds.filter(id => id !== editingSongId) }));
  saveState();
  el.songDialog.close();
  closeReader();
}

function openSetEditor() {
  el.setNameInput.value = "";
  el.setSongChoices.innerHTML = state.songs
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
    .map(song => `
      <label>
        <input type="checkbox" value="${song.id}">
        <span>${escapeHtml(song.title)} · ${escapeHtml(song.style || "Sem estilo")}</span>
      </label>
    `).join("");
  el.setDialog.showModal();
}

function saveSet() {
  const name = el.setNameInput.value.trim();
  const songIds = [...el.setSongChoices.querySelectorAll("input:checked")].map(input => input.value);
  if (!name || !songIds.length) return;
  state.sets.push({ id: crypto.randomUUID(), name, songIds });
  saveState();
  renderHome();
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
  const card = event.target.closest("[data-set-id]");
  const set = state.sets.find(item => item.id === card?.dataset.setId);
  if (set?.songIds.length) openReader(set.songIds[0], set.songIds);
});

el.modalSearchResults.addEventListener("click", event => {
  const card = event.target.closest("[data-song-id]");
  if (card) {
    el.searchDialog.close();
    openReader(card.dataset.songId, filteredSongs(el.modalSearchInput.value).map(song => song.id));
  }
});

el.tabs.forEach(tab => tab.addEventListener("click", () => {
  el.tabs.forEach(item => item.classList.toggle("active", item === tab));
  el.songsPanel.classList.toggle("active", tab.dataset.tab === "songs");
  el.setsPanel.classList.toggle("active", tab.dataset.tab === "sets");
}));

el.prevSongButton.addEventListener("click", () => moveInQueue(-1));
el.nextSongButton.addEventListener("click", () => moveInQueue(1));
el.fontDownButton.addEventListener("click", () => changeFont(-2));
el.fontUpButton.addEventListener("click", () => changeFont(2));
el.scrollToggleButton.addEventListener("click", toggleAutoScroll);
el.scrollSlowerButton.addEventListener("click", () => changeScrollSpeed(-1));
el.scrollFasterButton.addEventListener("click", () => changeScrollSpeed(1));
el.editSongButton.addEventListener("click", () => openSongEditor(currentSongId));
el.newSongButton.addEventListener("click", () => openSongEditor());
el.newSetButton.addEventListener("click", openSetEditor);
el.songForm.addEventListener("submit", saveSong);
el.setForm.addEventListener("submit", saveSet);
el.deleteSongButton.addEventListener("click", deleteSong);

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

  const rightSide = event.clientX > window.innerWidth * 0.55;
  const middleBand = event.clientY > window.innerHeight * 0.22 && event.clientY < window.innerHeight * 0.86;

  if (rightSide && middleBand) {
    event.preventDefault();
    moveInQueue(1);
  }
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js");
}

renderHome();

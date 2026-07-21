firebase.initializeApp(firebaseConfig);
const dataRef = firebase.database().ref("tanismaData");

const DEFAULT_CATEGORIES = [
  "Çizgi Film",
  "Film",
  "Dizi",
  "Müzik / Şarkı",
  "Kitap",
  "Yemek",
  "İçecek",
  "Tatlı",
  "Renk",
  "Araba",
  "Gezilecek Yer / Şehir",
  "Teknoloji / Cihaz",
  "Hayvan",
  "Spor",
  "Oyun",
  "Takı / Aksesuar",
  "Kıyafet / Stil",
  "Parfüm / Koku",
  "Mekan Türü",
  "Hobi",
];

const state = {
  categories: [],
};

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function saveData() {
  dataRef.set({ categories: state.categories });
}

function initializeCategories() {
  if (state.categories.length === 0) {
    state.categories = DEFAULT_CATEGORIES.map((name) => ({ id: generateId(), name, items: [] }));
    saveData();
  }
}

function findCategory(categoryId) {
  return state.categories.find((c) => c.id === categoryId);
}

function createCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const exists = state.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    alert("Bu isimde bir kategori zaten var.");
    return;
  }
  state.categories.push({ id: generateId(), name: trimmed, items: [] });
  saveData();
  renderCategorySelect();
  renderCategories();
}

function deleteCategory(categoryId) {
  const category = findCategory(categoryId);
  if (!category) return;
  const confirmed = confirm(`"${category.name}" kategorisini ve içindeki tüm öğeleri silmek istediğinize emin misiniz?`);
  if (!confirmed) return;
  state.categories = state.categories.filter((c) => c.id !== categoryId);
  saveData();
  renderCategorySelect();
  renderCategories();
}

function addItemToCategory(categoryId, item) {
  const category = findCategory(categoryId);
  if (!category) return;
  category.items.push(item);
  saveData();
  renderCategories();
}

function removeItem(categoryId, itemId) {
  const category = findCategory(categoryId);
  if (!category) return;
  category.items = category.items.filter((i) => i.id !== itemId);
  saveData();
  renderCategories();
}

function reorderItem(categoryId, fromIndex, toIndex) {
  const category = findCategory(categoryId);
  if (!category) return;
  if (fromIndex === toIndex) return;
  const items = category.items;
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  saveData();
  renderCategories();
}

function setItemDescription(categoryId, itemId, description) {
  const category = findCategory(categoryId);
  if (!category) return;
  const item = category.items.find((i) => i.id === itemId);
  if (!item) return;
  item.description = description;
  saveData();
  renderCategories();
}

function rankLabel(index) {
  const number = index + 1;
  if (number === 1) return "1. Favorimiz 🏆";
  return `${number}. Favorimiz`;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

const categorySelect = document.getElementById("category-select");
const categoriesContainer = document.getElementById("categories-container");
const categoryTemplate = document.getElementById("category-template");
const itemTemplate = document.getElementById("item-template");
const searchCardTemplate = document.getElementById("search-card-template");

function renderCategorySelect() {
  const previousValue = categorySelect.value;
  categorySelect.innerHTML = "";
  if (state.categories.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Önce bir kategori oluşturun";
    categorySelect.appendChild(option);
    categorySelect.disabled = true;
    return;
  }
  categorySelect.disabled = false;
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  });
  if (state.categories.some((c) => c.id === previousValue)) {
    categorySelect.value = previousValue;
  }
}

function renderCategories() {
  categoriesContainer.innerHTML = "";
  state.categories.forEach((category) => {
    const node = categoryTemplate.content.cloneNode(true);
    const card = node.querySelector(".category-card");
    const title = node.querySelector(".category-title");
    const deleteBtn = node.querySelector(".delete-category-btn");
    const list = node.querySelector(".item-list");

    title.textContent = category.name;
    deleteBtn.addEventListener("click", () => deleteCategory(category.id));

    if (category.items.length === 0) {
      const hint = document.createElement("li");
      hint.className = "empty-hint";
      hint.textContent = "Henüz içerik eklenmedi.";
      list.appendChild(hint);
    } else {
      category.items.forEach((item, index) => {
        const itemNode = itemTemplate.content.cloneNode(true);
        const row = itemNode.querySelector(".item-row");
        const badge = itemNode.querySelector(".rank-badge");
        const image = itemNode.querySelector(".item-image");
        const name = itemNode.querySelector(".item-name");
        const removeBtn = itemNode.querySelector(".remove-item-btn");
        const editBtn = itemNode.querySelector(".edit-note-btn");
        const notePreview = itemNode.querySelector(".item-note-preview");
        const noteEditor = itemNode.querySelector(".item-note-editor");
        const noteTextarea = itemNode.querySelector(".item-note-textarea");
        const saveNoteBtn = itemNode.querySelector(".save-note-btn");

        row.dataset.categoryId = category.id;
        row.dataset.index = String(index);
        badge.textContent = rankLabel(index);
        image.src = item.imageUrl;
        image.alt = item.term;
        name.textContent = item.term;
        removeBtn.addEventListener("click", () => removeItem(category.id, item.id));

        const description = item.description || "";
        editBtn.classList.toggle("has-note", Boolean(description));
        notePreview.textContent = truncateText(description, 60);
        notePreview.hidden = !description;
        noteEditor.hidden = true;

        const openEditor = () => {
          noteTextarea.value = item.description || "";
          noteEditor.hidden = false;
          notePreview.hidden = true;
          noteTextarea.focus();
        };
        const closeEditor = () => {
          noteEditor.hidden = true;
          notePreview.hidden = !description;
        };

        editBtn.addEventListener("click", () => {
          if (noteEditor.hidden) openEditor();
          else closeEditor();
        });
        notePreview.addEventListener("click", openEditor);
        saveNoteBtn.addEventListener("click", () => {
          setItemDescription(category.id, item.id, noteTextarea.value.trim());
        });

        attachDragEvents(row);

        list.appendChild(itemNode);
      });
    }

    categoriesContainer.appendChild(node);
  });
}

let dragState = null;

function attachDragEvents(row) {
  row.addEventListener("dragstart", (e) => {
    dragState = {
      categoryId: row.dataset.categoryId,
      fromIndex: Number(row.dataset.index),
    };
    row.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  row.addEventListener("dragend", () => {
    row.classList.remove("dragging");
    document.querySelectorAll(".item-row.drag-over").forEach((el) => el.classList.remove("drag-over"));
    dragState = null;
  });

  row.addEventListener("dragover", (e) => {
    if (!dragState || dragState.categoryId !== row.dataset.categoryId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    row.classList.add("drag-over");
  });

  row.addEventListener("dragleave", () => {
    row.classList.remove("drag-over");
  });

  row.addEventListener("drop", (e) => {
    if (!dragState || dragState.categoryId !== row.dataset.categoryId) return;
    e.preventDefault();
    row.classList.remove("drag-over");
    const toIndex = Number(row.dataset.index);
    reorderItem(dragState.categoryId, dragState.fromIndex, toIndex);
  });
}

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchStatus = document.getElementById("search-status");
const searchResults = document.getElementById("search-results");

async function fetchSerperImages(term) {
  const response = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: term }),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data && data.message ? data.message : `İstek başarısız (${response.status})`;
    throw new Error(message);
  }
  return Array.isArray(data.images) ? data.images : [];
}

async function searchImages(term) {
  const keyMissing = !SERPER_API_KEY || SERPER_API_KEY === "BURAYA_KENDI_API_KEYINI_YAZ";
  if (keyMissing) {
    searchStatus.textContent = "Lütfen önce config.js dosyasına kendi Serper.dev API anahtarınızı girin.";
    return;
  }

  searchStatus.textContent = "Aranıyor...";
  searchResults.innerHTML = "";

  try {
    const images = await fetchSerperImages(term);

    if (images.length === 0) {
      searchStatus.textContent = `"${term}" için sonuç bulunamadı.`;
      return;
    }

    searchStatus.textContent = `${images.length} sonuç bulundu.`;
    renderSearchResults(images, term);
  } catch (err) {
    searchStatus.textContent = `Arama sırasında bir hata oluştu: ${err.message}`;
  }
}

function renderSearchResults(images, term) {
  searchResults.innerHTML = "";
  images.forEach((item) => {
    const node = searchCardTemplate.content.cloneNode(true);
    const card = node.querySelector(".search-card");
    const image = node.querySelector(".search-card-image");
    const tag = node.querySelector(".search-card-tag");

    image.src = item.thumbnailUrl || item.imageUrl;
    image.alt = item.title || term;
    tag.textContent = item.title || term;

    const addToSelectedCategory = () => {
      const categoryId = categorySelect.value;
      if (!categoryId) {
        alert("Lütfen önce bir kategori oluşturun ve seçin.");
        return;
      }
      addItemToCategory(categoryId, {
        id: generateId(),
        imageUrl: item.imageUrl,
        term: term,
      });
    };

    card.addEventListener("click", addToSelectedCategory);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        addToSelectedCategory();
      }
    });

    searchResults.appendChild(node);
  });
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const term = searchInput.value.trim();
  if (!term) return;
  searchImages(term);
});

const newCategoryForm = document.getElementById("new-category-form");
const newCategoryInput = document.getElementById("new-category-input");

newCategoryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  createCategory(newCategoryInput.value);
  newCategoryInput.value = "";
});

searchStatus.textContent = "Ortak liste yükleniyor...";

dataRef.on("value", (snapshot) => {
  const data = snapshot.val();
  const rawCategories = data && Array.isArray(data.categories) ? data.categories : [];
  state.categories = rawCategories.map((category) => ({
    ...category,
    items: Array.isArray(category.items) ? category.items : [],
  }));
  initializeCategories();
  if (searchStatus.textContent === "Ortak liste yükleniyor...") {
    searchStatus.textContent = "";
  }
  renderCategorySelect();
  renderCategories();
});

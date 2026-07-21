firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const USERS = ["ibo", "zehra"];
const USER_LABELS = { ibo: "İbo", zehra: "Zehra" };
const OWNER_TITLES = { ibo: "İbo'nun Favorileri", zehra: "Zehra'nın Favorileri" };
const CURRENT_USER_KEY = "tanismaCurrentUser";

function userCategoriesRef(user) {
  return db.ref("users/" + user + "/categories");
}

function userCompletedRef(user) {
  return db.ref("users/" + user + "/completed");
}

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

let currentUser = null;
let categoriesRef = null;

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function saveData() {
  if (!categoriesRef) return;
  categoriesRef.set(state.categories);
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
  category.items.push([item]);
  saveData();
  renderCategories();
}

function addItemToRankGroup(categoryId, groupIndex, item) {
  const category = findCategory(categoryId);
  if (!category) return;
  const group = category.items[groupIndex];
  if (!group) return;
  group.push(item);
  saveData();
  renderCategories();
}

function removeItem(categoryId, itemId) {
  const category = findCategory(categoryId);
  if (!category) return;
  category.items = category.items
    .map((group) => group.filter((i) => i.id !== itemId))
    .filter((group) => group.length > 0);
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
  for (const group of category.items) {
    const item = group.find((i) => i.id === itemId);
    if (item) {
      item.description = description;
      break;
    }
  }
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

function normalizeCategories(rawValue) {
  const rawCategories = Array.isArray(rawValue) ? rawValue : [];
  return rawCategories.map((category) => {
    const rawItems = Array.isArray(category.items) ? category.items : [];
    // Eski veri formatında her rank tek bir öğeydi; burada geriye dönük
    // uyumluluk için tek öğeleri tek elemanlı gruba sarıyoruz.
    const groups = rawItems.map((entry) => (Array.isArray(entry) ? entry : [entry]));
    return { ...category, items: groups };
  });
}

const categorySelect = document.getElementById("category-select");
const categoriesContainer = document.getElementById("categories-container");
const categoryTemplate = document.getElementById("category-template");
const rankGroupTemplate = document.getElementById("rank-group-template");
const variationTemplate = document.getElementById("variation-template");
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
      category.items.forEach((group, groupIndex) => {
        const groupNode = rankGroupTemplate.content.cloneNode(true);
        const row = groupNode.querySelector(".rank-group");
        const badge = groupNode.querySelector(".rank-badge");
        const addVariationBtn = groupNode.querySelector(".add-variation-btn");
        const gallery = groupNode.querySelector(".variation-gallery");

        row.dataset.categoryId = category.id;
        row.dataset.index = String(groupIndex);
        badge.textContent = rankLabel(groupIndex);
        addVariationBtn.addEventListener("click", () => setPendingRankTarget(category.id, groupIndex));

        group.forEach((item) => {
          const itemNode = variationTemplate.content.cloneNode(true);
          const image = itemNode.querySelector(".item-image");
          const name = itemNode.querySelector(".item-name");
          const removeBtn = itemNode.querySelector(".remove-item-btn");
          const editBtn = itemNode.querySelector(".edit-note-btn");
          const notePreview = itemNode.querySelector(".item-note-preview");
          const noteEditor = itemNode.querySelector(".item-note-editor");
          const noteTextarea = itemNode.querySelector(".item-note-textarea");
          const saveNoteBtn = itemNode.querySelector(".save-note-btn");

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

          gallery.appendChild(itemNode);
        });

        attachDragEvents(row);

        list.appendChild(groupNode);
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
    document.querySelectorAll(".rank-group.drag-over").forEach((el) => el.classList.remove("drag-over"));
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

const rankTargetBanner = document.getElementById("rank-target-banner");
const rankTargetText = document.getElementById("rank-target-text");
const rankTargetCancelBtn = document.getElementById("rank-target-cancel");

let pendingRankTarget = null;

function setPendingRankTarget(categoryId, groupIndex) {
  const category = findCategory(categoryId);
  if (!category) return;
  pendingRankTarget = { categoryId, groupIndex };
  rankTargetText.textContent = `"${category.name}" — ${rankLabel(groupIndex)} sırasına ekleniyor. Ara ve bir görsel seç.`;
  rankTargetBanner.hidden = false;
  searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
  searchInput.focus();
}

function clearPendingRankTarget() {
  pendingRankTarget = null;
  rankTargetBanner.hidden = true;
}

rankTargetCancelBtn.addEventListener("click", clearPendingRankTarget);

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
      const newItem = { id: generateId(), imageUrl: item.imageUrl, term: term };

      if (pendingRankTarget) {
        addItemToRankGroup(pendingRankTarget.categoryId, pendingRankTarget.groupIndex, newItem);
        clearPendingRankTarget();
        return;
      }

      const categoryId = categorySelect.value;
      if (!categoryId) {
        alert("Lütfen önce bir kategori oluşturun ve seçin.");
        return;
      }
      addItemToCategory(categoryId, newItem);
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

// ---- Ekran yönetimi ----

const screens = {
  login: document.getElementById("screen-login"),
  dashboard: document.getElementById("screen-dashboard"),
  observerSelect: document.getElementById("screen-observer-select"),
  slideshow: document.getElementById("screen-slideshow"),
};

function showScreen(name) {
  Object.keys(screens).forEach((key) => {
    screens[key].hidden = key !== name;
  });
}

// ---- Giriş / kullanıcı paneli ----

const currentUserLabel = document.getElementById("current-user-label");
const switchUserBtn = document.getElementById("switch-user-btn");
const finishBtn = document.getElementById("finish-btn");
const finishStatus = document.getElementById("finish-status");

let dashboardListenerRef = null;

function attachDashboardListener(user) {
  categoriesRef = userCategoriesRef(user);
  searchStatus.textContent = "Liste yükleniyor...";
  dashboardListenerRef = categoriesRef;
  categoriesRef.on("value", (snapshot) => {
    state.categories = normalizeCategories(snapshot.val());
    initializeCategories();
    if (searchStatus.textContent === "Liste yükleniyor...") {
      searchStatus.textContent = "";
    }
    renderCategorySelect();
    renderCategories();
  });
}

function detachDashboardListener() {
  if (dashboardListenerRef) {
    dashboardListenerRef.off();
    dashboardListenerRef = null;
  }
}

function loginAs(user) {
  currentUser = user;
  localStorage.setItem(CURRENT_USER_KEY, user);
  currentUserLabel.textContent = USER_LABELS[user] + " olarak giriş yaptın";
  finishStatus.textContent = "";
  resetSearchUI();
  attachDashboardListener(user);
  showScreen("dashboard");
}

function resetSearchUI() {
  searchInput.value = "";
  searchResults.innerHTML = "";
  searchStatus.textContent = "";
  clearPendingRankTarget();
}

function logout() {
  detachDashboardListener();
  currentUser = null;
  categoriesRef = null;
  state.categories = [];
  localStorage.removeItem(CURRENT_USER_KEY);
  resetSearchUI();
  showScreen("login");
}

document.getElementById("login-ibo").addEventListener("click", () => loginAs("ibo"));
document.getElementById("login-zehra").addEventListener("click", () => loginAs("zehra"));
document.getElementById("login-observer").addEventListener("click", () => {
  showScreen("observerSelect");
  enterObserverSelect();
});
switchUserBtn.addEventListener("click", logout);

finishBtn.addEventListener("click", () => {
  if (!currentUser) return;
  const confirmed = confirm(
    "Tanıtma işlemini bitirmek istediğine emin misin? Bu, listeni gözlemci modunda görünür yapacak."
  );
  if (!confirmed) return;
  userCompletedRef(currentUser).set(true);
  finishStatus.textContent = "Tanıtma işlemin tamamlandı olarak işaretlendi. 🎉";
});

// ---- Gözlemci: kullanıcı seçimi ----

const observerCards = {
  ibo: document.getElementById("observer-pick-ibo"),
  zehra: document.getElementById("observer-pick-zehra"),
};
const observerBackBtn = document.getElementById("observer-back-btn");

let observerListeners = [];

function enterObserverSelect() {
  USERS.forEach((user) => {
    const card = observerCards[user];
    const statusEl = card.querySelector(".observer-card-status");
    card.disabled = true;
    statusEl.textContent = "Yükleniyor...";
    const ref = userCompletedRef(user);
    const handler = (snapshot) => {
      const completed = snapshot.val() === true;
      card.disabled = !completed;
      statusEl.textContent = completed ? "Hazır ✓" : "Henüz tamamlanmadı";
      card.classList.toggle("observer-card-ready", completed);
    };
    ref.on("value", handler);
    observerListeners.push({ ref, handler });
  });
}

function detachObserverListeners() {
  observerListeners.forEach(({ ref, handler }) => ref.off("value", handler));
  observerListeners = [];
}

observerBackBtn.addEventListener("click", () => {
  detachObserverListeners();
  showScreen("login");
});

observerCards.ibo.addEventListener("click", () => startSlideshowFor("ibo"));
observerCards.zehra.addEventListener("click", () => startSlideshowFor("zehra"));

// ---- Gözlemci: slayt gösterisi ----

const slideshowOwnerTitle = document.getElementById("slideshow-owner-title");
const slideshowCategoryTitle = document.getElementById("slideshow-category-title");
const slideshowStage = document.querySelector(".slideshow-stage");
const slideshowEnd = document.getElementById("slideshow-end");
const slideshowEndMessage = slideshowEnd.querySelector("p");
const slideshowRank = document.getElementById("slideshow-rank");
const slideshowImage = document.getElementById("slideshow-image");
const slideshowName = document.getElementById("slideshow-name");
const slideshowDescription = document.getElementById("slideshow-description");
const slideshowBackBtn = document.getElementById("slideshow-back-btn");
const slideshowEndBackBtn = document.getElementById("slideshow-end-back-btn");

let slideshowCategories = [];
let slideCategoryIndex = 0;
let slideItemIndex = 0;

function startSlideshowFor(user) {
  userCategoriesRef(user).once("value", (snapshot) => {
    const rawCategories = normalizeCategories(snapshot.val());
    slideshowCategories = rawCategories
      .map((c) => ({
        name: c.name,
        slides: c.items.flatMap((group, groupIndex) => group.map((item) => ({ item, rankIndex: groupIndex }))),
      }))
      .filter((c) => c.slides.length > 0);

    slideshowOwnerTitle.textContent = OWNER_TITLES[user];

    if (slideshowCategories.length === 0) {
      slideshowCategoryTitle.textContent = "";
      slideshowStage.hidden = true;
      slideshowEnd.hidden = false;
      slideshowEndMessage.textContent = "Henüz hiç favori eklenmemiş.";
      showScreen("slideshow");
      return;
    }

    slideCategoryIndex = 0;
    slideItemIndex = 0;
    slideshowEnd.hidden = true;
    slideshowStage.hidden = false;
    renderSlide();
    showScreen("slideshow");
  });
}

function renderSlide() {
  const category = slideshowCategories[slideCategoryIndex];
  const slide = category.slides[slideItemIndex];
  slideshowCategoryTitle.textContent = category.name;
  slideshowRank.textContent = rankLabel(slide.rankIndex);
  slideshowImage.src = slide.item.imageUrl;
  slideshowImage.alt = slide.item.term;
  slideshowName.textContent = slide.item.term;
  const description = slide.item.description || "";
  slideshowDescription.textContent = description;
  slideshowDescription.hidden = !description;
}

function goToNextSlide() {
  const category = slideshowCategories[slideCategoryIndex];
  if (slideItemIndex < category.slides.length - 1) {
    slideItemIndex++;
  } else if (slideCategoryIndex < slideshowCategories.length - 1) {
    slideCategoryIndex++;
    slideItemIndex = 0;
  } else {
    slideshowStage.hidden = true;
    slideshowEnd.hidden = false;
    slideshowEndMessage.textContent = "Tüm favoriler gösterildi 🎉";
    return;
  }
  renderSlide();
}

function goToPrevSlide() {
  if (slideItemIndex > 0) {
    slideItemIndex--;
  } else if (slideCategoryIndex > 0) {
    slideCategoryIndex--;
    slideItemIndex = slideshowCategories[slideCategoryIndex].slides.length - 1;
  } else {
    return;
  }
  renderSlide();
}

document.getElementById("slideshow-next").addEventListener("click", goToNextSlide);
document.getElementById("slideshow-prev").addEventListener("click", goToPrevSlide);
slideshowBackBtn.addEventListener("click", () => {
  showScreen("observerSelect");
});
slideshowEndBackBtn.addEventListener("click", () => {
  showScreen("observerSelect");
});

// ---- Başlangıç ----

const savedUser = localStorage.getItem(CURRENT_USER_KEY);
if (savedUser && USERS.includes(savedUser)) {
  loginAs(savedUser);
} else {
  showScreen("login");
}

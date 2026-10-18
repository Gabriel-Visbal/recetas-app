"use strict";

// 1. Crea una cuenta gratuita en https://spoonacular.com/food-api/console
// 2. Copia js/config.example.js como js/config.js y coloca tu clave allí.
// Esta app es un ejemplo local: una clave incluida en JavaScript es visible
// en el navegador. Para publicar una clave privada, usa un backend como proxy.
const API_KEY = window.RECETAS_CONFIG?.apiKey || "TU_API_KEY_AQUI";
const API_URL = "https://api.spoonacular.com/recipes/findByIngredients";
const REQUEST_TIMEOUT_MS = 20000;

// Spoonacular utiliza nombres en inglés. Este pequeño diccionario permite
// buscar ingredientes comunes en español; no es un traductor completo.
// Los términos no incluidos se envían tal como se escriben.
const INGREDIENT_TRANSLATIONS = {
  pollo: "chicken", tomate: "tomato", tomates: "tomato", cebolla: "onion",
  cebollas: "onion", ajo: "garlic", arroz: "rice", pasta: "pasta",
  queso: "cheese", huevo: "egg", huevos: "egg", leche: "milk",
  mantequilla: "butter", harina: "flour", azucar: "sugar", sal: "salt",
  pimienta: "pepper", papa: "potato", papas: "potato", patata: "potato",
  patatas: "potato", zanahoria: "carrot", zanahorias: "carrot",
  espinaca: "spinach", espinacas: "spinach", brocoli: "broccoli",
  pimiento: "bell pepper", pepino: "cucumber", lechuga: "lettuce",
  aguacate: "avocado", limon: "lemon", naranja: "orange",
  manzana: "apple", platano: "plantain", banana: "banana",
  atun: "tuna", salmon: "salmon", cerdo: "pork", res: "beef",
  champinones: "mushrooms", lentejas: "lentils", garbanzos: "chickpeas",
  frijoles: "beans", habichuelas: "beans", maiz: "corn",
  cilantro: "cilantro", perejil: "parsley", albahaca: "basil",
  "aceite de oliva": "olive oil", "pechuga de pollo": "chicken breast"
};

const form = document.querySelector("#search-form");
const input = document.querySelector("#ingredients");
const searchButton = document.querySelector("#search-button");
const buttonLabel = document.querySelector("#button-label");
const spinner = document.querySelector("#spinner");
const searchIcon = document.querySelector("#search-icon");
const resultsSection = document.querySelector("#results-section");
const grid = document.querySelector("#recipe-grid");
const template = document.querySelector("#recipe-template");
const errorMessage = document.querySelector("#error-message");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const resultsCount = document.querySelector("#results-count");
const resultsNote = document.querySelector("#results-note");
const status = document.querySelector("#search-status");
let isSearching = false;

function normalizeIngredient(value) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseIngredients(value) {
  const ingredients = value.split(",").map(normalizeIngredient).filter(Boolean);
  return [...new Set(ingredients.map((name) => INGREDIENT_TRANSLATIONS[name] || name))];
}

function setLoading(loading) {
  isSearching = loading;
  searchButton.disabled = loading;
  spinner.hidden = !loading;
  searchIcon.toggleAttribute("hidden", loading);
  loadingState.hidden = !loading;
  buttonLabel.textContent = loading ? "Buscando…" : "Buscar recetas";
  resultsSection.setAttribute("aria-busy", String(loading));
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function httpErrorMessage(code) {
  if (code === 401 || code === 403) {
    return "La API Key no es válida o no tiene acceso. Revisa apiKey en js/config.js y tu cuenta de Spoonacular.";
  }
  if (code === 402) {
    return "Se agotó la cuota de tu plan de Spoonacular. Consulta tu panel y vuelve a intentarlo cuando se renueve.";
  }
  if (code === 429) {
    return "Hay demasiadas solicitudes. Espera unos segundos antes de volver a buscar.";
  }
  if (code >= 500) {
    return "Spoonacular no está disponible en este momento. Inténtalo de nuevo más tarde.";
  }
  return `No se pudo completar la búsqueda (error ${code}). Revisa los ingredientes e inténtalo de nuevo.`;
}

function renderIngredientList(list, ingredients, emptyText) {
  if (ingredients.length === 0) {
    const item = document.createElement("li");
    item.className = "neutral";
    item.textContent = emptyText;
    list.append(item);
    return;
  }
  ingredients.forEach((ingredient) => {
    const item = document.createElement("li");
    // textContent evita interpretar datos de la API como código HTML.
    item.textContent = ingredient.name || ingredient.originalName || "Ingrediente";
    item.title = ingredient.original || item.textContent;
    list.append(item);
  });
}

function recipeUrl(recipe) {
  const slug = String(recipe.title || "receta").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "receta";
  // findByIngredients entrega el ID, pero no la URL del sitio original.
  // La página de Spoonacular permite consultar la receta sin otra llamada API.
  return `https://spoonacular.com/recipes/${slug}-${recipe.id}`;
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderRecipes(recipes) {
  const fragment = document.createDocumentFragment();
  recipes.forEach((recipe) => {
    const card = template.content.cloneNode(true);
    const used = Array.isArray(recipe.usedIngredients) ? recipe.usedIngredients : [];
    const missing = Array.isArray(recipe.missedIngredients) ? recipe.missedIngredients : [];
    const title = recipe.title || "Receta sin título";
    card.querySelector(".recipe-title").textContent = title;
    card.querySelector(".available-count").textContent = used.length;
    card.querySelector(".missing-count").textContent = missing.length;
    renderIngredientList(card.querySelector(".available-list"), used, "Sin coincidencias en esta receta");
    renderIngredientList(card.querySelector(".missing-list"), missing, "¡Tienes todos los ingredientes!");

    const badge = card.querySelector(".recipe-badge");
    badge.textContent = missing.length === 0 ? "Todo listo para cocinar" : `Te ${missing.length === 1 ? "falta 1 ingrediente" : `faltan ${missing.length} ingredientes`}`;
    badge.classList.toggle("complete", missing.length === 0);

    const image = card.querySelector(".recipe-image");
    const fallback = card.querySelector(".image-fallback");
    image.alt = title;
    const imageUrl = safeImageUrl(recipe.image);
    const showFallback = () => { image.hidden = true; fallback.hidden = false; };
    image.addEventListener("error", showFallback, { once: true });
    if (imageUrl) image.src = imageUrl;
    else showFallback();

    const link = card.querySelector(".recipe-link");
    link.href = recipeUrl(recipe);
    link.setAttribute("aria-label", `Ver receta: ${title} (se abre en otra pestaña)`);
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
}

async function searchRecipes(event) {
  event.preventDefault();
  if (isSearching) return;
  errorMessage.hidden = true;
  input.removeAttribute("aria-invalid");
  const ingredients = parseIngredients(input.value);
  if (ingredients.length === 0) {
    showError("Escribe al menos un ingrediente. Por ejemplo: pollo, tomate, cebolla.");
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }
  if (!API_KEY.trim() || API_KEY === "TU_API_KEY_AQUI") {
    showError("Falta configurar tu API Key. Copia js/config.example.js como js/config.js y reemplaza TU_API_KEY_AQUI por la clave de tu cuenta de Spoonacular.");
    return;
  }

  grid.replaceChildren();
  emptyState.hidden = true;
  resultsNote.hidden = true;
  resultsCount.textContent = "Consultando tus ingredientes…";
  status.textContent = "Buscando recetas. Espera un momento.";
  setLoading(true);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY.trim(),
      ingredients: ingredients.join(","),
      number: "12",
      ranking: "2", // Prioriza recetas que necesitan menos ingredientes adicionales.
      ignorePantry: "false" // Incluye también sal, agua, harina, etc. entre los faltantes.
    });
    const response = await fetch(`${API_URL}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(httpErrorMessage(response.status));
    const recipes = await response.json();
    if (!Array.isArray(recipes)) throw new Error("Spoonacular devolvió una respuesta inesperada. Inténtalo de nuevo.");
    if (recipes.some((recipe) => !recipe || !Number.isSafeInteger(recipe.id) || recipe.id <= 0)) {
      throw new Error("Spoonacular devolvió datos de recetas incompletos. Inténtalo de nuevo.");
    }

    if (recipes.length === 0) {
      document.querySelector("#empty-title").textContent = "No encontramos recetas con esos ingredientes";
      document.querySelector("#empty-description").textContent = "Prueba con menos ingredientes o usa nombres en inglés, como chicken, tomato, onion. La traducción de ingredientes en español cubre solo los más comunes.";
      emptyState.hidden = false;
      resultsCount.textContent = "0 recetas encontradas";
      status.textContent = "No se encontraron recetas. Prueba con otros ingredientes.";
      return;
    }
    renderRecipes(recipes);
    resultsCount.textContent = `${recipes.length} ${recipes.length === 1 ? "receta encontrada" : "recetas encontradas"}`;
    resultsNote.hidden = false;
    status.textContent = resultsCount.textContent;
  } catch (error) {
    const message = error.name === "AbortError"
      ? "La búsqueda tardó demasiado. Revisa tu conexión y vuelve a intentarlo."
      : error instanceof TypeError
        ? "No pudimos conectar con Spoonacular. Comprueba tu conexión. Si abriste el archivo directamente, prueba con Live Server."
        : error instanceof SyntaxError
          ? "Spoonacular devolvió una respuesta que no pudimos leer. Inténtalo de nuevo más tarde."
          : error.message || "Ocurrió un error inesperado. Inténtalo de nuevo.";
    resultsCount.textContent = "Búsqueda sin completar";
    status.textContent = "No se pudo completar la búsqueda.";
    showError(message);
  } finally {
    clearTimeout(timeout);
    setLoading(false);
  }
}

form.addEventListener("submit", searchRecipes);
input.addEventListener("input", () => {
  input.removeAttribute("aria-invalid");
  errorMessage.hidden = true;
});
document.querySelectorAll(".example-button").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.ingredients;
    input.removeAttribute("aria-invalid");
    errorMessage.hidden = true;
    input.focus();
  });
});

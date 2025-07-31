// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const recipeDisplay = document.getElementById("recipe-display");

// This function creates a list of ingredients for the recipe from the API data
// It loops through the ingredients and measures, up to 20, and returns an HTML string
// that can be used to display them in a list format
// If an ingredient is empty or just whitespace, it skips that item 
function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

// This function displays the recipe on the page
function renderRecipe(recipe) {
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
    <button id="save-recipe-btn" class="save-inline-btn">Save Recipe</button>
  `;

  // Add event listener for the Save Recipe button
  const saveBtn = document.getElementById("save-recipe-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function() {
      if (recipe && recipe.strMeal) {
        saveRecipeName(recipe.strMeal);
      }
    });
  }
}

// Helper: Save recipe name to localStorage
function saveRecipeName(name) {
  let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
  if (!saved.includes(name)) {
    saved.push(name);
    localStorage.setItem("savedRecipes", JSON.stringify(saved));
    renderSavedRecipes();
  }
}

// Helper: Render saved recipes list
function renderSavedRecipes() {
  const container = document.getElementById("saved-recipes-container");
  const list = document.getElementById("saved-recipes-list");
  let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
  if (saved.length === 0) {
    container.style.display = "none";
    list.innerHTML = "";
    return;
  }
  container.style.display = "block";
  list.innerHTML = saved.map(name => `
    <li style="display:flex;align-items:center;gap:8px;">
      <span class="saved-recipe-name" style="cursor:pointer;color:#4568dc;text-decoration:underline;">${name}</span>
      <button class="delete-btn" style="margin-left:auto;">Delete</button>
    </li>
  `).join("");

  // Add event listeners for delete and load
  Array.from(list.children).forEach((li, idx) => {
    const name = saved[idx];
    const nameSpan = li.querySelector('.saved-recipe-name');
    const delBtn = li.querySelector('.delete-btn');
    if (nameSpan) {
      nameSpan.addEventListener('click', function() {
        fetchRecipeByName(name);
      });
    }
    if (delBtn) {
      delBtn.addEventListener('click', function() {
        deleteRecipeName(name);
      });
    }
  });
}

// Helper: Delete recipe name from localStorage
function deleteRecipeName(name) {
  let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
  saved = saved.filter(n => n !== name);
  localStorage.setItem("savedRecipes", JSON.stringify(saved));
  renderSavedRecipes();
}

// Helper: Fetch and display recipe by name
async function fetchRecipeByName(name) {
  recipeDisplay.innerHTML = `<p>Loading ${name}...</p>`;
  try {
    const apiUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    if (data.meals && data.meals.length > 0) {
      const recipe = data.meals[0];
      renderRecipe(recipe);
      lastRecipe = recipe;
    } else {
      recipeDisplay.innerHTML = `<p>Recipe not found.</p>`;
    }
  } catch (error) {
    recipeDisplay.innerHTML = `<p>Sorry, couldn't load the recipe.</p>`;
  }
}

// This function gets a random recipe from the API and shows it
async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>"; // Show loading message
  const apiUrl = 'https://www.themealdb.com/api/json/v1/1/random.php';
  try {
    // Fetch a random recipe from the MealDB API
    const res = await fetch(apiUrl); // Replace with the actual API URL
    const data = await res.json(); // Parse the JSON response
    const recipe = data.meals[0]; // Get the first recipe from the response

    // Render the recipe
    renderRecipe(recipe);

    // Store the last fetched recipe for remixing
    lastRecipe = recipe;

  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
    lastRecipe = null;
  }
}


// --- Event listeners ---

// When the button is clicked, get and show a new random recipe


// When the page loads, show a random recipe right away

// --- Event listeners ---

// Get the remix button and theme select elements
const remixBtn = document.getElementById("remix-btn");
const remixTheme = document.getElementById("remix-theme");
const remixOutput = document.getElementById("remix-output");

// Add event listener for the random recipe button
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);

// Add event listener for the remix button
remixBtn.addEventListener("click", async function() {
  // Check if a recipe is loaded
  if (!lastRecipe) {
    remixOutput.innerHTML = "<p>Please load a recipe first!</p>";
    return;
  }

  // Get the selected remix prompt
  const theme = remixTheme.value;

  // Build a shorter prompt for OpenAI to fit within 500 tokens
  // Only send the recipe name, a short ingredient list, and a brief summary of instructions
  const shortIngredients = [];
  for (let i = 1; i <= 7; i++) {
    const ing = lastRecipe[`strIngredient${i}`];
    const meas = lastRecipe[`strMeasure${i}`];
    if (ing && ing.trim()) shortIngredients.push(`${meas ? meas : ''} ${ing}`.trim());
  }
  const shortInstructions = lastRecipe.strInstructions.split(/\.|\n/).slice(0, 3).join('. ') + '.';
  const prompt = `Remix this recipe for ${lastRecipe.strMeal} with the following theme: ${theme}.\n\nIngredients: ${shortIngredients.join(', ')}\nInstructions: ${shortInstructions}\n\nKeep your answer short and beginner-friendly.`;

  remixOutput.innerHTML = "<p>Remixing...</p>";

  try {
    // Call OpenAI API (gpt-4.1)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "You are a helpful chef assistant. Reply with a remixed recipe in a clear, friendly way for beginners." },
          { role: "user", content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      // Use Marked to parse markdown from the response
      if (window.marked) {
        remixOutput.innerHTML = window.marked.parse(data.choices[0].message.content);
      } else {
        // Fallback if Marked is not loaded
        remixOutput.innerHTML = `<p>${data.choices[0].message.content.replace(/\n/g, '<br>')}</p>`;
      }
    } else {
      remixOutput.innerHTML = "<p>Sorry, couldn't remix the recipe.</p>";
    }
  } catch (error) {
    remixOutput.innerHTML = "<p>Sorry, there was an error remixing the recipe.</p>";
  }
});

// Show a random recipe and saved recipes when the page loads
window.addEventListener("DOMContentLoaded", function() {
  fetchAndDisplayRandomRecipe();
  renderSavedRecipes();
});
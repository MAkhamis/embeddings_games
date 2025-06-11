document.getElementById("calculateBtn").addEventListener("click", async () => {
  const word1Input = document.getElementById("word1"); // Word B in formula
  const word2Input = document.getElementById("word2"); // Word A in formula
  const word3Input = document.getElementById("word3"); // Word C in formula

  const word1 = word1Input.value.trim();
  const word2 = word2Input.value.trim();
  const word3 = word3Input.value.trim();

  const resultsDiv = document.getElementById("results");
  const errorDiv = document.getElementById("error");

  // Embedding display elements
  const embWordA_str = document.getElementById("embWordA_str");
  const embWordA_vec = document.getElementById("embWordA_vec");
  const embWordB_str = document.getElementById("embWordB_str");
  const embWordB_vec = document.getElementById("embWordB_vec");
  const embWordC_str = document.getElementById("embWordC_str");
  const embWordC_vec = document.getElementById("embWordC_vec");

  // New elements for result vector and distance
  const resultVector = document.getElementById("resultVector");
  const distanceInfo = document.getElementById("distanceInfo");

  resultsDiv.innerHTML = "<p>Calculating...</p>";
  errorDiv.textContent = "";

  // Clear previous embeddings
  embWordA_str.textContent = "";
  embWordA_vec.value = "";
  embWordB_str.textContent = "";
  embWordB_vec.value = "";
  embWordC_str.textContent = "";
  embWordC_vec.value = "";
  resultVector.value = "";
  distanceInfo.textContent =
    "Click on any result word to see distance calculations.";

  // Determine operation mode
  let operationMode = "";
  if (!word2) {
    errorDiv.textContent = "Word A is required for all operations.";
    resultsDiv.innerHTML = "";
    return;
  }

  if (word1 && word2 && word3) {
    operationMode = "analogy";
  } else if (word1 && word2 && !word3) {
    operationMode = "subtraction";
  } else if (!word1 && word2 && word3) {
    operationMode = "addition";
  } else if (!word1 && word2 && !word3) {
    operationMode = "similarity";
  } else {
    errorDiv.textContent =
      "Please provide either:\n• Just Word A (to find similar words)\n• Word A and Word B (for A - B)\n• Word A and Word C (for A + C)\n• All three words (for A - B + C)";
    resultsDiv.innerHTML = "";
    return;
  }

  try {
    const response = await fetch("/analogy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word1, word2, word3 }), // word1 is B, word2 is A, word3 is C
    });

    const data = await response.json();

    if (response.ok) {
      // Display operation info
      const operationInfoElement = document.getElementById("current-operation");
      if (operationInfoElement) {
        operationInfoElement.textContent =
          data.calculation_description || "Vector calculation";
      }

      if (data.result && data.result.length > 0) {
        let html = "<ul>";
        data.result.forEach((item, index) => {
          html += `<li><span class="clickable-result" data-word="${
            item[0]
          }" data-similarity="${item[1]}">${
            item[0]
          }</span> (Cosine Similarity: ${item[1].toFixed(4)})</li>`;
        });
        html += "</ul>";
        resultsDiv.innerHTML = html;

        // Add click listeners to result words
        document.querySelectorAll(".clickable-result").forEach((span) => {
          span.addEventListener("click", async () => {
            const clickedWord = span.getAttribute("data-word");
            const similarity = parseFloat(span.getAttribute("data-similarity"));
            await showDistanceInfo(clickedWord, similarity, data.result_vector);
          });
        });
      } else {
        resultsDiv.innerHTML = "<p>No similar words found or empty result.</p>";
      }

      // Display embeddings as single line strings
      if (data.embeddings) {
        // Word A in UI (formula) is word2 from backend
        if (data.embeddings.word2) {
          embWordA_str.textContent = data.embeddings.word2.word;
          embWordA_vec.value = data.embeddings.word2.vector
            ? `[${data.embeddings.word2.vector
                .map((v) => v.toFixed(4))
                .join(", ")}]`
            : "";
        }
        // Word B in UI (formula) is word1 from backend
        if (data.embeddings.word1) {
          embWordB_str.textContent = data.embeddings.word1.word;
          embWordB_vec.value = data.embeddings.word1.vector
            ? `[${data.embeddings.word1.vector
                .map((v) => v.toFixed(4))
                .join(", ")}]`
            : "";
        } else {
          embWordB_str.textContent = "(empty)";
          embWordB_vec.value = "(not used in calculation)";
        }
        // Word C in UI (formula) is word3 from backend
        if (data.embeddings.word3) {
          embWordC_str.textContent = data.embeddings.word3.word;
          embWordC_vec.value = data.embeddings.word3.vector
            ? `[${data.embeddings.word3.vector
                .map((v) => v.toFixed(4))
                .join(", ")}]`
            : "";
        } else {
          embWordC_str.textContent = "(empty)";
          embWordC_vec.value = "(not used in calculation)";
        }
      }

      // Display result vector
      if (data.result_vector) {
        resultVector.value = `[${data.result_vector
          .map((v) => v.toFixed(4))
          .join(", ")}]`;
      }

      // Display initial distance info if available
      if (data.distance_info) {
        distanceInfo.innerHTML = `
                    <strong>Distance to top result "${
                      data.distance_info.word
                    }":</strong><br>
                    Cosine Similarity: ${data.distance_info.cosine_similarity.toFixed(
                      6
                    )}<br>
                    Euclidean Distance: ${data.distance_info.euclidean_distance.toFixed(
                      6
                    )}<br>
                    <em>Note: Higher cosine similarity = more similar. Lower euclidean distance = more similar.</em>
                `;
      }
    } else {
      errorDiv.textContent = `Error: ${data.error || "Unknown error"}`;
      resultsDiv.innerHTML = "";
    }
  } catch (err) {
    errorDiv.textContent = `Network or server error: ${err.message}`;
    resultsDiv.innerHTML = "";
  }
});

// Function to show distance information for clicked words
async function showDistanceInfo(word, similarity, resultVector) {
  const distanceInfo = document.getElementById("distanceInfo");

  try {
    // Make a request to get the vector for the clicked word
    const response = await fetch("/get_word_vector", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: word }),
    });

    const data = await response.json();

    if (response.ok && data.vector) {
      // Calculate euclidean distance manually
      let euclideanDistance = 0;
      for (let i = 0; i < resultVector.length; i++) {
        euclideanDistance += Math.pow(resultVector[i] - data.vector[i], 2);
      }
      euclideanDistance = Math.sqrt(euclideanDistance);

      distanceInfo.innerHTML = `
                <strong>Distance Analysis for "${word}":</strong><br>
                Cosine Similarity: ${similarity.toFixed(6)} (from gensim)<br>
                Euclidean Distance: ${euclideanDistance.toFixed(
                  6
                )} (calculated)<br>
                <strong>Word Vector:</strong><br>
                <textarea readonly style="width: 100%; height: 40px; font-family: monospace; font-size: 11px;">[${data.vector
                  .map((v) => v.toFixed(4))
                  .join(", ")}]</textarea>
                <em>Note: Cosine similarity measures angle between vectors. Euclidean distance measures straight-line distance.</em>
            `;
    } else {
      distanceInfo.innerHTML = `<strong>Error:</strong> Could not fetch vector for "${word}".`;
    }
  } catch (err) {
    distanceInfo.innerHTML = `<strong>Error:</strong> ${err.message}`;
  }
}

// Add event listeners for dynamic operation mode display
document.addEventListener("DOMContentLoaded", () => {
  const word1Input = document.getElementById("word1"); // Word B
  const word2Input = document.getElementById("word2"); // Word A
  const word3Input = document.getElementById("word3"); // Word C
  const operationElement = document.getElementById("current-operation");

  function updateOperationDisplay() {
    const word1 = word1Input.value.trim();
    const word2 = word2Input.value.trim();
    const word3 = word3Input.value.trim();

    if (!word2) {
      operationElement.textContent = "Word A is required";
      operationElement.style.color = "#dc3545";
      return;
    }

    operationElement.style.color = "#28a745";

    if (word1 && word2 && word3) {
      operationElement.textContent = `Analogy: ${word2} - ${word1} + ${word3} = ?`;
    } else if (word1 && word2 && !word3) {
      operationElement.textContent = `Subtraction: ${word2} - ${word1} = ?`;
    } else if (!word1 && word2 && word3) {
      operationElement.textContent = `Addition: ${word2} + ${word3} = ?`;
    } else if (!word1 && word2 && !word3) {
      operationElement.textContent = `Similarity: Find words similar to ${word2}`;
    } else {
      operationElement.textContent =
        "Fill in Word B or Word C, or leave both empty for similarity";
      operationElement.style.color = "#ffc107";
    }
  }

  // Add event listeners
  if (word1Input && word2Input && word3Input && operationElement) {
    word1Input.addEventListener("input", updateOperationDisplay);
    word2Input.addEventListener("input", updateOperationDisplay);
    word3Input.addEventListener("input", updateOperationDisplay);

    // Initial display
    updateOperationDisplay();
  }
});

// Browser-only Word Embeddings Game Script

document.addEventListener('DOMContentLoaded', async () => {
    // Load embeddings on page load
    await loadEmbeddings();
});

document.getElementById('calculateBtn').addEventListener('click', async () => {
    const word1Input = document.getElementById('word1'); // Word B in formula
    const word2Input = document.getElementById('word2'); // Word A in formula  
    const word3Input = document.getElementById('word3'); // Word C in formula

    const word1 = word1Input.value.trim();
    const word2 = word2Input.value.trim();
    const word3 = word3Input.value.trim();

    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');

    // Embedding display elements
    const embWordA_str = document.getElementById('embWordA_str');
    const embWordA_vec = document.getElementById('embWordA_vec');
    const embWordB_str = document.getElementById('embWordB_str');
    const embWordB_vec = document.getElementById('embWordB_vec');
    const embWordC_str = document.getElementById('embWordC_str');
    const embWordC_vec = document.getElementById('embWordC_vec');
    
    // Result vector and distance elements
    const resultVector = document.getElementById('resultVector');
    const distanceInfo = document.getElementById('distanceInfo');

    resultsDiv.innerHTML = '<p>Calculating...</p>';
    errorDiv.textContent = '';
    
    // Clear previous embeddings
    embWordA_str.textContent = '';
    embWordA_vec.value = '';
    embWordB_str.textContent = '';
    embWordB_vec.value = '';
    embWordC_str.textContent = '';
    embWordC_vec.value = '';
    resultVector.value = '';
    distanceInfo.textContent = 'Click on any result word to see distance calculations.';

    if (!word1 || !word2 || !word3) {
        errorDiv.textContent = 'Please fill in all three words.';
        resultsDiv.innerHTML = '';
        return;
    }

    try {
        // Ensure embeddings are loaded
        await loadEmbeddings();

        // Check if all words are available
        const missingWords = [];
        if (!window.wordEmbeddings.hasWord(word1)) missingWords.push(word1);
        if (!window.wordEmbeddings.hasWord(word2)) missingWords.push(word2);
        if (!window.wordEmbeddings.hasWord(word3)) missingWords.push(word3);

        if (missingWords.length > 0) {
            const availableWords = window.wordEmbeddings.getAvailableWords();
            errorDiv.innerHTML = `
                <p>Word(s) not found in vocabulary: <strong>${missingWords.join(', ')}</strong></p>
                <p>Available words: ${availableWords.join(', ')}</p>
                <p><em>Try words like: king, queen, man, woman, paris, france, london, england, etc.</em></p>
            `;
            resultsDiv.innerHTML = '';
            return;
        }

        // Perform analogy calculation
        const analogyResult = window.wordEmbeddings.analogy(word1, word2, word3, 10);
        
        if (analogyResult && analogyResult.result && analogyResult.result.length > 0) {
            let html = '<ul>';
            analogyResult.result.forEach((item, index) => {
                html += `<li><span class="clickable-result" data-word="${item[0]}" data-similarity="${item[1]}">${item[0]}</span> (Cosine Similarity: ${item[1].toFixed(4)})</li>`;
            });
            html += '</ul>';
            resultsDiv.innerHTML = html;
            
            // Add click listeners to result words
            document.querySelectorAll('.clickable-result').forEach(span => {
                span.addEventListener('click', () => {
                    const clickedWord = span.getAttribute('data-word');
                    const similarity = parseFloat(span.getAttribute('data-similarity'));
                    showDistanceInfo(clickedWord, similarity, analogyResult.resultVector);
                });
            });

            // Display embeddings
            if (analogyResult.embeddings) {
                // Word A in UI (formula) is word2 from calculation
                if (analogyResult.embeddings.word2) {
                    embWordA_str.textContent = analogyResult.embeddings.word2.word;
                    embWordA_vec.value = analogyResult.embeddings.word2.vector ? 
                        `[${analogyResult.embeddings.word2.vector.map(v => v.toFixed(4)).join(', ')}]` : '';
                }
                // Word B in UI (formula) is word1 from calculation
                if (analogyResult.embeddings.word1) {
                    embWordB_str.textContent = analogyResult.embeddings.word1.word;
                    embWordB_vec.value = analogyResult.embeddings.word1.vector ? 
                        `[${analogyResult.embeddings.word1.vector.map(v => v.toFixed(4)).join(', ')}]` : '';
                }
                // Word C in UI (formula) is word3 from calculation
                if (analogyResult.embeddings.word3) {
                    embWordC_str.textContent = analogyResult.embeddings.word3.word;
                    embWordC_vec.value = analogyResult.embeddings.word3.vector ? 
                        `[${analogyResult.embeddings.word3.vector.map(v => v.toFixed(4)).join(', ')}]` : '';
                }
            }
            
            // Display result vector
            if (analogyResult.resultVector) {
                resultVector.value = `[${analogyResult.resultVector.map(v => v.toFixed(4)).join(', ')}]`;
            }
            
            // Display initial distance info for the top result
            if (analogyResult.result.length > 0) {
                const topResult = analogyResult.result[0];
                const topWord = topResult[0];
                const topSimilarity = topResult[1];
                const topWordVector = window.wordEmbeddings.getVector(topWord);
                const euclideanDist = window.wordEmbeddings.euclideanDistance(analogyResult.resultVector, topWordVector);
                
                distanceInfo.innerHTML = `
                    <strong>Distance to top result "${topWord}":</strong><br>
                    Cosine Similarity: ${topSimilarity.toFixed(6)}<br>
                    Euclidean Distance: ${euclideanDist.toFixed(6)}<br>
                    <em>Note: Higher cosine similarity = more similar. Lower euclidean distance = more similar.</em>
                `;
            }

        } else {
            resultsDiv.innerHTML = '<p>No similar words found or calculation error.</p>';
        }

    } catch (err) {
        errorDiv.textContent = `Error: ${err.message}`;
        resultsDiv.innerHTML = '';
        console.error('Calculation error:', err);
    }
});

// Model selector change handler
document.getElementById('modelSelect').addEventListener('change', async (e) => {
    const selectedModel = e.target.value;
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    
    if (selectedModel === 'conceptnet') {
        errorDiv.innerHTML = '<p><strong>Note:</strong> ConceptNet API integration is not yet implemented in this demo. Please use the GloVe subset for now.</p>';
        // Reset to GloVe
        e.target.value = 'glove';
        return;
    }
    
    try {
        loadingDiv.classList.remove('hidden');
        await loadEmbeddings(selectedModel);
        loadingDiv.classList.add('hidden');
    } catch (err) {
        loadingDiv.classList.add('hidden');
        errorDiv.textContent = `Error loading model: ${err.message}`;
    }
});

// Function to load embeddings
async function loadEmbeddings(modelType = 'glove') {
    const loadingDiv = document.getElementById('loading');
    
    if (!window.wordEmbeddings.loaded && !window.wordEmbeddings.loading) {
        loadingDiv.classList.remove('hidden');
        try {
            await window.wordEmbeddings.loadEmbeddings(modelType);
            console.log('Embeddings loaded successfully');
        } catch (err) {
            console.error('Error loading embeddings:', err);
            throw err;
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }
}

// Function to show distance information for clicked words
function showDistanceInfo(word, similarity, resultVector) {
    const distanceInfo = document.getElementById('distanceInfo');
    
    try {
        const wordVector = window.wordEmbeddings.getVector(word);
        
        if (wordVector) {
            // Calculate euclidean distance
            const euclideanDistance = window.wordEmbeddings.euclideanDistance(resultVector, wordVector);
            
            distanceInfo.innerHTML = `
                <strong>Distance Analysis for "${word}":</strong><br>
                Cosine Similarity: ${similarity.toFixed(6)}<br>
                Euclidean Distance: ${euclideanDistance.toFixed(6)}<br>
                <strong>Word Vector:</strong><br>
                <textarea readonly style="width: 100%; height: 40px; font-family: monospace; font-size: 11px;">[${wordVector.map(v => v.toFixed(4)).join(', ')}]</textarea>
                <em>Note: Cosine similarity measures angle between vectors. Euclidean distance measures straight-line distance.</em>
            `;
        } else {
            distanceInfo.innerHTML = `<strong>Error:</strong> Could not fetch vector for "${word}".`;
        }
    } catch (err) {
        distanceInfo.innerHTML = `<strong>Error:</strong> ${err.message}`;
    }
}

// Add some helper functions for educational purposes
function showAvailableWords() {
    if (window.wordEmbeddings && window.wordEmbeddings.loaded) {
        const words = window.wordEmbeddings.getAvailableWords();
        console.log('Available words:', words.join(', '));
        return words;
    }
    return [];
}

// Make it available globally for debugging
window.showAvailableWords = showAvailableWords;

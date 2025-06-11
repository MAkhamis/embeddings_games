from flask import Flask, request, jsonify, render_template
import gensim.downloader as api
import numpy as np

app = Flask(__name__)

# Load a pre-trained model (e.g., 'glove-wiki-gigaword-50')
# This might take a few minutes the first time it's run as it downloads the model.
try:
    print("Loading Word2Vec model...")
    # You can choose other models like 'word2vec-google-news-300' (larger, more accurate)
    # or 'glove-twitter-25' (smaller, trained on tweets)
    model_name = 'glove-wiki-gigaword-50'
    model = api.load(model_name)
    print(f"Model '{model_name}' loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    print("Please ensure you have an internet connection for the first download.")
    print("You can try other models from gensim.downloader.info()['models'].keys()")
    model = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analogy', methods=['POST'])
def analogy():
    if model is None:
        return jsonify({"error": "Word embedding model not loaded."}), 500

    data = request.get_json()
    word1_str = data.get('word1', '').strip().lower()  # Word B in formula
    word2_str = data.get('word2', '').strip().lower()  # Word A in formula
    word3_str = data.get('word3', '').strip().lower()  # Word C in formula

    # Check which mode we're in based on empty fields
    mode = None
    if not word3_str and word1_str and word2_str:
        # Mode 1: A - B = ? (word C is empty)
        mode = "subtraction"
    elif not word1_str and word2_str and word3_str:
        # Mode 2: A + C = ? (word B is empty)
        mode = "addition"
    elif word1_str and word2_str and word3_str:
        # Mode 3: A - B + C = ? (traditional analogy)
        mode = "analogy"
    elif not word1_str and not word3_str and word2_str:
        # Mode 4: Find similar words to A (both B and C are empty)
        mode = "similarity"
    else:
        return jsonify({
            "error": "Please provide either:\n" +
                    "• Just Word A (to find similar words)\n" +
                    "• Word A and Word B (for A - B = ?)\n" +
                    "• Word A and Word C (for A + C = ?)\n" +
                    "• All three words (for A - B + C = ?)"
        }), 400

    try:
        # Get embeddings for available words and check vocabulary
        missing_words = []
        vec1 = None  # Word B
        vec2 = None  # Word A  
        vec3 = None  # Word C
        
        if word1_str:
            vec1 = model[word1_str].tolist() if word1_str in model else None
            if vec1 is None: missing_words.append(f"Word B: {word1_str}")
                
        if word2_str:
            vec2 = model[word2_str].tolist() if word2_str in model else None
            if vec2 is None: missing_words.append(f"Word A: {word2_str}")
                
        if word3_str:
            vec3 = model[word3_str].tolist() if word3_str in model else None
            if vec3 is None: missing_words.append(f"Word C: {word3_str}")

        if missing_words:
            return jsonify({"error": f"Word(s) not found in vocabulary: {', '.join(missing_words)}"}), 400
            
        # Perform calculation based on mode
        result_vector = None
        similar_words = None
        calculation_description = ""
        
        if mode == "subtraction":
            # A - B = ?
            vec1_np = np.array(vec1)  # Word B
            vec2_np = np.array(vec2)  # Word A
            result_vector = vec2_np - vec1_np  # A - B
            similar_words = model.most_similar([result_vector], topn=10)
            calculation_description = f"{word2_str} - {word1_str}"
            
        elif mode == "addition":
            # A + C = ?
            vec2_np = np.array(vec2)  # Word A
            vec3_np = np.array(vec3)  # Word C
            result_vector = vec2_np + vec3_np  # A + C
            similar_words = model.most_similar([result_vector], topn=10)
            calculation_description = f"{word2_str} + {word3_str}"
            
        elif mode == "analogy":
            # Traditional analogy: A - B + C = ?
            vec1_np = np.array(vec1)  # Word B
            vec2_np = np.array(vec2)  # Word A
            vec3_np = np.array(vec3)  # Word C
            result_vector = vec3_np + (vec2_np - vec1_np)  # C + (A - B)
            similar_words = model.most_similar(positive=[word3_str, word2_str], negative=[word1_str], topn=10)
            calculation_description = f"{word2_str} - {word1_str} + {word3_str}"
            
        elif mode == "similarity":
            # Find words similar to A
            vec2_np = np.array(vec2)  # Word A
            result_vector = vec2_np  # Just the word vector itself
            similar_words = model.most_similar(word2_str, topn=10)
            calculation_description = f"Words similar to {word2_str}"
        
        result_vector_list = result_vector.tolist()
        
        # Calculate cosine similarity between result vector and the first similar word
        first_word = similar_words[0][0] if similar_words else None
        distance_to_first = None
        if first_word:
            first_word_vec = model[first_word]
            # Cosine similarity
            cosine_sim = np.dot(result_vector, first_word_vec) / (np.linalg.norm(result_vector) * np.linalg.norm(first_word_vec))
            # Euclidean distance
            euclidean_dist = np.linalg.norm(result_vector - first_word_vec)
            distance_to_first = {
                "word": first_word,
                "cosine_similarity": float(cosine_sim),
                "euclidean_distance": float(euclidean_dist)
            }
        
        return jsonify({
            "result": similar_words,
            "embeddings": {
                "word1": {"word": word1_str, "vector": vec1} if word1_str else None,
                "word2": {"word": word2_str, "vector": vec2} if word2_str else None,
                "word3": {"word": word3_str, "vector": vec3} if word3_str else None
            },
            "result_vector": result_vector_list,
            "distance_info": distance_to_first,
            "similarity_method": "cosine_similarity",
            "calculation_mode": mode,
            "calculation_description": calculation_description
        })
    except KeyError as e: # Should be caught by the checks above, but as a fallback
        return jsonify({"error": f"Word not found in vocabulary: {e.args[0]}"}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route('/get_word_vector', methods=['POST'])
def get_word_vector():
    if model is None:
        return jsonify({"error": "Word embedding model not loaded."}), 500
    
    data = request.get_json()
    word = data.get('word', '').lower()
    
    if not word:
        return jsonify({"error": "Please provide a word."}), 400
    
    try:
        if word in model:
            vector = model[word].tolist()
            return jsonify({"word": word, "vector": vector})
        else:
            return jsonify({"error": f"Word '{word}' not found in vocabulary."}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)

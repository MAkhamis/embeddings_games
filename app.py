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
    word1_str = data.get('word1', '').lower()
    word2_str = data.get('word2', '').lower()
    word3_str = data.get('word3', '').lower()

    if not all([word1_str, word2_str, word3_str]):
        return jsonify({"error": "Please provide all three words."}), 400

    try:
        # Get embeddings for each word
        # Convert numpy arrays to lists for JSON serialization
        vec1 = model[word1_str].tolist() if word1_str in model else None
        vec2 = model[word2_str].tolist() if word2_str in model else None
        vec3 = model[word3_str].tolist() if word3_str in model else None

        missing_words = []
        if vec1 is None: missing_words.append(word1_str)
        if vec2 is None: missing_words.append(word2_str)
        if vec3 is None: missing_words.append(word3_str)

        if missing_words:
            return jsonify({"error": f"Word(s) not found in vocabulary: {', '.join(missing_words)}"}), 400
            
        # Analogy: word1 is to word2 as word3 is to ?
        # This is equivalent to: word3 + (word2 - word1)
        # gensim's most_similar uses cosine similarity by default.
        similar_words = model.most_similar(positive=[word3_str, word2_str], negative=[word1_str], topn=10)
        
        # Calculate the resulting vector manually: word3 + (word2 - word1)
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        vec3_np = np.array(vec3)
        result_vector = vec3_np + (vec2_np - vec1_np)
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
                "word1": {"word": word1_str, "vector": vec1},
                "word2": {"word": word2_str, "vector": vec2},
                "word3": {"word": word3_str, "vector": vec3}
            },
            "result_vector": result_vector_list,
            "distance_info": distance_to_first,
            "similarity_method": "cosine_similarity"
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

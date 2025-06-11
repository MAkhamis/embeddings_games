# Embeddings Playground

This application allows you to explore word analogies using pre-trained word embeddings.
You can input three words (e.g., Word1, Word2, Word3) and the application will find words analogous to the relationship: "Word1 is to Word2 as Word3 is to X".

## Setup

1.  **Create Project Folders**:
    Make sure you have the following folder structure:
    ```
    embeddings_games/
    ├── app.py
    ├── requirements.txt
    ├── README.md
    ├── templates/
    │   └── index.html
    └── static/
        ├── script.js
        └── style.css
    ```

2.  **Create a Python Virtual Environment (Recommended)**:
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
    This will install Flask, gensim, and numpy.

## Running the Application

1.  **Run the Flask App**:
    ```bash
    python app.py
    ```
    When you run `app.py` for the first time, `gensim` will download the pre-trained model (`glove-wiki-gigaword-50` by default, which is about 65MB). This might take a few minutes depending on your internet connection. Subsequent runs will be faster as the model will be cached.

2.  **Open in Browser**:
    Open your web browser and go to `http://127.0.0.1:5000/`.

## How it Works

*   The backend is a Flask application (`app.py`).
*   It loads a pre-trained word embedding model using `gensim.downloader`. The default model is `glove-wiki-gigaword-50`. You can change this in `app.py` if you want to experiment with other models (e.g., `word2vec-google-news-300` for better accuracy but larger size).
*   The frontend (`templates/index.html`, `static/script.js`, `static/style.css`) provides a user interface to input three words.
*   When you click "Calculate Analogy", the JavaScript sends a request to the `/analogy` endpoint on the Flask server.
*   The server calculates `vector(Word3) + (vector(Word2) - vector(Word1))` and finds the most similar words to the resulting vector using `model.most_similar(positive=[word3, word2], negative=[word1])`.
*   The results are then displayed on the webpage.

## Example Usage

*   Word 1: `germany`
*   Word 2: `hitler`
*   Word 3: `italy`
*   Expected top result: `mussolini`

*   Word 1: `king`
*   Word 2: `queen`
*   Word 3: `man`
*   Expected top result: `woman`

## Troubleshooting

*   **Model Download Issues**: If the model fails to download, check your internet connection. You can also try a different model from the `gensim.downloader` list.
*   **Word not in vocabulary**: If a word you enter is not in the model's vocabulary, you'll see an error message. Try using common words or synonyms.

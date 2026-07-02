# Health Screening Assistant
**Bharat ke logo ka Apna health page 🇮🇳**

An end-to-end, AI-powered health screening web application. This platform provides preliminary symptom analysis, medical report classification (X-Rays, MRIs), AI chat assistance with advanced reasoning, and an AI-powered Doctor Matchmaker using Semantic Search and LLM Reranking.

## Features

- **🧠 AI Symptom Checker:** Users can input their symptoms, and a trained Random Forest model predicts the most likely condition and its severity.
- **🖼️ Medical Report Analysis:** Upload Chest X-Rays, Brain MRIs, or COVID-19 scans. The backend extracts HOG (Histogram of Oriented Gradients) features and classifies them using optimized Random Forest models (up to 88% accuracy).
- **💬 Advanced AI Chatbot:** Integrated with OpenRouter (`gpt-oss-120b:free`) featuring continuous reasoning capabilities to answer health-related queries contextually.
- **🤖 AI Doctor Matchmaker (Semantic Search + LLM Ranking):** Type your symptoms naturally to find the best doctor! 
  - **Vector Embeddings & Semantic Search:** Generates multi-dimensional mathematical embeddings (`sentence-transformers`) for every doctor and performs a Cosine Similarity match.
  - **Hybrid Scoring:** Blends the Dense Vector score with Sparse Keyword matching logic.
  - **LLM Ranking:** The top 3 matches are sent to an LLM which acts as a Triage Coordinator to pick the absolute best doctor and write a personalized medical recommendation.
- **⚡ Modern Stack:** Built with Next.js (React, Tailwind CSS) for the frontend, and FastAPI (Python, Scikit-learn, Scikit-image, Sentence-Transformers) for the backend.

---

## How to Run Locally

If you want to share this project with others so they can run it on their own computers, they need to follow these steps:

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup
Navigate to the root directory and install the required Python packages:
```bash
pip install -r requirements.txt
```

*(Note: If the `models/` folder is empty, you must run `python3 train_models.py` to generate the `.pkl` models first).*

### 3. Environment Variables
Create a `.env` file in the root directory and add your OpenRouter API key for the AI Chat:
```env
OPENROUTER_API_KEY=your_api_key_here
```

### 4. Start the Backend
```bash
uvicorn backend:app --reload --port 8000
```
The API will be available at `http://localhost:8000`. 
*(Note: The first time the backend starts, it will download a ~80MB embedding model for the AI Semantic Search).*

### 5. Frontend Setup
Open a new terminal, navigate to the Next.js app, install dependencies, and start the development server:
```bash
cd nextjs-app
npm install
npm run dev
```
The web app will be available at `http://localhost:3000`.

---

## How to Deploy & Share Globally

To share a live link (like `www.my-health-app.com`) with anyone in the world without them needing to install anything, you need to deploy the frontend and backend separately to cloud providers.

### 1. Deploy the Backend (Render or Railway)
- **Platform:** [Render](https://render.com) or [Railway](https://railway.app) (both have free tiers).
- **Process:** Connect your GitHub repository. Set the start command to `uvicorn backend:app --host 0.0.0.0 --port $PORT`. 
- **Important:** Make sure to include the `models/` folder in your GitHub repo, OR add a build step that runs `python3 train_models.py` before starting the server. Also, add your `OPENROUTER_API_KEY` to the environment variables on the hosting platform.
- **Result:** You will get a live URL like `https://health-backend.onrender.com`.

### 2. Deploy the Frontend (Vercel)
- **Platform:** [Vercel](https://vercel.com) (Created by the makers of Next.js, 100% free for hobby projects).
- **Process:** Connect your GitHub repository and select the `nextjs-app` folder as the Root Directory.
- **Configuration:** You will need to update the `fetch` URLs in your Next.js code. Change all instances of `http://localhost:8000` to your new live backend URL (e.g., `https://health-backend.onrender.com`).
- **Result:** Vercel will give you a live shareable link like `https://health-app.vercel.app`.



<div align="center">
  <!-- 
    Replace this with a real UI screenshot or banner
    Recommended size: 1200x400
  -->
  <img src="https://via.placeholder.com/1200x400/09090b/ffffff?text=Optic+AI%3A+Style+Interpreter+%26+Tuning+Engine" alt="Banner" width="100%" />

  <h1>Optic AI: Style Interpreter & Tuning Engine</h1>
  <p>A professional workspace for AI image generation, prompt reverse-engineering, and rapid style tuning.</p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Gemini_API-3.1_Flash-blue?style=for-the-badge&logo=google" alt="Gemini" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-black?style=for-the-badge&logo=tailwindcss&logoColor=38bdf8" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Firebase-Enterprise-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  </p>
</div>

---

## 👁️ Overview

This application is designed specifically for AI artists, prompt engineers, and photographers who need to deeply understand the stylistic DNA of an image and rapidly iterate on image generation prompts. It brings together the power of **Google's Gemini 3.1 Flash Image model** and **Gemini 3 Flash** to create a highly optimized, dual-engine workflow right in the browser.

## ✨ Key Features

### 🎨 Style Interpreter
Upload reference images and extract fundamental stylistic data.
*   **Single Image Reverse-Engineering:** Get a highly detailed, professional prompt designed to replicate the exact lighting, camera angle, and artistic style of your reference file.
*   **Style Essence (Multi-Image):** Upload up to 4 images to extract a unified "Style Prompt" that isolates their common emotional mood and color grading.
*   **Photo Blueprinting:** Output a structured, technical breakdown of a photograph (Subject, Lighting, Lens/Camera, Environment).
*   **Image Enhancement:** Diagnose structural or stylistic flaws in a reference image and generate a newly calibrated prompt to produce an improved, more aesthetically pleasing version.

### 🔄 Tuning Loop
A dedicated workspace to rapidly test subtle variations of your prompts.
*   **Prompt Expansion:** Provide a single test image and a base objective (e.g., "make it brighter and luxury"). The text model instantly generates 4-6 prompt variations experimenting with the lighting, mood, color palette, or artistic style—while strictly maintaining the architectural layout of the source.
*   **Parallel Execution:** Fire off all generated variants simultaneously, drastically cutting down prompt testing time.
*   **Grid Analysis:** View all outputs in a tight 2px comparative grid.
*   **Save & Copy Integration:** Instantly download the best outputs and copy the exact prompt variant that produced them to your clipboard.

## 🧠 Technical Highlights

*   **Token-Optimized Payloads:** Uses a custom downsampling utility to crunch reference images to ~1024x1024 within the DOM before sending them to the AI APIs, minimizing token usage and drastically improving generation latency.
*   **Structured Outputs:** Relies on Gemini's `responseSchema` to guarantee prompt variation arrays return as clean, iterable JSON objects rather than arbitrary strings.
*   **Isolated Test State:** Tuning layer iterates in temporary client memory, explicitly keeping rapid-fire test outputs from saving to—and muddying—the user's permanent Firestore gallery.

## 🛠️ Tech Stack

*   **Framework:** Next.js 15 (App Router)
*   **Styling:** Tailwind CSS v4, Framer Motion
*   **AI Models:** 
    *   `gemini-3-flash-preview` (Language & Vision Analysis)
    *   `gemini-3.1-flash-image-preview` (Image Generation)
*   **Authentication & Database:** Firebase Auth (Google Provider) + Firestore Enterprise
*   **Icons:** Lucide React

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/optic-ai.git
cd optic-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root directory and add your Gemini API key:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

Ensure your Firebase credentials are appropriately mapped in your `firebase-applet-config.json` file.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to experience the workflow.

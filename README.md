# Quiz Platformer Game

An interactive, responsive HTML5 Canvas game built with React, Vite, and TypeScript. 

## Features
- **Platformer Mechanics:** Jump over incorrect answers and land on the correct one.
- **Dynamic Questions:** Fetches trivia/quiz questions from an external API.
- **Powerups:** 
  - **50/50:** Removes two incorrect options.
  - **Hint:** Displays a hint to help you guess the right answer.
- **Fully Responsive:** Beautifully adapts to desktop and mobile screens with custom tailored UI.
- **Retro Audio Feedback:** Fully synthesized retro game sounds (jumping, correct, wrong) using the native Web Audio API (no external sound files required).
- **Gamified UI:** Fully styled HUD with pixel-perfect spacing, drop-shadows, and a responsive layout that frames the canvas.

## Getting Started

First, install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```
The game will run locally on `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env` (if applicable) and configure your API endpoint. The game expects an API serving JSON trivia questions matching the `QuizQuestion` type defined in `src/types/api.ts`.

## Build & Deploy

Build the production app:
```bash
npm run build
```
This generates the optimized bundle in the `dist` folder. You can test it locally with `npm run preview`.

## Technologies Used
- React (Hooks, State Management)
- HTML5 Canvas API (Custom Physics & Drawing loop)
- TypeScript (Strict typing for game entities and API responses)
- CSS3 (Flexbox, Media Queries for Responsive Design)
- Web Audio API (Synthesized SFX)

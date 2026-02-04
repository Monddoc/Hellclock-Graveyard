# 🪦 The Graveyard

> **"A digital necropolis for your fallen heroes."**

**The Graveyard** is a highly atmospheric, Gothic-styled React application that visualizes player statistics from game save files. It parses raw run data—kills, skills, playtime—and immortalizes them into a shareable **Tombstone** card. Beyond a simple viewer, it connects to **The Crypt** (Supabase) to create a persistent global leaderboard of the fallen.

[![Live Demo](https://img.shields.io/badge/Live-Demo-red?style=for-the-badge)](INSERT_LIVE_DEMO_LINK_HERE)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## ✨ Key Features

### 📜 Save File Parser
Drag-and-drop your `PlayerSave.json` file to instantly decode raw game data. The Graveyard extracts deep statistics including:
- **Lifetime Stats**: Total Runs, Enemies Slain, Damage Dealt.
- **Loadouts**: Equipped Skills (filtered by active slots).
- **Run History**: Detailed breakdown of your latest demise.

### ⚰️ The Tombstone Generator
Generate a high-resolution, shareable memorial for your character.
- **Dynamic Rendering**: Uses `html-to-image` to capture the DOM as a crisp PNG.
- **Visual Polish**: Handles complex CORS issues, padding, and drop-shadows to ensure every export looks like a professional card.

### 🌑 Atmospheric UI
A fully immersive "Dark Fantasy" environment designed to set the mood:
- **Framer Motion Animations**: Smooth, ghostly transitions and UI reveals.
- **Dynamic Weather**: "Fog" effects for depth.
- **Thematic Assets**: Lighting effects.

### 🕯️ The Crypt (Backend)
Integrated with **Supabase** to memorialize every upload.
- **Filters**: View the "Fallen Heroes" sorted by Kills, Playtime, or Respects Paid.
- **Persistent Storage**: Your run data is stored securely in a PostgreSQL database.

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Utilities**:
    - `html-to-image`: For exporting DOM nodes as images.
    - `lucide-react`: For icon assets.
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)

---

## 🚀 Getting Started

Follow these steps to raise The Graveyard locally.

### Prerequisites
- **Node.js** (v18+)
- **NPM** (v9+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Monddoc/Hellclock-Graveyard.git
   cd Hellclock-Graveyard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to enter The Graveyard.

---

## 📸 Screenshots

| Landing Page | Exported Tombstone |
|:---:|:---:|
|

---

<p align="center">
  <em>May your runs be long, and your deaths be glorious.</em>
</p>

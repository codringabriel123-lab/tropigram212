# 🌴 Tropical România Roleplay

Social media pentru comunitatea de roleplay. Construit cu React + Node.js + MongoDB.

---

## 📁 Structura proiectului

```
tropical-rp/
├── backend/          ← Express API (Node.js)
│   ├── index.js
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── package.json
└── frontend/         ← React (Vite)
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── context/
    │   └── api.js
    └── package.json
```

---

## 🚀 Deploy pe Render.com

### PASUL 1: MongoDB Atlas (baza de date)

1. Du-te pe **https://cloud.mongodb.com** și fă cont gratuit
2. Creează un cluster **Free (M0)**
3. La **Database Access** → adaugă un user cu parolă
4. La **Network Access** → adaugă `0.0.0.0/0` (permite orice IP)
5. Click pe **Connect** → **Drivers** → copiază connection string:
   ```
   mongodb+srv://USER:PAROLA@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Schimbă `USER` și `PAROLA` cu datele tale și adaugă `/tropical-rp` la sfârșit:
   ```
   mongodb+srv://USER:PAROLA@cluster0.xxxxx.mongodb.net/tropical-rp?retryWrites=true&w=majority
   ```

---

### PASUL 2: Urcă codul pe GitHub

1. Creează un repository nou pe GitHub (ex: `tropical-rp`)
2. Pune tot folderul `tropical-rp/` pe GitHub (ambele foldere: backend + frontend)

---

### PASUL 3: Deploy Backend pe Render

1. Du-te pe **https://render.com** → **New** → **Web Service**
2. Conectează repository-ul GitHub
3. Setările:
   - **Name:** `tropical-rp-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. La **Environment Variables** adaugă:
   ```
   MONGO_URI = mongodb+srv://USER:PAROLA@cluster0.xxxxx.mongodb.net/tropical-rp?retryWrites=true&w=majority
   JWT_SECRET = un_sir_random_lung_de_minim_32_caractere_ex_abc123xyz789
   CLIENT_URL = https://tropical-rp-frontend.onrender.com
   PORT = 5000
   ```
5. Click **Create Web Service** și așteaptă deploy-ul
6. Copiază URL-ul backend-ului (ex: `https://tropical-rp-backend.onrender.com`)

---

### PASUL 4: Deploy Frontend pe Render

1. **New** → **Static Site**
2. Conectează același repository
3. Setările:
   - **Name:** `tropical-rp-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. La **Environment Variables** adaugă:
   ```
   VITE_API_URL = https://tropical-rp-backend.onrender.com/api
   ```
5. Click **Create Static Site**

---

### PASUL 5: Actualizează CLIENT_URL în backend

Dacă URL-ul frontend-ului e diferit de cel pus la pasul 3, actualizează variabila `CLIENT_URL` în backend pe Render.

---

## 💻 Rulare locală (development)

### Backend:
```bash
cd backend
npm install
# Creează fișierul .env (copiază .env.example și completează)
cp .env.example .env
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
# Creează fișierul .env
echo "VITE_API_URL=http://localhost:5000/api" > .env
npm run dev
```

---

## ✅ Funcționalități

- 🔐 Autentificare (register/login cu JWT)
- 📰 Feed personalizat (postări de la cei urmăriți)
- 🔍 Explorează toate postările
- 👥 Listă membri cu follow/unfollow
- 📅 Evenimente (statice)
- 👤 Profil editabil
- ❤️ Like & comentarii
- 🔔 Notificări (like, comentariu, follow)
- ⚙️ Panel admin (ban/unban, toggle admin, statistici)
- 🌴 Teme: roleplay GTA/Los Santos

---

## 📝 Note

- Primul cont înregistrat primește automat drepturi de **admin**
- Pe Render free tier, backend-ul se oprește după 15 minute de inactivitate — primul request poate dura ~30 secunde
- Imaginile din postări sunt URL-uri externe (nu există upload local)

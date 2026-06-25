* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', sans-serif;
  background: #0d0d0d;
  color: #ffffff;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #111; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

input, textarea, select {
  font-family: 'Inter', sans-serif;
  outline: none;
}

button { font-family: 'Inter', sans-serif; cursor: pointer; }

a { text-decoration: none; color: inherit; }

.fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

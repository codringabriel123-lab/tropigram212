import { useState, useEffect } from "react";
import api from "../api";
import PostCard from "../components/PostCard";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    api.get("/posts/saved")
      .then(r => setPosts(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Când o postare e desalvată din card, o eliminăm imediat din listă
  const handleDelete = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;
  if (error) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "#555" }}>
      Nu am putut încărca postările salvate. Verifică conexiunea și încearcă din nou.
    </div>
  );

  return (
    <div>
      <div style={{ padding: "16px 16px 8px", fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
        🔖 Postări salvate
      </div>
      {posts.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#555" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
          <div style={{ fontSize: 14 }}>Nu ai salvat nicio postare încă.</div>
          <div style={{ fontSize: 12, marginTop: 6, color: "#444" }}>Apasă pe iconița 🏷️ de pe o postare pentru a o salva aici.</div>
        </div>
      )}
      {posts.map(p => <PostCard key={p._id} post={p} onDelete={handleDelete} />)}
    </div>
  );
}

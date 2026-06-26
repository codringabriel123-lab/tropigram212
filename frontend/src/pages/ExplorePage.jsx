import { useState, useEffect } from "react";
import api from "../api";
import PostCard from "../components/PostCard";

export default function ExplorePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const handleDelete = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  useEffect(() => {
    setError(false);
    api.get("/posts/explore")
      .then(r => setPosts(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;
  if (error) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "#555" }}>
      Nu am putut încărca postările. Verifică conexiunea și încearcă din nou.
    </div>
  );

  return (
    <div>
      <div style={{ padding: "16px 16px 8px", fontWeight: 700, fontSize: 18 }}>Explorează</div>
      {posts.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "#555" }}>Nicio postare încă.</div>}
      {posts.map(p => <PostCard key={p._id} post={p} onDelete={handleDelete} />)}
    </div>
  );
}

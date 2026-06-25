import { useState, useEffect } from "react";
import api from "../api";
import PostCard from "../components/PostCard";
import PostModal from "../components/PostModal";

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchFeed(); }, []);

  const fetchFeed = async () => {
    try {
      const res = await api.get("/posts/feed");
      setPosts(res.data);
    } catch {}
    setLoading(false);
  };

  const handlePosted = (post) => setPosts(prev => [post, ...prev]);
  const handleDelete = (id) => setPosts(prev => prev.filter(p => p._id !== id));

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;

  return (
    <div>
      {posts.length === 0 && (
        <div style={{ textAlign: "center", padding: "5rem 2rem", color: "#555" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🌴</div>
          <div style={{ fontSize: 16, marginBottom: 8, color: "#888" }}>Feed-ul tău e gol</div>
          <div style={{ fontSize: 13, marginBottom: 24 }}>Urmărește membri sau fă prima ta postare!</div>
          <button onClick={() => setShowModal(true)} style={{ padding: "10px 24px", borderRadius: 20, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Postează ceva 🌴
          </button>
        </div>
      )}
      {posts.map(p => <PostCard key={p._id} post={p} onDelete={handleDelete} />)}
      {showModal && <PostModal onClose={() => setShowModal(false)} onPosted={handlePosted} />}
    </div>
  );
}

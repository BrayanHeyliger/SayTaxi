import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Card } from "@/components/ui/card";
import { useLocalAuth } from "@/contexts/LocalAuthContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Newspaper, CalendarDays, User } from "lucide-react";

type NewsPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
  author: string;
  tags: string[];
  featured: boolean;
};

export default function NewsPage() {
  const { user, isAuthenticated, logout } = useLocalAuth();
  const { data: posts = [], isLoading } = trpc.siteSettings.getNewsPosts.useQuery();
  const [fallback, setFallback] = useState<NewsPost[] | null>(null);

  useEffect(() => {
    const tryLoad = async () => {
      if ((posts as NewsPost[]).length === 0) {
        try {
          const res = await fetch("/news_posts.json");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) setFallback(data as NewsPost[]);
          }
        } catch {
          // ignore
        }
      }
    };
    tryLoad();
  }, [posts]);

  const effectivePosts = (posts as NewsPost[]).length > 0 ? (posts as NewsPost[]) : (fallback ?? []);
  const sorted = [...effectivePosts].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,_oklch(0.16_0.02_248)_0%,_oklch(0.1_0.018_252)_55%,_oklch(0.085_0.014_255)_100%)]">
      <Navbar user={user} isAuthenticated={isAuthenticated} onLogout={logout} onLogin={() => (window.location.href = "/login")} />

      <main className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-semibold mb-4">
              <Newspaper size={14} /> Actualizaciones del sistema
            </div>
            <h1 className="text-4xl font-extrabold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              Novedades
            </h1>
            <p className="text-white/65 mt-3">Todo lo nuevo que vamos construyendo en SayTaxi.</p>
          </div>

          {isLoading ? (
            <Card className="p-8 text-center rounded-3xl border border-white/12 bg-slate-950/72 backdrop-blur-2xl shadow-lg">Cargando novedades...</Card>
          ) : sorted.length === 0 ? (
            <Card className="p-8 text-center rounded-3xl border border-white/12 bg-slate-950/72 backdrop-blur-2xl shadow-lg">
              <Newspaper size={36} className="mx-auto text-white/70 mb-3" />
              <p className="text-white font-semibold">Aún no hay noticias publicadas</p>
              <p className="text-white/70 text-sm mt-1">Pronto verás aquí cada mejora del sistema.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {sorted.map((post) => (
                <Card key={post.id} className="p-6 rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-sm shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {post.featured && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Destacada</span>
                    )}
                    <span className="text-xs text-white/70 flex items-center gap-1"><CalendarDays size={12} /> {new Date(post.publishedAt).toLocaleDateString("es")}</span>
                    <span className="text-xs text-white/70 flex items-center gap-1"><User size={12} /> {post.author}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>{post.title}</h2>
                  <p className="text-white/75 mt-2">{post.summary}</p>
                  <div className="text-white/85 mt-4 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: post.content }} />
                  <div className="flex flex-wrap gap-1 mt-4">
                    {(post.tags || []).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/6 text-white/80">#{tag}</span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

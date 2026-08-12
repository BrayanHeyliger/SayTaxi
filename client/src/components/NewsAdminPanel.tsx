import { useMemo, useState, useEffect } from "react";
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Save, Trash2, Pencil, Newspaper } from "lucide-react";

type NewsPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  publishedAt: string;
  author: string;
  tags: string[];
  featured: boolean;
  slug?: string;
  status?: "draft" | "published" | "scheduled";
  seoTitle?: string;
  seoDescription?: string;
  category?: string;
  order?: number;
};

const emptyPost: NewsPost = {
  id: "",
  title: "",
  summary: "",
  content: "",
  publishedAt: new Date().toISOString(),
  author: "Equipo SayTaxi",
  tags: [],
  featured: false,
  status: "published",
};

function toDateInput(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function NewsAdminPanel() {
  const { data: posts = [], refetch, isLoading } = trpc.siteSettings.getNewsPosts.useQuery();
  const saveMutation = trpc.siteSettings.saveNewsPosts.useMutation({
    onSuccess: async () => {
      toast.success("Novedades guardadas");
      await refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsPost>(emptyPost);
  const uploadImage = trpc.siteSettings.uploadNewsImage.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const mediaQuery = trpc.siteSettings.getMediaList.useQuery(undefined, { enabled: true });
  const deleteMedia = trpc.siteSettings.deleteMedia.useMutation();

  // Drag & drop ordering helpers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const list = (posts as NewsPost[]).slice();
    const fromIdx = list.findIndex((p) => p.id === id);
    const toIdx = list.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const ordered = list.map((p, i) => ({ ...p, order: i }));
    saveMutation.mutate({ posts: ordered });
  };

  // TipTap editor instance bound to form.content
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: true })],
    content: form.content || "",
    onUpdate: ({ editor }) => {
      setForm((p) => ({ ...p, content: editor.getHTML() }));
    },
  });

  // Keep editor content in sync when switching posts or when form.content updates
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (form.content && form.content !== current) {
      editor.commands.setContent(form.content || "");
    } else if (!form.content && current !== "") {
      editor.commands.clearContent();
    }
  }, [editingId, form.content, editor]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a: NewsPost, b: NewsPost) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [posts]);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ ...emptyPost, id: `news-${Date.now()}`, publishedAt: new Date().toISOString() });
    setShowForm(true);
  };

  const handleOpenEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setForm({ ...post });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.summary.trim() || !form.content.trim()) {
      toast.error("Completa título, resumen y contenido");
      return;
    }

    const next: NewsPost[] = editingId
      ? (posts as NewsPost[]).map((p) => (p.id === editingId ? { ...form } : p))
      : [{ ...form }, ...(posts as NewsPost[])];

    saveMutation.mutate({ posts: next });
    setShowForm(false);
  };

  

  const handleDelete = (id: string) => {
    const next = (posts as NewsPost[]).filter((p) => p.id !== id);
    saveMutation.mutate({ posts: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Sora', sans-serif" }}>Novedades del Sistema</h2>
          <p className="text-sm text-slate-500">Publica actualizaciones visibles para tus usuarios en la página de Novedades.</p>
        </div>
        <Button onClick={handleOpenNew} className="bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-450 text-white gap-2 rounded-xl shadow-md">
          <Plus size={16} /> Nueva noticia
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center rounded-2xl shadow-lg">Cargando novedades...</Card>
      ) : sortedPosts.length === 0 ? (
        <Card className="p-8 text-center rounded-2xl shadow-lg">
          <Newspaper size={36} className="mx-auto text-slate-500 mb-3" />
          <p className="text-slate-700 font-medium">No hay novedades publicadas</p>
          <p className="text-sm text-slate-500 mt-1">Crea la primera noticia para informar a tus usuarios.</p>
        </Card>
      ) : (
        <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Imagen (opcional)</label>
                {form.imageUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={form.imageUrl} alt="preview" className="w-32 h-20 object-cover rounded-md border" />
                    <button className="text-sm text-red-500" onClick={() => setForm((p) => ({ ...p, imageUrl: undefined }))}>Quitar</button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const dataUrl = reader.result as string;
                          const res: any = await uploadImage.mutateAsync({ dataUrl });
                          if (res?.url) {
                            setForm((p) => ({ ...p, imageUrl: res.url }));
                            toast.success("Imagen subida");
                          }
                        };
                        reader.readAsDataURL(f);
                      }}
                    />
                    <span className="text-sm text-slate-500">(PNG/JPEG/WebP)</span>
                  </div>
                )}
              </div>
          {sortedPosts.map((post: NewsPost) => (
            <Card key={post.id} className="p-4 rounded-2xl shadow-md" draggable onDragStart={(e) => handleDragStart(e, post.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, post.id)}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {post.featured && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Destacada</span>}
                    <span className="text-xs text-slate-500">{new Date(post.publishedAt).toLocaleDateString("es")}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{post.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{post.summary}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(post.tags || []).map((tag) => (
                      <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenEdit(post)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingId ? "Editar noticia" : "Nueva noticia"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Resumen</label>
                <input
                  value={form.summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Slug (URL)</label>
                  <input value={form.slug || ""} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                  <input value={form.category || ""} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                <select value={form.status || "published"} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm">
                  <option value="published">Publicado</option>
                  <option value="draft">Borrador</option>
                  <option value="scheduled">Programado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">SEO: Título</label>
                <input value={form.seoTitle || ""} onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">SEO: Descripción</label>
                <input value={form.seoDescription || ""} onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contenido (WYSIWYG)</label>
                <div className="border border-slate-200 rounded-xl p-2 bg-white">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("bold") ? "bg-slate-200 font-semibold" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("italic") ? "bg-slate-200 italic" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("heading", { level: 1 }) ? "bg-slate-200" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("heading", { level: 2 }) ? "bg-slate-200" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("bulletList") ? "bg-slate-200" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("orderedList") ? "bg-slate-200" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    >
                      1. List
                    </button>
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("blockquote") ? "bg-slate-200 italic" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    >
                      ❝
                    </button>
                    <button
                      type="button"
                      className={"px-2 py-1 rounded " + (editor?.isActive("codeBlock") ? "bg-slate-200 font-mono" : "bg-slate-100")}
                      onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    >
                      {'</>'}
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 bg-slate-100 rounded"
                      onClick={() => {
                        const url = prompt("URL");
                        if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                      }}
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 bg-slate-100 rounded"
                      onClick={() => {
                        const html = prompt("Pegar HTML");
                        if (html) editor?.commands.insertContent(html);
                      }}
                    >
                      Insertar HTML
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 bg-slate-100 rounded"
                      onClick={() => {
                        editor?.chain().focus().clearNodes().unsetAllMarks().run();
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                  <div className="min-h-[160px] p-3 bg-white">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Autor</label>
                  <input
                    value={form.author}
                    onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={toDateInput(form.publishedAt)}
                    onChange={(e) => setForm((prev) => ({ ...prev, publishedAt: new Date(`${e.target.value}T12:00:00Z`).toISOString() }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tags (separados por coma)</label>
                <input
                  value={(form.tags || []).join(", ")}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                />
                Marcar como destacada
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Biblioteca de Medios</label>
                <div className="grid grid-cols-3 gap-2">
                  {mediaQuery.data?.items?.length ? mediaQuery.data.items.map((m: any) => (
                    <div key={m.filename} className="border p-1 rounded text-center">
                      <img src={m.url} className="w-full h-20 object-cover mb-1" />
                      <div className="flex gap-1">
                        <button className="text-xs px-2 py-1 bg-slate-100 rounded flex-1" onClick={() => setForm((p) => ({ ...p, imageUrl: m.url }))}>Usar</button>
                        <button className="text-xs px-2 py-1 bg-red-100 rounded" onClick={async () => { if (confirm('Borrar archivo?')) { await deleteMedia.mutateAsync({ filename: m.filename }); mediaQuery.refetch(); } }}>Borrar</button>
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-500">No hay imágenes</div>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2" onClick={handleSave} disabled={saveMutation.isPending}>
                <Save size={14} /> Guardar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

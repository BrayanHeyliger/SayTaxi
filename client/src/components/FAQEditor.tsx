/**
 * FAQEditor — Editor de preguntas frecuentes para el panel Super Admin
 * Permite agregar, editar, eliminar y reordenar preguntas del FAQ
 */
import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Save, X, ChevronUp, ChevronDown, HelpCircle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FAQItem = { id: string; category: string; q: string; a: string };

const DEFAULT_CATEGORIES = [
  "🚕 Sobre el servicio",
  "🐾 Mascotas y necesidades especiales",
  "💳 Pagos y tarifas",
  "🔒 Seguridad y confianza",
];

const defaultFAQs: FAQItem[] = [
  { id: "1", category: "🚕 Sobre el servicio", q: "¿Cuánto tiempo tarda en llegar el taxi?", a: "En zonas urbanas, el tiempo promedio de llegada es de 3 a 8 minutos." },
  { id: "2", category: "🚕 Sobre el servicio", q: "¿Hacen viajes al aeropuerto?", a: "Sí, realizamos traslados al aeropuerto las 24 horas, los 7 días de la semana." },
  { id: "3", category: "🐾 Mascotas y necesidades especiales", q: "¿Aceptan mascotas en el taxi?", a: "Sí, aceptamos mascotas pequeñas y medianas que viajen en transportín o jaula." },
  { id: "4", category: "🐾 Mascotas y necesidades especiales", q: "¿Tienen sillas para bebés o niños?", a: "Sí, contamos con sillas para bebés y sillas elevadoras para niños. Solicítala al reservar." },
  { id: "5", category: "💳 Pagos y tarifas", q: "¿Cuáles son los métodos de pago aceptados?", a: "Aceptamos: efectivo, tarjeta de crédito/débito, Zelle, transferencia bancaria y pago móvil." },
  { id: "6", category: "🔒 Seguridad y confianza", q: "¿Cómo sé que el conductor es de confianza?", a: "Todos nuestros conductores pasan por verificación de antecedentes penales y revisión de licencia." },
];

export default function FAQEditor() {
  const [faqs, setFaqs] = useState<FAQItem[]>(defaultFAQs);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Omit<FAQItem, "id">>({ category: DEFAULT_CATEGORIES[0], q: "", a: "" });
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [saved, setSaved] = useState(false);
  const CONFIG_KEY = "passenger_site_config";
  const LEGACY_CONFIG_KEY = "wataxi_config";

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.customFAQs && Array.isArray(parsed.customFAQs) && parsed.customFAQs.length > 0) {
          setFaqs(parsed.customFAQs);
        }
      }
    } catch {}
  }, []);

  const handleSave = () => {
    try {
      const stored = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_CONFIG_KEY);
      const config = stored ? JSON.parse(stored) : {};
      config.customFAQs = faqs;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      localStorage.removeItem(LEGACY_CONFIG_KEY);
      setSaved(true);
      toast.success("FAQ guardado correctamente");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Error al guardar el FAQ");
    }
  };

  const handleAdd = () => {
    if (!newItem.q.trim() || !newItem.a.trim()) {
      toast.error("Completa la pregunta y la respuesta");
      return;
    }
    const item: FAQItem = { ...newItem, id: Date.now().toString() };
    setFaqs([...faqs, item]);
    setNewItem({ category: DEFAULT_CATEGORIES[0], q: "", a: "" });
    setAdding(false);
    toast.success("Pregunta agregada");
  };

  const handleDelete = (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
    toast.success("Pregunta eliminada");
  };

  const handleEdit = (item: FAQItem) => {
    setEditing({ ...item });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    setFaqs(faqs.map((f) => (f.id === editing.id ? editing : f)));
    setEditing(null);
    toast.success("Pregunta actualizada");
  };

  const handleMove = (id: string, dir: "up" | "down") => {
    const idx = faqs.findIndex((f) => f.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === faqs.length - 1) return;
    const newFaqs = [...faqs];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    [newFaqs[idx], newFaqs[swap]] = [newFaqs[swap], newFaqs[idx]];
    setFaqs(newFaqs);
  };

  const categories = Array.from(new Set(faqs.map((f) => f.category)));
  const filtered = filterCategory === "all" ? faqs : faqs.filter((f) => f.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle size={20} className="text-green-500" />
            Editor de Preguntas Frecuentes
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{faqs.length} preguntas · Los cambios se publican en la página /faq</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/faq"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <ExternalLink size={14} />
            Ver FAQ
          </a>
          <Button
            onClick={handleSave}
            className="bg-green-500 hover:bg-green-600 text-white gap-2"
          >
            <Save size={15} />
            {saved ? "¡Guardado!" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {/* Filter by category */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === "all" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Todas ({faqs.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === cat ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {cat} ({faqs.filter((f) => f.category === cat).length})
          </button>
        ))}
      </div>

      {/* FAQ list */}
      <div className="space-y-3">
        {filtered.map((item, i) => (
          <Card key={item.id} className="p-4">
            {editing?.id === item.id ? (
              /* Edit mode */
              <div className="space-y-3">
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="text"
                  value={editing.q}
                  onChange={(e) => setEditing({ ...editing, q: e.target.value })}
                  placeholder="Pregunta..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none font-medium"
                />
                <textarea
                  value={editing.a}
                  onChange={(e) => setEditing({ ...editing, a: e.target.value })}
                  placeholder="Respuesta..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1"><Save size={13} /> Guardar</Button>
                  <Button onClick={() => setEditing(null)} size="sm" variant="outline" className="gap-1"><X size={13} /> Cancelar</Button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => handleMove(item.id, "up")} disabled={i === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronUp size={14} /></button>
                  <button onClick={() => handleMove(item.id, "down")} disabled={i === filtered.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronDown size={14} /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">{item.category}</span>
                  <p className="font-semibold text-sm text-slate-900 mt-0.5">{item.q}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.a}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Add new question */}
      {adding ? (
        <Card className="p-5 border-2 border-green-200 bg-green-50/30">
          <h3 className="font-semibold text-sm text-slate-900 mb-3">Nueva pregunta</h3>
          <div className="space-y-3">
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
            >
              {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="➕ Nueva categoría">➕ Nueva categoría</option>
            </select>
            {newItem.category === "➕ Nueva categoría" && (
              <input
                type="text"
                placeholder="Nombre de la nueva categoría..."
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            )}
            <input
              type="text"
              value={newItem.q}
              onChange={(e) => setNewItem({ ...newItem, q: e.target.value })}
              placeholder="¿Cuál es la pregunta?"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none font-medium"
            />
            <textarea
              value={newItem.a}
              onChange={(e) => setNewItem({ ...newItem, a: e.target.value })}
              placeholder="Escribe la respuesta completa aquí..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} className="bg-green-500 hover:bg-green-600 text-white gap-1"><Plus size={14} /> Agregar pregunta</Button>
              <Button onClick={() => setAdding(false)} variant="outline" className="gap-1"><X size={14} /> Cancelar</Button>
            </div>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-500 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={16} />
          Agregar nueva pregunta
        </button>
      )}

      {/* Save reminder */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
        <p className="text-amber-700 text-sm">
          💡 Recuerda hacer clic en <strong>Guardar cambios</strong> para publicar las preguntas en la página /faq
        </p>
        <Button onClick={handleSave} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1 flex-shrink-0 ml-3">
          <Save size={13} />
          Guardar
        </Button>
      </div>
    </div>
  );
}

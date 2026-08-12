/**
 * MessagesInbox — Panel de mensajes recibidos desde el landing page
 * Para el panel Super Admin
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, MailOpen, Archive, Trash2, Reply, RefreshCw,
  Search, Filter, Building2, Clock, CheckCheck, Eye,
  MessageSquare, AlertCircle, Loader2, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

type MessageStatus = "all" | "unread" | "read" | "replied" | "archived";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  unread:   { label: "Sin leer",  color: "bg-blue-500/20 text-blue-300 border-blue-500/30",    icon: Mail },
  read:     { label: "Leído",     color: "bg-white/10 text-white/60 border-white/10",           icon: MailOpen },
  replied:  { label: "Respondido",color: "bg-green-500/20 text-green-300 border-green-500/30",  icon: CheckCheck },
  archived: { label: "Archivado", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: Archive },
};

export default function MessagesInbox() {
  const [filter, setFilter] = useState<MessageStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const { data, isLoading, refetch } = trpc.siteSettings.getMessages.useQuery({ status: filter, limit: 100, offset: 0 });
  const { data: unreadData } = trpc.siteSettings.getUnreadCount.useQuery();
  const updateStatus = trpc.siteSettings.updateMessageStatus.useMutation({ onSuccess: () => { refetch(); toast.success("Estado actualizado"); } });
  const deleteMsg = trpc.siteSettings.deleteMessage.useMutation({ onSuccess: () => { refetch(); setSelectedId(null); toast.success("Mensaje eliminado"); } });

  const messages = (data?.messages || []).filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || (m.company || "").toLowerCase().includes(s) || m.message.toLowerCase().includes(s);
  });

  const selected = messages.find(m => m.id === selectedId);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setShowNotes(false);
    const msg = messages.find(m => m.id === id);
    setAdminNotes(msg?.adminNotes || "");
    // Mark as read if unread
    if (msg?.status === "unread") {
      updateStatus.mutate({ id, status: "read" });
    }
  };

  const handleUpdateStatus = (id: number, status: "unread" | "read" | "replied" | "archived") => {
    updateStatus.mutate({ id, status, adminNotes: adminNotes || undefined });
  };

  const formatDate = (d: Date | string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "Ahora mismo";
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.76 0.18 148 / 0.15)" }}>
            <MessageSquare size={20} style={{ color: "oklch(0.76 0.18 148)" }} />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Mensajes recibidos</h2>
            <p className="text-white/40 text-xs">Formulario de contacto del landing page</p>
          </div>
          {(unreadData?.count ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white animate-pulse">
              {unreadData?.count} sin leer
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/50 hover:text-white gap-2">
          <RefreshCw size={14} />
          Actualizar
        </Button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "oklch(0.14 0.01 250)" }}>
          {(["all", "unread", "read", "replied", "archived"] as MessageStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? "text-white shadow" : "text-white/40 hover:text-white/70"}`}
              style={filter === s ? { background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" } : {}}
            >
              {s === "all" ? "Todos" : STATUS_LABELS[s]?.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o empresa..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:ring-1"
            style={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(1 0 0 / 0.08)" }}
          />
        </div>
      </div>

      {/* Main layout: list + detail */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 280px)" }}>

        {/* Message list */}
        <div className="w-full max-w-sm flex flex-col gap-2 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 size={20} className="animate-spin mr-2" /> Cargando...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "oklch(0.14 0.01 250)" }}>
                <Mail size={24} className="text-white/20" />
              </div>
              <p className="text-white/40 text-sm">No hay mensajes</p>
              <p className="text-white/20 text-xs">Los mensajes del formulario de contacto aparecerán aquí</p>
            </div>
          ) : (
            messages.map(msg => {
              const isSelected = msg.id === selectedId;
              const isUnread = msg.status === "unread";
              return (
                <button
                  key={msg.id}
                  onClick={() => handleSelect(msg.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all border ${isSelected ? "border-green-500/40" : "border-transparent hover:border-white/10"}`}
                  style={{ background: isSelected ? "oklch(0.76 0.18 148 / 0.1)" : "oklch(0.14 0.01 250)" }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: isUnread ? "oklch(0.76 0.18 148)" : "oklch(0.20 0.01 250)", color: isUnread ? "oklch(0.08 0.02 148)" : "white" }}
                    >
                      {msg.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isUnread ? "text-white" : "text-white/70"}`}>{msg.name}</p>
                        <span className="text-white/30 text-xs flex-shrink-0">{formatDate(msg.createdAt)}</span>
                      </div>
                      {msg.company && <p className="text-white/40 text-xs truncate">{msg.company}</p>}
                      <p className="text-white/50 text-xs truncate mt-0.5">{msg.message}</p>
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${STATUS_LABELS[msg.status]?.color}`}>
                          {msg.status === "unread" && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                          {STATUS_LABELS[msg.status]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Message detail */}
        <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "oklch(0.18 0.01 250)" }}>
                <MailOpen size={28} className="text-white/20" />
              </div>
              <p className="text-white/40 text-sm">Selecciona un mensaje para leerlo</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Detail header */}
              <div className="p-5 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                      style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
                    >
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">{selected.name}</h3>
                      <a href={`mailto:${selected.email}`} className="text-blue-400 text-sm hover:underline">{selected.email}</a>
                      {selected.company && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 size={11} className="text-white/30" />
                          <span className="text-white/50 text-xs">{selected.company}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-white/30 text-xs flex items-center gap-1">
                      <Clock size={11} />
                      {formatDate(selected.createdAt)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${STATUS_LABELS[selected.status]?.color}`}>
                      {STATUS_LABELS[selected.status]?.label}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  <a
                    href={`mailto:${selected.email}?subject=Re: Tu mensaje en Passenger`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                    style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
                    onClick={() => handleUpdateStatus(selected.id, "replied")}
                  >
                    <Reply size={13} /> Responder por email
                  </a>
                  {selected.status !== "read" && (
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white text-xs gap-1.5 h-8"
                      onClick={() => handleUpdateStatus(selected.id, "read")}>
                      <Eye size={13} /> Marcar leído
                    </Button>
                  )}
                  {selected.status !== "replied" && (
                    <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 text-xs gap-1.5 h-8"
                      onClick={() => handleUpdateStatus(selected.id, "replied")}>
                      <CheckCheck size={13} /> Marcar respondido
                    </Button>
                  )}
                  {selected.status !== "archived" && (
                    <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300 text-xs gap-1.5 h-8"
                      onClick={() => handleUpdateStatus(selected.id, "archived")}>
                      <Archive size={13} /> Archivar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 text-xs gap-1.5 h-8"
                    onClick={() => { if (confirm("¿Eliminar este mensaje?")) deleteMsg.mutate({ id: selected.id }); }}>
                    <Trash2 size={13} /> Eliminar
                  </Button>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 p-5 overflow-y-auto">
                <div
                  className="p-4 rounded-2xl text-white/80 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(1 0 0 / 0.06)" }}
                >
                  {selected.message}
                </div>

                {/* Admin notes */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="flex items-center gap-2 text-white/40 hover:text-white/70 text-xs transition-colors"
                  >
                    <MessageSquare size={13} />
                    Notas internas
                    <ChevronDown size={12} className={`transition-transform ${showNotes ? "rotate-180" : ""}`} />
                  </button>
                  {showNotes && (
                    <div className="mt-2 flex flex-col gap-2">
                      <Textarea
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        placeholder="Agrega notas internas sobre este contacto..."
                        rows={3}
                        className="text-white/70 text-sm resize-none"
                        style={{ background: "oklch(0.18 0.01 250)", border: "1px solid oklch(1 0 0 / 0.1)" }}
                      />
                      <Button
                        size="sm"
                        className="self-end text-xs"
                        style={{ background: "oklch(0.76 0.18 148)", color: "oklch(0.08 0.02 148)" }}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: selected.status as any, adminNotes })}
                      >
                        Guardar notas
                      </Button>
                    </div>
                  )}
                  {selected.adminNotes && !showNotes && (
                    <div className="mt-2 p-3 rounded-xl text-white/50 text-xs italic" style={{ background: "oklch(0.18 0.01 250)" }}>
                      📝 {selected.adminNotes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

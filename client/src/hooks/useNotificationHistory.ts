/**
 * useNotificationHistory
 * ─────────────────────────────────────────────────────────────────────────────
 * Almacena las notificaciones de las últimas 24 horas en localStorage.
 * Se auto-limpia cada vez que se monta el hook: elimina entradas con más de
 * 24 h de antigüedad. La clave de almacenamiento incluye el rol del usuario
 * para que cliente y chofer tengan listas separadas.
 *
 * También expone playAlert() para reproducir un sonido de campana/ding
 * generado con la Web Audio API (sin archivos externos).
 */
import { useState, useEffect, useCallback, useRef } from "react";

export interface StoredNotification {
  id: string;
  message: string;
  title: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;   // Unix ms
  read: boolean;
  url?: string;
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const MAX_ITEMS = 50;                 // máximo por lista

function storageKey(role: string) {
  return `wt_notif_history_${role}`;
}

function loadFromStorage(role: string): StoredNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(role));
    if (!raw) return [];
    const parsed: StoredNotification[] = JSON.parse(raw);
    const cutoff = Date.now() - TTL_MS;
    return parsed.filter(n => n.timestamp > cutoff);
  } catch {
    return [];
  }
}

function saveToStorage(role: string, items: StoredNotification[]) {
  try {
    localStorage.setItem(storageKey(role), JSON.stringify(items));
  } catch {
    // localStorage lleno — ignorar
  }
}

// ── Sonido de alerta con Web Audio API ────────────────────────────────────────
// Genera un "ding" de 2 notas sin necesitar archivos de audio externos.
function playAlertSound(type: "new_trip" | "accepted" | "info" = "info") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const freqs: Record<string, number[]> = {
      new_trip: [880, 1100],   // Ding-dong agudo — nuevo viaje
      accepted: [660, 880],    // Ding suave — viaje aceptado
      info:     [440],         // Beep simple — info
    };

    const notes = freqs[type] || freqs.info;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.35);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.4);
    });
  } catch {
    // AudioContext no disponible — ignorar
  }
}

// ── Hook principal ─────────────────────────────────────────────────────────────
export function useNotificationHistory(role: string = "client") {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const cleanupRef = useRef(false);

  // Cargar y limpiar al montar
  useEffect(() => {
    if (cleanupRef.current) return;
    cleanupRef.current = true;
    const clean = loadFromStorage(role);
    saveToStorage(role, clean);
    setNotifications(clean);
    setUnreadCount(clean.filter(n => !n.read).length);
  }, [role]);

  // Limpiar automáticamente cada hora (por si la app queda abierta)
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => {
        const cutoff = Date.now() - TTL_MS;
        const clean = prev.filter(n => n.timestamp > cutoff);
        saveToStorage(role, clean);
        setUnreadCount(clean.filter(n => !n.read).length);
        return clean;
      });
    }, 60 * 60 * 1000); // cada hora
    return () => clearInterval(interval);
  }, [role]);

  /** Agregar una notificación y reproducir sonido */
  const addNotification = useCallback((
    message: string,
    options?: {
      title?: string;
      type?: StoredNotification["type"];
      url?: string;
      sound?: "new_trip" | "accepted" | "info" | false;
    }
  ): StoredNotification => {
    const notif: StoredNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      title: options?.title || "Passenger",
      type: options?.type || "info",
      timestamp: Date.now(),
      read: false,
      url: options?.url,
    };

    setNotifications(prev => {
      const updated = [notif, ...prev].slice(0, MAX_ITEMS);
      saveToStorage(role, updated);
      return updated;
    });
    setUnreadCount(c => c + 1);

    // Reproducir sonido (por defecto "info", false = sin sonido)
    if (options?.sound !== false) {
      playAlertSound(options?.sound || "info");
    }

    return notif;
  }, [role]);

  /** Marcar todas como leídas */
  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveToStorage(role, updated);
      return updated;
    });
    setUnreadCount(0);
  }, [role]);

  /** Limpiar toda la lista */
  const clearAll = useCallback(() => {
    saveToStorage(role, []);
    setNotifications([]);
    setUnreadCount(0);
  }, [role]);

  /** Reproducir sonido manualmente */
  const playAlert = useCallback((type: "new_trip" | "accepted" | "info" = "info") => {
    playAlertSound(type);
  }, []);

  return { notifications, unreadCount, addNotification, markAllRead, clearAll, playAlert };
}

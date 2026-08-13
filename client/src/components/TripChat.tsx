import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageCircle, X, Minimize2, Wifi, WifiOff, Phone, PhoneOff, PhoneIncoming, PhoneMissed, ArrowLeft } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TripChatProps {
  tripId: string | null;
  userId: string;
  userName: string;
  role: "client" | "driver";
  otherPartyName: string;
  className?: string;
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showLauncher?: boolean;
  fullScreen?: boolean;
  enableBackClose?: boolean;
}

export function TripChat({
  tripId,
  userId,
  userName,
  role,
  otherPartyName,
  className,
  forceOpen,
  onOpenChange,
  showLauncher = true,
  fullScreen = false,
  enableBackClose = false,
}: TripChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyPushedRef = useRef(false);

  const {
    messages, isConnected, typingUser, sendMessage, sendTyping,
    callState, incomingCallerName, pendingOfferRef,
    startCall, answerCall, endCall, rejectCall,
  } = useSocket({
    roomId: tripId,
    userId,
    role,
    enabled: !!tripId,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Count unread when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.senderRole !== role) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages]);

  // Show toast when incoming call arrives
  useEffect(() => {
    if (callState === "incoming") {
      setIsOpen(true);
      toast.info(`📞 ${incomingCallerName} te está llamando...`, { duration: 15000 });
    }
    if (callState === "ended") {
      toast.info("📵 Llamada finalizada");
    }
  }, [callState, incomingCallerName]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendMessage(inputText, userName);
    setInputText("");
    inputRef.current?.focus();
  }, [inputText, sendMessage, userName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => sendTyping(userName), 300);
  };

  // Sync with external forceOpen prop
  useEffect(() => {
    if (forceOpen !== undefined && forceOpen !== isOpen) {
      setIsOpen(forceOpen);
      if (forceOpen) {
        setUnreadCount(0);
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [forceOpen]);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enableBackClose || !isOpen) return;

    historyPushedRef.current = true;
    window.history.pushState({ ...(window.history.state || {}), tripChatOpen: true }, "");

    const handlePopState = () => {
      historyPushedRef.current = false;
      setIsOpen(false);
      onOpenChange?.(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enableBackClose, isOpen, onOpenChange]);

  const handleOpen = () => {
    onOpenChange?.(true);
    setIsOpen(true);
    setUnreadCount(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    if (enableBackClose && historyPushedRef.current) {
      historyPushedRef.current = false;
      window.history.back();
      return;
    }

    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleStartCall = async () => {
    if (!isConnected) { toast.error("No hay conexión activa"); return; }
    try {
      await startCall(userName);
      toast.info(`📞 Llamando a ${otherPartyName}...`);
    } catch {
      toast.error("No se pudo iniciar la llamada. Verifica permisos de micrófono y compatibilidad del navegador.");
    }
  };

  const handleAnswerCall = async () => {
    if (!pendingOfferRef.current) return;
    try {
      await answerCall(pendingOfferRef.current);
      pendingOfferRef.current = null;
    } catch {
      toast.error("No se pudo contestar la llamada.");
    }
  };

  if (!tripId) return null;
  if (!isOpen && !showLauncher) return null;

  const callActive = callState === "active";
  const callCalling = callState === "calling";
  const callIncoming = callState === "incoming";

  return (
    <div className={cn(fullScreen ? "fixed inset-0 z-[9998]" : "fixed bottom-6 right-6 z-[9990] flex flex-col items-end gap-3", className)}>
      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            "overflow-hidden border border-white/60 bg-white/80 shadow-[0_28px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200",
            fullScreen ? "h-full w-full rounded-none" : "w-80 rounded-[26px]"
          )}
          style={fullScreen ? undefined : { height: "460px" }}
        >

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/25 ring-1 ring-white/40 flex items-center justify-center text-white font-bold text-sm">
                {otherPartyName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{otherPartyName}</p>
                <div className="flex items-center gap-1">
                  {callActive
                    ? <><span className="w-1.5 h-1.5 rounded-full bg-green-200 animate-pulse inline-block" /><span className="text-green-200 text-xs">En llamada</span></>
                    : isConnected
                      ? <><Wifi size={10} className="text-green-200" /><span className="text-green-200 text-xs">En línea</span></>
                      : <><WifiOff size={10} className="text-red-300" /><span className="text-red-300 text-xs">Conectando...</span></>
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Call button */}
              {callState === "idle" && (
                <button onClick={handleStartCall} title="Llamar" className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                  <Phone size={15} />
                </button>
              )}
              {(callCalling || callActive) && (
                <button onClick={endCall} title="Colgar" className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors animate-pulse">
                  <PhoneOff size={15} />
                </button>
              )}
              {fullScreen ? (
                <button onClick={handleClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors" aria-label="Volver" title="Volver">
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <button onClick={handleClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors" aria-label="Minimizar" title="Minimizar">
                  <Minimize2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Incoming call banner */}
          {callIncoming && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <PhoneIncoming size={16} className="text-green-600 animate-bounce" />
                <div>
                  <p className="text-sm font-semibold text-green-800">{incomingCallerName} llama</p>
                  <p className="text-xs text-green-600">Llamada de voz segura</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAnswerCall} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-full flex items-center gap-1 transition-colors">
                  <Phone size={12} /> Contestar
                </button>
                <button onClick={rejectCall} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full flex items-center gap-1 transition-colors">
                  <PhoneMissed size={12} /> Rechazar
                </button>
              </div>
            </div>
          )}

          {/* Calling / active call banner */}
          {(callCalling || callActive) && (
            <div className={cn("px-4 py-2 flex items-center justify-between flex-shrink-0 border-b", callActive ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200")}>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", callActive ? "bg-green-500 animate-pulse" : "bg-amber-500 animate-bounce")} />
                <p className={cn("text-xs font-medium", callActive ? "text-green-700" : "text-amber-700")}>
                  {callCalling ? `Llamando a ${otherPartyName}...` : `En llamada con ${otherPartyName}`}
                </p>
              </div>
              <button onClick={endCall} className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1">
                <PhoneOff size={12} /> Colgar
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-white/70 to-slate-100/80">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle size={32} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">Inicia la conversación con {otherPartyName}</p>
                <p className="text-xs text-slate-300 mt-1">📞 Pulsa el teléfono para llamar</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderRole === role;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    isMe
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-sm"
                      : "bg-white/95 text-slate-900 rounded-bl-sm border border-slate-200"
                  )}>
                    {!isMe && <p className="text-xs font-semibold mb-0.5 text-green-600">{msg.sender}</p>}
                    <p className="leading-relaxed break-words">{msg.text}</p>
                    <p className={cn("text-xs mt-0.5 text-right", isMe ? "text-green-100" : "text-slate-400")}>{msg.time}</p>
                  </div>
                </div>
              );
            })}
            {typingUser && typingUser !== userName && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 ml-1">escribiendo...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/60 bg-white/85 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-3 py-2 bg-white/90 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                disabled={!isConnected}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || !isConnected}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send size={15} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating launcher can be disabled in dashboards to avoid extra bubble icons */}
      {showLauncher && (
        <button
          onClick={isOpen ? handleClose : handleOpen}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative",
            callIncoming ? "bg-green-500 animate-bounce shadow-green-500/50" : "bg-green-500 hover:bg-green-600 shadow-green-500/30"
          )}
        >
          {isOpen
            ? <X size={22} className="text-white" />
            : callIncoming
              ? <PhoneIncoming size={22} className="text-white" />
              : <MessageCircle size={22} className="text-white" />
          }
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {!isOpen && isConnected && callState === "idle" && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-300 border-2 border-white rounded-full" />
          )}
        </button>
      )}
    </div>
  );
}

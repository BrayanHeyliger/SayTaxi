import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  sender: string;
  senderRole: "client" | "driver" | "admin";
  text: string;
  time: string;
}

export type CallState = "idle" | "calling" | "incoming" | "active" | "ended";

interface UseSocketOptions {
  roomId: string | null;
  userId: string;
  role: "client" | "driver" | "admin";
  enabled?: boolean;
}

export function useSocket({ roomId, userId, role, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── WebRTC voice call state ──────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCallerName, setIncomingCallerName] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];

  const supportsWebRTC =
    typeof window !== "undefined" &&
    typeof window.RTCPeerConnection !== "undefined" &&
    typeof window.RTCSessionDescription !== "undefined" &&
    typeof window.RTCIceCandidate !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  const createPeer = useCallback(() => {
    if (!supportsWebRTC) {
      throw new Error("WebRTC is not available in this browser");
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current && roomId) {
        socketRef.current.emit("call_ice", { roomId, candidate: e.candidate, from: userId });
      }
    };
    pc.ontrack = (e) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = e.streams[0];
    };
    peerRef.current = pc;
    return pc;
  }, [roomId, userId, supportsWebRTC]);

  const startCall = useCallback(async (callerName: string) => {
    if (!socketRef.current || !roomId) return;
    if (!supportsWebRTC) {
      throw new Error("WebRTC is not available");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = createPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("call_offer", { roomId, offer, from: userId, callerName });
      setCallState("calling");
    } catch (e) {
      console.error("[WebRTC] startCall error:", e);
      setCallState("idle");
    }
  }, [roomId, userId, createPeer, supportsWebRTC]);

  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!socketRef.current || !roomId) return;
    if (!supportsWebRTC) {
      throw new Error("WebRTC is not available");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = createPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("call_answer", { roomId, answer, from: userId });
      setCallState("active");
    } catch (e) {
      console.error("[WebRTC] answerCall error:", e);
      setCallState("idle");
    }
  }, [roomId, userId, createPeer, supportsWebRTC]);

  const endCall = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("call_end", { roomId, from: userId });
    }
    closePeer();
    setCallState("idle");
    setIncomingCallerName(null);
  }, [roomId, userId, closePeer]);

  const rejectCall = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("call_reject", { roomId, from: userId });
    }
    setCallState("idle");
    setIncomingCallerName(null);
  }, [roomId, userId]);

  // Store offer temporarily to pass to answerCall
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) return;

    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join_room", { roomId, userId, role });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("connect_error", (error) => {
      setIsConnected(false);
      console.error("[Socket.io] connection error:", error);
    });

    socket.on("message_history", (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("user_typing", ({ sender }: { sender: string }) => {
      setTypingUser(sender);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingUser(null), 2500);
    });

    // ── WebRTC events ──────────────────────────────────────────────────────────
    socket.on("call_incoming", ({ offer, callerName }: { offer: RTCSessionDescriptionInit; from: string; callerName: string }) => {
      pendingOfferRef.current = offer;
      setIncomingCallerName(callerName);
      setCallState("incoming");
    });

    socket.on("call_answered", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!peerRef.current || !answer) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState("active");
      } catch (error) {
        console.error("[WebRTC] call_answered error:", error);
        closePeer();
        setCallState("idle");
      }
    });

    socket.on("call_ice_candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!peerRef.current || !candidate) return;
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("[WebRTC] addIceCandidate error:", error);
      }
    });

    socket.on("call_ended", () => {
      closePeer();
      setCallState("ended");
      setTimeout(() => setCallState("idle"), 2000);
    });

    socket.on("call_rejected", () => {
      closePeer();
      setCallState("idle");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setMessages([]);
      setTypingUser(null);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      closePeer();
    };
  }, [roomId, userId, role, enabled, closePeer]);

  const sendMessage = useCallback((text: string, senderName: string) => {
    if (!socketRef.current || !roomId || !text.trim()) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: senderName,
      senderRole: role,
      text: text.trim(),
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    };
    socketRef.current.emit("send_message", { roomId, message: msg });
  }, [roomId, role]);

  const sendTyping = useCallback((senderName: string) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit("typing", { roomId, sender: senderName });
  }, [roomId]);

  const sendTripStatus = useCallback((status: string, data?: any) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit("trip_status", { roomId, status, data });
  }, [roomId]);

  return {
    messages, isConnected, typingUser,
    sendMessage, sendTyping, sendTripStatus,
    // Voice call
    callState, incomingCallerName, pendingOfferRef,
    startCall, answerCall, endCall, rejectCall,
  };
}

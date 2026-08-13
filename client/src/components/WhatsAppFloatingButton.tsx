interface WhatsAppFloatingButtonProps {
  compact?: boolean;
}

export default function WhatsAppFloatingButton({ compact = false }: WhatsAppFloatingButtonProps) {
  const phone = "14076921013";
  const message = encodeURIComponent("Hola, me gustaría pedir información sobre el servicio de taxi.");
  const url = `https://wa.me/${phone}?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className={`fixed right-5 z-50 flex items-center gap-2 group ${compact ? "bottom-4" : "bottom-6"}`}
      style={{ filter: "drop-shadow(0 4px 16px rgba(37,211,102,0.45))" }}
    >
      {/* Tooltip */}
      <span className="hidden sm:block bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        ¿Necesitas ayuda? Escríbenos
      </span>

      {/* Button */}
      <div
        className={`${compact ? "w-11 h-11" : "w-14 h-14"} rounded-full flex items-center justify-center relative transition-transform duration-200 active:scale-95 hover:scale-105`}
        style={{ background: "#25D366" }}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: "#25D366" }} />
        {/* WhatsApp SVG icon */}
        <svg viewBox="0 0 32 32" width={compact ? "22" : "28"} height={compact ? "22" : "28"} fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.492.648 4.832 1.78 6.86L2 30l7.34-1.74A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.44 11.44 0 01-5.83-1.6l-.42-.25-4.35 1.03 1.06-4.24-.27-.44A11.46 11.46 0 014.5 16C4.5 9.596 9.596 4.5 16 4.5S27.5 9.596 27.5 16 22.404 27.5 16 27.5zm6.29-8.47c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17-.23.34-.9 1.11-1.1 1.34-.2.23-.4.26-.74.09-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.7-2.01-1.9-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.67-.57-.58-.78-.59h-.67c-.23 0-.6.09-.91.43-.31.34-1.19 1.16-1.19 2.83s1.22 3.28 1.39 3.51c.17.23 2.4 3.66 5.82 5.13.81.35 1.44.56 1.93.72.81.26 1.55.22 2.13.13.65-.1 2.02-.83 2.3-1.63.28-.8.28-1.49.2-1.63-.09-.14-.32-.23-.66-.4z"/>
        </svg>
      </div>
    </a>
  );
}


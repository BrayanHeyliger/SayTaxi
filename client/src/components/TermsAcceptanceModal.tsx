import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsAcceptanceModalProps {
  open: boolean;
  userType: "driver" | "client";
  /** Called when user accepts all terms. */
  onAccept: () => void;
}

/**
 * TermsAcceptanceModal — shown during driver and client onboarding.
 * Users must explicitly accept the ToS, Privacy Policy, and (for drivers)
 * the Independent Contractor Agreement before using the platform.
 */
export default function TermsAcceptanceModal({
  open,
  userType,
  onAccept,
}: TermsAcceptanceModalProps) {
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedContractor, setAcceptedContractor] = useState(false);

  const isDriver = userType === "driver";
  const allAccepted = acceptedTos && acceptedPrivacy && (!isDriver || acceptedContractor);

  const handleAccept = () => {
    if (!allAccepted) return;
    onAccept();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isDriver
              ? "Acuerdo de Suscriptor de Software — Conductor"
              : "Términos de Uso — Cliente"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-64 pr-4 text-sm text-slate-700 space-y-3">
          {/* Legal nature disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
            <p className="font-semibold mb-1">⚠️ Aviso Legal</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>SayTaxi es solo una herramienta de software / canal de
                comunicación.</strong> No presta servicios de transporte.
              </li>
              <li>
                <strong>SayTaxi NO es una agencia de taxis ni Transportation Network
                Company (TNC).</strong>
              </li>
              {isDriver && (
                <li>
                  <strong>Usted es un contratista totalmente independiente.</strong>{" "}
                  No es empleado ni afiliado de SayTaxi.
                </li>
              )}
              <li>
                <strong>El pago de la tarifa del viaje es directo entre cliente y
                conductor.</strong> SayTaxi no retiene ni procesa tarifas de viaje.
              </li>
              {isDriver && (
                <li>
                  <strong>Usted puede aceptar o rechazar libremente cualquier alerta
                  de reserva sin penalización.</strong>
                </li>
              )}
            </ul>
          </div>

          {isDriver && (
            <div className="space-y-2 mb-3">
              <p className="font-semibold text-slate-800">Como conductor/suscriptor usted confirma que:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                <li>Posee o mantendrá licencia válida de Vehicle for Hire según la ley de Florida y las ordenanzas locales aplicables (Ciudad de Orlando / Orange County).</li>
                <li>Mantiene seguro comercial de automóvil en los montos mínimos requeridos por la ley de Florida.</li>
                <li>Si opera en el aeropuerto MCO, posee el permiso de GOAA correspondiente.</li>
                <li>Define sus propias tarifas de transporte acordadas directamente con el cliente.</li>
                <li>Es responsable de todos sus impuestos federales, estatales y locales.</li>
              </ul>
            </div>
          )}
        </ScrollArea>

        <div className="space-y-3 mt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={acceptedTos}
              onCheckedChange={(v) => setAcceptedTos(!!v)}
              id="tos"
            />
            <span className="text-xs text-slate-700 leading-tight">
              He leído y acepto los{" "}
              <a
                href="https://github.com/BrayanHeyliger/SayTaxi/blob/main/docs/legal/TERMS_OF_SERVICE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Términos y Condiciones
              </a>{" "}
              de SayTaxi.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={acceptedPrivacy}
              onCheckedChange={(v) => setAcceptedPrivacy(!!v)}
              id="privacy"
            />
            <span className="text-xs text-slate-700 leading-tight">
              He leído y acepto la{" "}
              <a
                href="https://github.com/BrayanHeyliger/SayTaxi/blob/main/docs/legal/PRIVACY_POLICY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Política de Privacidad
              </a>
              .
            </span>
          </label>

          {isDriver && (
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptedContractor}
                onCheckedChange={(v) => setAcceptedContractor(!!v)}
                id="contractor"
              />
              <span className="text-xs text-slate-700 leading-tight">
                He leído y acepto el{" "}
                <a
                  href="https://github.com/BrayanHeyliger/SayTaxi/blob/main/docs/legal/DRIVER_AGREEMENT.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Acuerdo de Contratista Independiente
                </a>{" "}
                y entiendo que soy un contratista independiente, no un empleado de SayTaxi.
              </span>
            </label>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            onClick={handleAccept}
            disabled={!allAccepted}
            className="w-full"
          >
            Acepto — Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

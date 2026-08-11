/**
 * SaaSDisclaimer — Legal disclaimer banner required on all user-facing pages.
 *
 * SayTaxi operates exclusively as a software/communication tool (SaaS).
 * This banner makes the platform's legal nature clear to all users.
 */
export default function SaaSDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800 flex items-start gap-2">
        <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
        <span>
          <strong>SayTaxi</strong> es solo una herramienta de software / canal de
          comunicación. NO presta servicios de transporte. Los conductores son
          contratistas independientes. El pago de la tarifa es directo entre cliente
          y conductor.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
      <p className="font-semibold text-amber-900">⚠️ Aviso Legal / Legal Notice</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>
          <strong>SayTaxi es solo una herramienta de software / canal de
          comunicación.</strong> It is a Software-as-a-Service (SaaS) booking engine.
        </li>
        <li>
          <strong>SayTaxi NO presta servicios de transporte</strong> y no opera como
          agencia de taxis ni Transportation Network Company (TNC).
        </li>
        <li>
          <strong>Los conductores son contratistas totalmente independientes.</strong>{" "}
          They are not employees or affiliates of SayTaxi.
        </li>
        <li>
          <strong>El pago de la tarifa es directo entre cliente y conductor.</strong>{" "}
          SayTaxi does not collect or process ride fares.
        </li>
      </ul>
    </div>
  );
}

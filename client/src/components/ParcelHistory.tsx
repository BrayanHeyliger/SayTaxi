import { useState } from "react";
import { Download, MapPin, Calendar, DollarSign, Package, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { normalizeParcelOrder } from "@/lib/parcelUtils";

export function ParcelHistory() {
  const [filter, setFilter] = useState<"all" | "pending" | "delivered" | "cancelled">("all");

  const { data: orders, isLoading } = trpc.parcels.historyByClient.useQuery();

  const filteredOrders = (orders as any[])?.map((order: any) => normalizeParcelOrder(order)).filter((order: any) => {
    if (filter === "all") return true;
    return order.status === filter;
  }) || [];

  const downloadReceipt = (order: any): void => {
    const receiptText = `
RECIBO DE ENTREGA DE PAQUETE
================================
Codigo de Rastreo: ${order.trackingCode}
Fecha: ${new Date(order.createdAt).toLocaleDateString("es-ES")}
Hora: ${new Date(order.createdAt).toLocaleTimeString("es-ES")}

DETALLES DEL ENVIO
Origen: ${order.pickupAddress}
Destino: ${order.deliveryAddress}
Tipo de Paquete: ${order.parcelType}

ESTADO: ${order.status.toUpperCase()}
Conductor: ${order.driverName || "Pendiente de asignación"}
Placa: ${order.driverPlate || "N/A"}

PRECIO
Base: $${order.basePrice.toFixed(2)}
Distancia (${order.distance}km): $${(order.distance * order.pricePerKm).toFixed(2)}
Extras: $${order.extraCharges.toFixed(2)}
TOTAL: $${order.totalPrice.toFixed(2)}

Metodo de Pago: ${order.paymentMethod}
${order.status === "delivered" ? `Entregado: ${new Date(order.deliveredAt).toLocaleDateString("es-ES")}` : ""}

Gracias por usar nuestro servicio!
    `.trim();

    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibo-${order.trackingCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-orange-100 text-orange-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: "Pendiente",
      accepted: "Aceptado",
      in_transit: "En Transito",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-green-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["all", "pending", "delivered", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f
                ? "bg-green-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendientes" : f === "delivered" ? "Entregados" : "Cancelados"}
          </button>
        ))}
      </div>

      {/* Lista de órdenes */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No hay paquetes en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-green-600">{order.trackingCode}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    <Calendar size={12} className="inline mr-1" />
                    {new Date(order.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-slate-900">${order.totalPrice.toFixed(2)}</p>
                  <button
                    onClick={() => downloadReceipt(order)}
                    className="mt-1 text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 ml-auto"
                  >
                    <Download size={12} />
                    Recibo
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Desde</p>
                    <p className="text-slate-700">{(order as any).pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Hacia</p>
                    <p className="text-slate-700">{(order as any).deliveryAddress}</p>
                  </div>
                </div>
              </div>

              {(order as any).driverName && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                  <p className="text-slate-600">
                    Conductor: <span className="font-medium text-slate-900">{(order as any).driverName}</span>
                  </p>
                  <p className="text-slate-600">
                    Placa: <span className="font-mono text-slate-900">{(order as any).driverPlate}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

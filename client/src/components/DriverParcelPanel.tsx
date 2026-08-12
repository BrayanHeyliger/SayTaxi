import { useState } from "react";
import { Loader2, MapPin, Phone, Clock, DollarSign, CheckCircle, X, Navigation } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { normalizeParcelOrder } from "@/lib/parcelUtils";
import { toast } from "sonner";

export function DriverParcelPanel() {
  const [activeTab, setActiveTab] = useState<"available" | "active" | "completed">("available");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: availableOrders, isLoading: loadingAvailable, refetch: refetchAvailable } = 
    trpc.parcels.listAvailable.useQuery();
  
  const { data: activeOrders, isLoading: loadingActive, refetch: refetchActive } = 
    trpc.parcels.listByDriver.useQuery();

  const normalizedAvailableOrders = ((availableOrders as any[]) || []).map((order) => normalizeParcelOrder(order));
  const normalizedActiveOrders = ((activeOrders as any[]) || []).map((order) => normalizeParcelOrder(order));

  const acceptOrderMutation = trpc.parcels.acceptOrder.useMutation({
    onSuccess: () => {
      toast.success("Paquete aceptado!");
      refetchAvailable();
      refetchActive();
    },
    onError: () => toast.error("Error al aceptar paquete"),
  });

  const updateStatusMutation = trpc.parcels.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado!");
      refetchActive();
      setSelectedOrder(null);
    },
    onError: () => toast.error("Error al actualizar estado"),
  });

  const handleAccept = (orderId: string) => {
    acceptOrderMutation.mutate({ id: orderId });
  };

  const handleUpdateStatus = (orderId: string, newStatus: "in_transit" | "delivered" | "cancelled") => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
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
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {(["available", "active", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${
              activeTab === tab
                ? "border-green-500 text-green-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "available" ? "Disponibles" : tab === "active" ? "Activos" : "Completados"}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      {activeTab === "available" && (
        <div className="space-y-3">
          {loadingAvailable ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-green-500" size={32} />
            </div>
          ) : normalizedAvailableOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No hay paquetes disponibles</p>
            </div>
          ) : (
            normalizedAvailableOrders.map((order) => (
              <div key={order.id} className="border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-bold text-green-600">{order.trackingCode}</p>
                    <p className="text-xs text-slate-500">${order.totalPrice.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => handleAccept(order.id)}
                    disabled={acceptOrderMutation.isPending}
                    className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    {acceptOrderMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    Aceptar
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-600">{order.pickupAddress}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-600">{order.deliveryAddress}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "active" && (
        <div className="space-y-3">
          {loadingActive ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-green-500" size={32} />
            </div>
          ) : normalizedActiveOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No hay entregas activas</p>
            </div>
          ) : (
            normalizedActiveOrders.map((order) => (
              <div key={order.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-bold text-green-600">{order.trackingCode}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">${order.totalPrice.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Detalles
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-600">{order.pickupAddress}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-600">{order.deliveryAddress}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "completed" && (
        <div className="text-center py-8">
          <p className="text-slate-500">Historial de entregas completadas</p>
        </div>
      )}

      {/* Modal de detalles */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Detalles del Paquete</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Código de Rastreo</p>
                <p className="font-mono font-bold text-green-600">{selectedOrder.trackingCode}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Origen</p>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{selectedOrder.pickupAddress}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Destino</p>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{selectedOrder.deliveryAddress}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Distancia</p>
                  <p className="text-sm font-bold text-slate-900">{selectedOrder.distance}km</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Tarifa</p>
                  <p className="text-sm font-bold text-green-600">${selectedOrder.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2">
              {selectedOrder.status === "accepted" && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "in_transit" as const)}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm"
                >
                  {updateStatusMutation.isPending ? "Actualizando..." : "En Transito"}
                </button>
              )}
              {selectedOrder.status === "in_transit" && (
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, "delivered" as const)}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  {updateStatusMutation.isPending ? "Actualizando..." : "Marcar Entregado"}
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

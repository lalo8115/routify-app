"use client";

import { useState, useEffect } from "react";
import { databaseSource, supabase } from "@/lib/database";
import { getLocalSessionFromDocument } from "@/lib/local-session";
import BottomNav from "@/components/BottomNav";

type Categoria = {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  unidad_medida: string;
  precio_base: number;
  activo: boolean;
};

export default function ConfiguracionSaaS() {
  const isLocalMode = databaseSource === 'local';
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificandoAdmin, setVerificandoAdmin] = useState(true);
  const [tab, setTab] = useState<"categorias" | "productos">("categorias");

  // Estados Categorías
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCatNombre, setNuevaCatNombre] = useState("");
  const [nuevaCatDesc, setNuevaCatDesc] = useState("");

  // Estados Productos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nuevoProdNombre, setNuevoProdNombre] = useState("");
  const [nuevoProdDesc, setNuevoProdDesc] = useState("");
  const [nuevoProdUnidad, setNuevoProdUnidad] = useState("pieza");
  const [nuevoProdPrecio, setNuevoProdPrecio] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarPermisosYDatos();
  }, []);

  const verificarPermisosYDatos = async () => {
    setVerificandoAdmin(true);
    try {
      if (isLocalMode) {
        const localSession = getLocalSessionFromDocument();

        if (!localSession || localSession.rol !== 'admin') {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(true);
        await cargarDatos();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setVerificandoAdmin(false);
        return;
      }
      
      const { data: usuarioNegocio, error } = await supabase
        .from('usuarios_negocio')
        .select('rol')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();
        
      if (error) {
        console.error("Error consultando rol:", error);
      }
      
      // Validamos explícitamente el rol administrador
      if (usuarioNegocio && (usuarioNegocio as any).rol === 'admin') {
        setIsAdmin(true);
        await cargarDatos();
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error al verificar permisos:", error);
      setIsAdmin(false);
    } finally {
      setVerificandoAdmin(false);
    }
  };

  const cargarDatos = async () => {
    setLoading(true);
    await Promise.all([cargarCategorias(), cargarProductos()]);
    setLoading(false);
  };

  const cargarCategorias = async () => {
    const { data } = await supabase
      .from("categorias_cliente")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCategorias(data as any);
  };

  const cargarProductos = async () => {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProductos(data as any);
  };

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCatNombre.trim()) return;

    const { error } = await supabase.from("categorias_cliente").insert({
      nombre: nuevaCatNombre,
      descripcion: nuevaCatDesc,
    });

    if (error) {
      alert("Error al crear categoría: " + error.message);
    } else {
      setNuevaCatNombre("");
      setNuevaCatDesc("");
      cargarCategorias();
    }
  };

  const crearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProdNombre.trim()) return;

    const { error } = await supabase.from("productos").insert({
      nombre: nuevoProdNombre,
      descripcion: nuevoProdDesc,
      unidad_medida: nuevoProdUnidad,
      precio_base: Number(nuevoProdPrecio) || 0,
    });

    if (error) {
      alert("Error al crear producto: " + error.message);
    } else {
      setNuevoProdNombre("");
      setNuevoProdDesc("");
      setNuevoProdPrecio("");
      setNuevoProdUnidad("pieza");
      cargarProductos();
    }
  };

  const toggleCategoria = async (id: string, actual: boolean) => {
    await supabase.from("categorias_cliente").update({ activo: !actual }).eq("id", id);
    cargarCategorias();
  };

  const toggleProducto = async (id: string, actual: boolean) => {
    await supabase.from("productos").update({ activo: !actual }).eq("id", id);
    cargarProductos();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-10">
        <h1 className="text-xl font-bold">Configuración Catálogos</h1>
        <p className="text-sm opacity-90">Personaliza tu CRM (SaaS)</p>
      </div>

      {verificandoAdmin ? (
        <div className="text-center py-10">Verificando permisos...</div>
      ) : !isAdmin ? (
        <div className="max-w-md mx-auto p-4 py-10 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Solo los administradores del negocio pueden ver y editar la configuración del catálogo.</p>
        </div>
      ) : (
        <div className="max-w-md mx-auto p-4">
        {/* Pestañas */}
        <div className="flex bg-gray-200 rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab("categorias")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "categorias" ? "bg-white shadow text-indigo-700" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tipos de Cliente
          </button>
          <button
            onClick={() => setTab("productos")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "productos" ? "bg-white shadow text-indigo-700" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Catálogo Productos
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10">Cargando configuración...</div>
        ) : (
          <>
            {/* VISTA CATEGORÍAS */}
            {tab === "categorias" && (
              <div className="space-y-6">
                <form onSubmit={crearCategoria} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="font-semibold text-gray-800 mb-4">Nueva Categoría</h2>
                  <div className="space-y-3">
                    <input
                      className="w-full text-black p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej. Taller Mecánico, Lavadero..."
                      value={nuevaCatNombre}
                      onChange={(e) => setNuevaCatNombre(e.target.value)}
                      required
                    />
                    <input
                      className="w-full text-black p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Descripción (opcional)"
                      value={nuevaCatDesc}
                      onChange={(e) => setNuevaCatDesc(e.target.value)}
                    />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium">
                      Añadir Categoría
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Categorías Registradas</h3>
                  {categorias.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay categorías configuradas.</p>
                  ) : (
                    categorias.map((cat) => (
                      <div key={cat.id} className={`p-4 rounded-xl border flex justify-between items-center ${cat.activo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                        <div>
                          <p className="font-medium text-gray-800">{cat.nombre}</p>
                          {cat.descripcion && <p className="text-xs text-gray-500">{cat.descripcion}</p>}
                        </div>
                        <button
                          onClick={() => toggleCategoria(cat.id, cat.activo)}
                          className={`px-3 py-1 text-xs rounded-full ${cat.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                        >
                          {cat.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VISTA PRODUCTOS */}
            {tab === "productos" && (
              <div className="space-y-6">
                <form onSubmit={crearProducto} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="font-semibold text-gray-800 mb-4">Nuevo Producto</h2>
                  <div className="space-y-3">
                    <input
                      className="w-full text-black p-2 border border-gray-300 rounded-lg outline-none"
                      placeholder="Nombre (Ej. Trapo Blanco 1a)"
                      value={nuevoProdNombre}
                      onChange={(e) => setNuevoProdNombre(e.target.value)}
                      required
                    />
                    <div className="flex space-x-2">
                      <input
                        className="w-1/2 text-black p-2 border border-gray-300 rounded-lg outline-none"
                        placeholder="Precio Base Ej: 45"
                        type="number"
                        step="0.01"
                        value={nuevoProdPrecio}
                        onChange={(e) => setNuevoProdPrecio(e.target.value)}
                      />
                      <select
                        className="w-1/2 p-2 text-black border border-gray-300 rounded-lg outline-none bg-white"
                        value={nuevoProdUnidad}
                        onChange={(e) => setNuevoProdUnidad(e.target.value)}
                      >
                        <option value="kg">Kilos (kg)</option>
                        <option value="pieza">Pieza (pz)</option>
                        <option value="paquete">Paquete (paq)</option>
                        <option value="lt">Litros (lt)</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium">
                      Añadir Producto
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Catálogo</h3>
                  {productos.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay productos configurados.</p>
                  ) : (
                    productos.map((prod) => (
                      <div key={prod.id} className={`p-4 rounded-xl border flex justify-between items-center ${prod.activo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
                        <div>
                          <p className="font-medium text-gray-800">{prod.nombre}</p>
                          <p className="text-xs text-gray-500">${prod.precio_base} / {prod.unidad_medida}</p>
                        </div>
                        <button
                          onClick={() => toggleProducto(prod.id, prod.activo)}
                          className={`px-3 py-1 text-xs rounded-full ${prod.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                        >
                          {prod.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}

      <BottomNav />
    </div>
  );
}

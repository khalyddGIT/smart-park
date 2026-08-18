import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'smart_park_unified_establishments_v2';

export const INITIAL_ESTABLISHMENTS = [
  {
    id: 'EST-01',
    name: 'Smart Park Plaza Mayor - Planta Baja',
    address: 'Portal Unión 42, Centro Histórico',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Superficie',
    rate: 5.00,
    status: 'Operativo',
    owner: 'Inversiones Plaza Mayor Huamanga',
    commission: '10%',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
      { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
      { id: 6, type: 'crosswalk', x: 500, y: 300, w: 80, h: 100, rot: 0 },
      { id: 7, type: 'gate', x: 40, y: 300, w: 30, h: 100, rot: 0, label: 'ACCESO GARITA ANPR' },
      
      // Fila Norte
      { id: 10, type: 'slot', code: 'A-01', slotType: 'pmr', x: 80, y: 70, w: 90, h: 140, rot: 0, status: 'free' },
      { id: 11, type: 'slot', code: 'A-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 12, type: 'slot', code: 'A-03', slotType: 'auto', shaded: true, x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'ABC-123', color: '#ef4444' },
      { id: 13, type: 'slot', code: 'A-04', slotType: 'auto', x: 350, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 14, type: 'slot', code: 'A-05', slotType: 'auto', x: 435, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 15, type: 'slot', code: 'A-06', slotType: 'auto', x: 600, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'XYZ-789', color: '#3b82f6' },
      { id: 16, type: 'slot', code: 'A-07', slotType: 'vip', x: 685, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 17, type: 'slot', code: 'A-08', slotType: 'moto', x: 770, y: 70, w: 50, h: 140, rot: 0, status: 'free' },
      { id: 18, type: 'slot', code: 'A-09', slotType: 'moto', x: 830, y: 70, w: 50, h: 140, rot: 0, status: 'free' },

      // Fila Sur
      { id: 20, type: 'slot', code: 'B-01', slotType: 'auto', x: 80, y: 490, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'AYC-501', color: '#10b981' },
      { id: 21, type: 'slot', code: 'B-02', slotType: 'auto', x: 165, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 22, type: 'slot', code: 'B-03', slotType: 'auto', x: 250, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 23, type: 'slot', code: 'B-04', slotType: 'auto', x: 335, y: 490, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'W1P-404', color: '#6366f1' },
      { id: 24, type: 'slot', code: 'B-05', slotType: 'auto', x: 600, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 25, type: 'slot', code: 'B-06', slotType: 'auto', x: 685, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 26, type: 'slot', code: 'B-07', slotType: 'auto', x: 770, y: 490, w: 75, h: 140, rot: 0, status: 'free' }
    ]
  },
  {
    id: 'EST-02',
    name: 'Smart Park Plaza Mayor - Sótano 1',
    address: 'Portal Unión 42, Centro Histórico',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel -1 - Subterráneo',
    rate: 4.50,
    status: 'Operativo',
    owner: 'Inversiones Plaza Mayor Huamanga',
    commission: '10%',
    image: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
      { id: 5, type: 'road', x: 52, y: 250, w: 996, h: 200, rot: 0 },
      { id: 6, type: 'gate', x: 40, y: 300, w: 30, h: 100, rot: 0, label: 'ACCESO SÓTANO' },
      { id: 10, type: 'slot', code: 'S1-01', slotType: 'pmr', x: 80, y: 70, w: 90, h: 140, rot: 0, status: 'free' },
      { id: 11, type: 'slot', code: 'S1-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 12, type: 'slot', code: 'S1-03', slotType: 'auto', shaded: true, x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 13, type: 'slot', code: 'S1-04', slotType: 'auto', x: 350, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'P3X-998' },
      { id: 14, type: 'slot', code: 'S1-05', slotType: 'auto', x: 435, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 15, type: 'slot', code: 'S1-06', slotType: 'vip', x: 600, y: 70, w: 80, h: 140, rot: 0, status: 'free' },
      { id: 20, type: 'slot', code: 'S1-07', slotType: 'auto', x: 80, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 21, type: 'slot', code: 'S1-08', slotType: 'auto', x: 165, y: 490, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 22, type: 'slot', code: 'S1-09', slotType: 'moto', x: 250, y: 490, w: 50, h: 140, rot: 0, status: 'free' }
    ]
  },
  {
    id: 'EST-03',
    name: 'Smart Park Jr. 28 de Julio (Zona Comercial)',
    address: 'Jr. 28 de Julio 350',
    city: 'Ayacucho - Huamanga',
    level: 'Zona Abierta',
    rate: 4.00,
    status: 'Operativo',
    owner: 'Comercial 28 de Julio S.A.C.',
    commission: '12%',
    image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'garden', x: 860, y: 350, w: 180, h: 290, rot: 0, label: 'ÁREA VERDE' },
      { id: 5, type: 'road', x: 60, y: 280, w: 800, h: 120, rot: 0, label: 'CARRIL VIAL' },
      { id: 6, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'GARITA LPR' },
      { id: 10, type: 'slot', code: 'C-01', slotType: 'pmr', x: 90, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
      { id: 11, type: 'slot', code: 'C-02', slotType: 'auto', shaded: true, x: 180, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
      { id: 12, type: 'slot', code: 'C-03', slotType: 'auto', x: 270, y: 90, w: 75, h: 135, rot: 30, status: 'occupied', plate: 'ABC-777' },
      { id: 13, type: 'slot', code: 'C-04', slotType: 'auto', x: 360, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
      { id: 14, type: 'slot', code: 'C-05', slotType: 'vip', x: 450, y: 90, w: 75, h: 135, rot: 30, status: 'free' },
      { id: 20, type: 'slot', code: 'C-06', slotType: 'auto', x: 90, y: 460, w: 75, h: 135, rot: -30, status: 'free' },
      { id: 21, type: 'slot', code: 'C-07', slotType: 'auto', x: 180, y: 460, w: 75, h: 135, rot: -30, status: 'free' },
      { id: 22, type: 'slot', code: 'C-08', slotType: 'moto', x: 270, y: 460, w: 50, h: 135, rot: -30, status: 'free' }
    ]
  },
  {
    id: 'EST-04',
    name: 'Smart Park Av. Independencia (Gran Sede)',
    address: 'Av. Independencia 520',
    city: 'Ayacucho - Huamanga',
    level: 'Nivel 1 - Techado',
    rate: 6.00,
    status: 'Operativo',
    owner: 'Inversiones Independencia Huamanga',
    commission: '15%',
    image: 'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?w=800',
    elements: [
      { id: 1, type: 'wall', x: 40, y: 40, w: 1020, h: 12, rot: 0 },
      { id: 2, type: 'wall', x: 40, y: 40, w: 12, h: 620, rot: 0 },
      { id: 3, type: 'wall', x: 40, y: 648, w: 1020, h: 12, rot: 0 },
      { id: 4, type: 'wall', x: 1048, y: 40, w: 12, h: 620, rot: 0 },
      { id: 5, type: 'road', x: 60, y: 280, w: 980, h: 120, rot: 0, label: 'AVENIDA CENTRAL DE DISTRIBUCIÓN' },
      { id: 6, type: 'gate', x: 40, y: 280, w: 30, h: 120, rot: 0, label: 'CONTROL ANPR' },
      { id: 10, type: 'slot', code: 'IND-01', slotType: 'pmr', x: 80, y: 70, w: 90, h: 140, rot: 0, status: 'free' },
      { id: 11, type: 'slot', code: 'IND-02', slotType: 'auto', shaded: true, x: 180, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 12, type: 'slot', code: 'IND-03', slotType: 'auto', shaded: true, x: 265, y: 70, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 13, type: 'slot', code: 'IND-04', slotType: 'vip', x: 350, y: 70, w: 80, h: 140, rot: 0, status: 'free' },
      { id: 14, type: 'slot', code: 'IND-05', slotType: 'auto', x: 440, y: 70, w: 75, h: 140, rot: 0, status: 'occupied', plate: 'IND-101' },
      { id: 20, type: 'slot', code: 'IND-06', slotType: 'auto', x: 80, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 21, type: 'slot', code: 'IND-07', slotType: 'auto', shaded: true, x: 165, y: 470, w: 75, h: 140, rot: 0, status: 'free' },
      { id: 22, type: 'slot', code: 'IND-08', slotType: 'moto', x: 250, y: 470, w: 50, h: 140, rot: 0, status: 'free' }
    ]
  }
];

const EstablishmentContext = createContext();

export const EstablishmentProvider = ({ children }) => {
  const [establishments, setEstablishments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading establishments from storage:', e);
    }
    return INITIAL_ESTABLISHMENTS;
  });

  // Guardar en localStorage siempre que cambie
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(establishments));
    } catch (e) {
      console.error('Error saving establishments to storage:', e);
    }
  }, [establishments]);

  // Agregar nuevo establecimiento
  const addEstablishment = (newEst) => {
    setEstablishments(prev => {
      const updated = [newEst, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Actualizar datos de un establecimiento
  const updateEstablishment = (id, updatedFields) => {
    setEstablishments(prev => {
      const updated = prev.map(est => est.id === id ? { ...est, ...updatedFields } : est);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Actualizar plano CAD de un establecimiento
  const updateEstablishmentPlan = (id, newElements) => {
    setEstablishments(prev => {
      const updated = prev.map(est => {
        if (est.id === id) {
          const slotsCount = newElements.filter(e => e.type === 'slot').length;
          const pmrCount = newElements.filter(e => e.type === 'slot' && e.slotType === 'pmr').length;
          return {
            ...est,
            elements: newElements,
            totalSlots: slotsCount,
            pmrSlots: pmrCount
          };
        }
        return est;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Eliminar establecimiento
  const deleteEstablishment = (id) => {
    setEstablishments(prev => {
      const updated = prev.filter(est => est.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Ocupar o reservar un cajón específico en un establecimiento
  const occupySlot = (establishmentId, slotCode, plate) => {
    setEstablishments(prev => {
      const updated = prev.map(est => {
        if (est.id === establishmentId || est.name === establishmentId) {
          const updatedElements = (est.elements || []).map(el => {
            if (el.type === 'slot' && el.code === slotCode) {
              return {
                ...el,
                status: 'occupied',
                plate,
                color: '#10b981'
              };
            }
            return el;
          });
          return { ...est, elements: updatedElements };
        }
        return est;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Restablecer valores por defecto
  const resetToDefaults = () => {
    setEstablishments(INITIAL_ESTABLISHMENTS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ESTABLISHMENTS));
    } catch (e) {}
  };

  return (
    <EstablishmentContext.Provider value={{
      establishments,
      setEstablishments,
      addEstablishment,
      updateEstablishment,
      updateEstablishmentPlan,
      deleteEstablishment,
      occupySlot,
      resetToDefaults
    }}>
      {children}
    </EstablishmentContext.Provider>
  );
};

export const useEstablishments = () => {
  const context = useContext(EstablishmentContext);
  if (!context) {
    throw new Error('useEstablishments must be used within an EstablishmentProvider');
  }
  return context;
};

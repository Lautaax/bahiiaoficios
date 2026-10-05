import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  FileText, 
  MessageCircle, 
  Printer, 
  Save, 
  Plus, 
  Trash2, 
  RotateCcw, 
  FolderOpen, 
  Info, 
  PieChart, 
  FileSpreadsheet, 
  Package, 
  Wrench,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Eye,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ContratoPresupuestoModal } from './ContratoPresupuestoModal';
import { 
  savePresupuesto, 
  getPresupuestos, 
  SavedPresupuestoItem 
} from '../utils/presupuestosStorage';
import { useAuth } from '../context/AuthContext';

export interface ConstructionItem {
  id: string;
  categoria: string;
  categoriaNum: number;
  tarea: string;
  unidad: 'U' | 'M²' | 'M³' | 'ML' | 'GL';
  costoMatUnit: number;
  costoMoUnit: number;
}

export const CONSTRUCTION_ITEMS: ConstructionItem[] = [
  // 1 - Trabajos Preliminares
  { id: 'prelim-bano-quimico', categoria: '1 - Trabajos Preliminares', categoriaNum: 1, tarea: 'Baño químico', unidad: 'U', costoMatUnit: 92767, costoMoUnit: 0 },
  { id: 'prelim-cartel-obra', categoria: '1 - Trabajos Preliminares', categoriaNum: 1, tarea: 'Cartel de obra', unidad: 'M²', costoMatUnit: 0, costoMoUnit: 576050 },
  { id: 'prelim-contenedor-grande', categoria: '1 - Trabajos Preliminares', categoriaNum: 1, tarea: 'Contenedor grande', unidad: 'U', costoMatUnit: 105605, costoMoUnit: 0 },
  { id: 'prelim-empalizada-10m', categoria: '1 - Trabajos Preliminares', categoriaNum: 1, tarea: 'Empalizada 10ml x 2,00m altura', unidad: 'U', costoMatUnit: 1456310, costoMoUnit: 913805 },
  { id: 'prelim-obrador', categoria: '1 - Trabajos Preliminares', categoriaNum: 1, tarea: 'Obrador (1,80 x 2,40 mts)', unidad: 'U', costoMatUnit: 149090, costoMoUnit: 0 },
  { id: 'prelim-pilar-luz', categoria: '1 - Trabajos Preliminares', categoriaNum: 1, tarea: 'Pilar de luz tradicional', unidad: 'U', costoMatUnit: 591110, costoMoUnit: 411465 },
  { id: 'prelim-replanteo', categoria: '1 - Trabajos Preliminares', categoriaNum: 1, tarea: 'Replanteo', unidad: 'M²', costoMatUnit: 0, costoMoUnit: 3840 },

  // 3 - Movimiento de suelos
  { id: 'suelo-excavacion-bases', categoria: '3 - Movimiento de suelos', categoriaNum: 3, tarea: 'Excavación de bases', unidad: 'M³', costoMatUnit: 0, costoMoUnit: 57605 },
  { id: 'suelo-excavacion-vigas', categoria: '3 - Movimiento de suelos', categoriaNum: 3, tarea: 'Excavación de vigas de fundición', unidad: 'M³', costoMatUnit: 0, costoMoUnit: 57605 },
  { id: 'suelo-relleno-tosca', categoria: '3 - Movimiento de suelos', categoriaNum: 3, tarea: 'Relleno de suelos con tosca (para nivelar)', unidad: 'M³', costoMatUnit: 29626, costoMoUnit: 24688 },

  // 4 - Fundaciones
  { id: 'fund-base-1', categoria: '4 - Fundaciones', categoriaNum: 4, tarea: 'Base 1 de H°A° 0.60x0.60 (armado y llenado)', unidad: 'U', costoMatUnit: 71101, costoMoUnit: 68577 },
  { id: 'fund-base-2', categoria: '4 - Fundaciones', categoriaNum: 4, tarea: 'Base 2 de H°A° 0.60x1.00 (armado y llenado)', unidad: 'U', costoMatUnit: 111636, costoMoUnit: 90522 },
  { id: 'fund-pilotin', categoria: '4 - Fundaciones', categoriaNum: 4, tarea: 'Pilotín (diam. 20cm)', unidad: 'ML', costoMatUnit: 27766, costoMoUnit: 41146 },
  { id: 'fund-viga-20x25', categoria: '4 - Fundaciones', categoriaNum: 4, tarea: 'Viga de fundación 20x25 (armado y llenado)', unidad: 'ML', costoMatUnit: 24686, costoMoUnit: 32917 },
  { id: 'fund-viga-25x25', categoria: '4 - Fundaciones', categoriaNum: 4, tarea: 'Viga de fundación 25x25 (armado y llenado)', unidad: 'ML', costoMatUnit: 27715, costoMoUnit: 41147 },
  { id: 'fund-viga-30x30', categoria: '4 - Fundaciones', categoriaNum: 4, tarea: 'Viga de fundación 30x30 (armado y llenado)', unidad: 'ML', costoMatUnit: 34910, costoMoUnit: 47317 },

  // 5 - Mampostería de cimientos
  { id: 'mamp-cim-15', categoria: '5 - Mampostería de cimientos', categoriaNum: 5, tarea: 'Mampostería de 15', unidad: 'M²', costoMatUnit: 25636, costoMoUnit: 21606 },
  { id: 'mamp-cim-20', categoria: '5 - Mampostería de cimientos', categoriaNum: 5, tarea: 'Mampostería de 20', unidad: 'M²', costoMatUnit: 39726, costoMoUnit: 26592 },
  { id: 'mamp-cim-30', categoria: '5 - Mampostería de cimientos', categoriaNum: 5, tarea: 'Mampostería de 30', unidad: 'M²', costoMatUnit: 52859, costoMoUnit: 35733 },

  // 6 - Capas aisladoras
  { id: 'capa-aisl-horiz', categoria: '6 - Capas aisladoras', categoriaNum: 6, tarea: 'Horizontal (Espesor 2cm)', unidad: 'M²', costoMatUnit: 10097, costoMoUnit: 15813 },
  { id: 'capa-aisl-vert', categoria: '6 - Capas aisladoras', categoriaNum: 6, tarea: 'Vertical azotado (Espesor 0.5cm)', unidad: 'M²', costoMatUnit: 4896, costoMoUnit: 14119 },

  // 7 - Mampostería de elevación con cemento de albañilería
  { id: 'mamp-elev-comun-30', categoria: '7 - Mampostería de elevación con cemento de albañilería', categoriaNum: 7, tarea: 'Ladrillo común de 30', unidad: 'M²', costoMatUnit: 47263, costoMoUnit: 35733 },
  { id: 'mamp-elev-hueco-08', categoria: '7 - Mampostería de elevación con cemento de albañilería', categoriaNum: 7, tarea: 'Ladrillos huecos 08x18x33', unidad: 'M²', costoMatUnit: 13925, costoMoUnit: 16343 },
  { id: 'mamp-elev-hueco-12', categoria: '7 - Mampostería de elevación con cemento de albañilería', categoriaNum: 7, tarea: 'Ladrillos huecos 12x18x33', unidad: 'M²', costoMatUnit: 18612, costoMoUnit: 19944 },
  { id: 'mamp-elev-hueco-18', categoria: '7 - Mampostería de elevación con cemento de albañilería', categoriaNum: 7, tarea: 'Ladrillos huecos 18x18x33', unidad: 'M²', costoMatUnit: 29293, costoMoUnit: 23545 },

  // 8 - Estructuras de hormigón armado
  { id: 'ha-columna-20x20', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Columna HºAº 20x20 (Hierro 10mm)', unidad: 'ML', costoMatUnit: 22013, costoMoUnit: 26570 },
  { id: 'ha-dintel-1m', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Dintel Hasta 1mt de Luz', unidad: 'ML', costoMatUnit: 4253, costoMoUnit: 16889 },
  { id: 'ha-dintel-2m', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Dintel de 1 a 2mts de Luz', unidad: 'ML', costoMatUnit: 5557, costoMoUnit: 16889 },
  { id: 'ha-encadenado-15x15', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Encadenado H°A° 15x15', unidad: 'ML', costoMatUnit: 14464, costoMoUnit: 21816 },
  { id: 'ha-encadenado-15x20', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Encadenado H°A° 15x20', unidad: 'ML', costoMatUnit: 16373, costoMoUnit: 23494 },
  { id: 'ha-escalera', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Escalera de H°A° (ancho 0.90 mts)', unidad: 'U', costoMatUnit: 311493, costoMoUnit: 1370473 },
  { id: 'ha-losa-viguetas', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Losa de viguetas con ladrillo de tergopol', unidad: 'M²', costoMatUnit: 70909, costoMoUnit: 61531 },
  { id: 'ha-viga-5m', categoria: '8 - Estructuras de hormigón armado', categoriaNum: 8, tarea: 'Viga H°A° por 5,00 mts. (12x50cm)', unidad: 'U', costoMatUnit: 207956, costoMoUnit: 419532 },

  // 9 - Revoques
  { id: 'rev-alisado-masilla', categoria: '9 - Revoques', categoriaNum: 9, tarea: 'Alisado de muros (interior) con masilla', unidad: 'M²', costoMatUnit: 5070, costoMoUnit: 11634 },
  { id: 'rev-azotado-hidrofugo', categoria: '9 - Revoques', categoriaNum: 9, tarea: 'Azotado hidrófugo bajo revoque', unidad: 'M²', costoMatUnit: 2619, costoMoUnit: 12742 },
  { id: 'rev-grueso-fratasado', categoria: '9 - Revoques', categoriaNum: 9, tarea: 'Grueso fratasado exterior/interior', unidad: 'M²', costoMatUnit: 3436, costoMoUnit: 26935 },
  { id: 'rev-grueso-regleado', categoria: '9 - Revoques', categoriaNum: 9, tarea: 'Grueso regleado interior', unidad: 'M²', costoMatUnit: 3436, costoMoUnit: 23546 },

  // 10 - Contrapisos
  { id: 'contra-cascotes', categoria: '10 - Contrapisos', categoriaNum: 10, tarea: 'De cascotes s/ terreno natural. Esp: 10cm.', unidad: 'M²', costoMatUnit: 10223, costoMoUnit: 19766 },
  { id: 'contra-hormigon', categoria: '10 - Contrapisos', categoriaNum: 10, tarea: 'De hormigón s/ losa. (esp: 7cm.)', unidad: 'M²', costoMatUnit: 15331, costoMoUnit: 16943 },

  // 12 - Cubiertas
  { id: 'cub-cumbrera', categoria: '12 - Cubiertas', categoriaNum: 12, tarea: 'Colocación Cumbrera de Chapa Color', unidad: 'ML', costoMatUnit: 25125, costoMoUnit: 29556 },
  { id: 'cub-membrana', categoria: '12 - Cubiertas', categoriaNum: 12, tarea: 'Colocación de membrana asfáltica con imprimación de superficie', unidad: 'M²', costoMatUnit: 15338, costoMoUnit: 18722 },
  { id: 'cub-forrado-alero', categoria: '12 - Cubiertas', categoriaNum: 12, tarea: 'Forrado de Alero a Nivel c/Machimbre de Madera de 1/2', unidad: 'M²', costoMatUnit: 24833, costoMoUnit: 53201 },
  { id: 'cub-techo-chapa', categoria: '12 - Cubiertas', categoriaNum: 12, tarea: 'Techo de Chapa Color Ondulada o Trapezoidal sobre Estructura de Madera Vista (c/aislante y machimbre)', unidad: 'M²', costoMatUnit: 108887, costoMoUnit: 77767 },

  // 13 - Instalaciones sanitarias
  { id: 'sanit-bano-completo', categoria: '13 - Instalaciones sanitarias', categoriaNum: 13, tarea: 'Baño completo (Desagües primarios y secundarios, agua caliente y fría)', unidad: 'U', costoMatUnit: 687995, costoMoUnit: 1058916 },
  { id: 'sanit-cocina-lavadero', categoria: '13 - Instalaciones sanitarias', categoriaNum: 13, tarea: 'Cocina-Lavadero c/Termo o Calefon (Desagües primarios y secundarios, agua caliente y fría)', unidad: 'U', costoMatUnit: 1016770, costoMoUnit: 705944 },
  { id: 'sanit-conexion-red', categoria: '13 - Instalaciones sanitarias', categoriaNum: 13, tarea: 'Conexión de Agua y Cloacas a la Red Domiciliaria', unidad: 'U', costoMatUnit: 598194, costoMoUnit: 472897 },
  { id: 'sanit-camara-inspeccion', categoria: '13 - Instalaciones sanitarias', categoriaNum: 13, tarea: 'Construcción de Cámara de Inspección 60x60 con modulo pre-moldeado y cojinetes', unidad: 'U', costoMatUnit: 153588, costoMoUnit: 244525 },
  { id: 'sanit-subida-tanque', categoria: '13 - Instalaciones sanitarias', categoriaNum: 13, tarea: 'Subida de agua al tanque de reserva c/2 canillas de servicio, colector c/3 bajadas indep.', unidad: 'U', costoMatUnit: 1034058, costoMoUnit: 677706 },
  { id: 'sanit-toilette', categoria: '13 - Instalaciones sanitarias', categoriaNum: 13, tarea: 'Toilette (Desagües primarios y secundarios, agua caliente y fría)', unidad: 'U', costoMatUnit: 496759, costoMoUnit: 508280 },

  // 14 - Instalaciones de gas
  { id: 'gas-fusion-completa', categoria: '14 - Instalaciones de gas', categoriaNum: 14, tarea: 'Inst. en Fusión completa. Caldera, Horno y Anafe (sin planos)', unidad: 'GL', costoMatUnit: 1057562, costoMoUnit: 1371548 },

  // 15 - Instalación eléctrica
  { id: 'elec-plafon-12w', categoria: '15 - Instalación eléctrica', categoriaNum: 15, tarea: 'Colocación de Plafón Led 12W', unidad: 'U', costoMatUnit: 9182, costoMoUnit: 24827 },
  { id: 'elec-plafon-18w', categoria: '15 - Instalación eléctrica', categoriaNum: 15, tarea: 'Colocación de Plafón Led 18w', unidad: 'U', costoMatUnit: 13774, costoMoUnit: 24827 },
  { id: 'elec-30-bocas', categoria: '15 - Instalación eléctrica', categoriaNum: 15, tarea: 'Inst. eléctrica para 30 bocas completa (incluye tablero seccional)', unidad: 'GL', costoMatUnit: 1344480, costoMoUnit: 1835454 },
  { id: 'elec-boca-adicional', categoria: '15 - Instalación eléctrica', categoriaNum: 15, tarea: 'Inst. eléctrica, boca adicional tomacorriente', unidad: 'U', costoMatUnit: 70581, costoMoUnit: 50828 },

  // 16 - Carpetas
  { id: 'carp-hidrofuga', categoria: '16 - Carpetas', categoriaNum: 16, tarea: 'Hidrofuga s/contrapiso (Esp: 2cm)', unidad: 'M²', costoMatUnit: 7819, costoMoUnit: 16660 },

  // 17 - Pisos Cerámico, Porcellanato y Loseta
  { id: 'piso-ceramico-60x60', categoria: '17 - Pisos Cerámico, Porcellanato y Loseta', categoriaNum: 17, tarea: 'Cerámico 60x60', unidad: 'M²', costoMatUnit: 58390, costoMoUnit: 37395 },
  { id: 'piso-porcellanato-60x60', categoria: '17 - Pisos Cerámico, Porcellanato y Loseta', categoriaNum: 17, tarea: 'Porcellanato 60x60', unidad: 'M²', costoMatUnit: 72987, costoMoUnit: 41550 },
  { id: 'piso-porcellanato-80x80', categoria: '17 - Pisos Cerámico, Porcellanato y Loseta', categoriaNum: 17, tarea: 'Porcellanato 80x80', unidad: 'M²', costoMatUnit: 121013, costoMoUnit: 41550 },

  // 20 - Zócalos y Contramarcos
  { id: 'zoc-contramarco-madera', categoria: '20 - Zócalos y Contramarcos', categoriaNum: 20, tarea: 'Contramarco de madera 1/2´ liso', unidad: 'ML', costoMatUnit: 2600, costoMoUnit: 13716 },
  { id: 'zoc-ceramico', categoria: '20 - Zócalos y Contramarcos', categoriaNum: 20, tarea: 'Zócalo Cerámico H:7cm', unidad: 'ML', costoMatUnit: 3459, costoMoUnit: 10972 },
  { id: 'zoc-madera', categoria: '20 - Zócalos y Contramarcos', categoriaNum: 20, tarea: 'Zócalo Madera 3/4´ liso', unidad: 'ML', costoMatUnit: 5484, costoMoUnit: 9875 },

  // 21 - Revestimientos Cerámico, Porcellanato, Venecita y Refractario
  { id: 'revest-porc-40x40', categoria: '21 - Revestimientos Cerámico, Porcellanato, Venecita y Refractario', categoriaNum: 21, tarea: 'Porcellanato 40x40', unidad: 'M²', costoMatUnit: 67357, costoMoUnit: 48503 },
  { id: 'revest-porc-60x60', categoria: '21 - Revestimientos Cerámico, Porcellanato, Venecita y Refractario', categoriaNum: 21, tarea: 'Porcellanato 60x60', unidad: 'M²', costoMatUnit: 83581, costoMoUnit: 57062 },

  // 23 - Revestimientos Texturado
  { id: 'revest-texturado', categoria: '23 - Revestimientos Texturado', categoriaNum: 23, tarea: 'Texturado 3 Travertino/Rulato (Grueso)', unidad: 'M²', costoMatUnit: 15965, costoMoUnit: 23088 },

  // 24 - Cielorrasos y Molduras
  { id: 'cielo-moldura-tergopol', categoria: '24 - Cielorrasos y Molduras', categoriaNum: 24, tarea: 'Moldura de tergopol 25x20mm. (lista p/pintar)', unidad: 'ML', costoMatUnit: 2118, costoMoUnit: 12344 },

  // 25 - Escaleras y Barandas
  { id: 'esc-baranda-pasamanos', categoria: '25 - Escaleras y Barandas', categoriaNum: 25, tarea: 'Baranda Pasamanos de Madera', unidad: 'ML', costoMatUnit: 30626, costoMoUnit: 21178 },
  { id: 'esc-baranda-tensores', categoria: '25 - Escaleras y Barandas', categoriaNum: 25, tarea: 'Baranda de Madera con tensores y 4 lineas de cable de acero inoxidable', unidad: 'ML', costoMatUnit: 144359, costoMoUnit: 42357 },
  { id: 'esc-carpeta-cementicia', categoria: '25 - Escaleras y Barandas', categoriaNum: 25, tarea: 'Carpeta cementicia (P/escalera de H°A°)', unidad: 'M²', costoMatUnit: 5360, costoMoUnit: 22590 },
  { id: 'esc-nariz-guayubira', categoria: '25 - Escaleras y Barandas', categoriaNum: 25, tarea: 'Nariz de escalera de 2¨x 3´ en guayubira', unidad: 'ML', costoMatUnit: 28746, costoMoUnit: 21178 },
  { id: 'esc-revest-porc', categoria: '25 - Escaleras y Barandas', categoriaNum: 25, tarea: 'Revest., alzada y pedada de porcellanato', unidad: 'M²', costoMatUnit: 49340, costoMoUnit: 84713 },

  // 26 - Construcción en Seco
  { id: 'seco-cielorraso-yeso', categoria: '26 - Construcción en Seco', categoriaNum: 26, tarea: 'Cielorraso con placas de yeso', unidad: 'M²', costoMatUnit: 19329, costoMoUnit: 27409 },

  // 28 - Pinturas
  { id: 'pint-cielorraso-yeso', categoria: '28 - Pinturas', categoriaNum: 28, tarea: 'Cielorraso de yeso y/o cal', unidad: 'M²', costoMatUnit: 3151, costoMoUnit: 13430 },
  { id: 'pint-esmalte-abertura', categoria: '28 - Pinturas', categoriaNum: 28, tarea: 'Esmalte sintético s/ abertura', unidad: 'M²', costoMatUnit: 4376, costoMoUnit: 22384 },
  { id: 'pint-impermeabilizacion-losa', categoria: '28 - Pinturas', categoriaNum: 28, tarea: 'Impermeabilizacion de losa (terraza)', unidad: 'M²', costoMatUnit: 36081, costoMoUnit: 18746 },
  { id: 'pint-impregnante-madera', categoria: '28 - Pinturas', categoriaNum: 28, tarea: 'Impregnante s/madera y/o abertura', unidad: 'M²', costoMatUnit: 5425, costoMoUnit: 19586 },
  { id: 'pint-paredes-exteriores', categoria: '28 - Pinturas', categoriaNum: 28, tarea: 'Paredes exteriores', unidad: 'M²', costoMatUnit: 4142, costoMoUnit: 15109 },
  { id: 'pint-paredes-interiores', categoria: '28 - Pinturas', categoriaNum: 28, tarea: 'Paredes interiores', unidad: 'M²', costoMatUnit: 3296, costoMoUnit: 13990 },

  // 29 - Marmolería/Granitos
  { id: 'marmol-mesada-gris-mara', categoria: '29 - Marmolería/Granitos', categoriaNum: 29, tarea: 'Mesada de Granito Gris Mara (Ancho: 0,60)', unidad: 'ML', costoMatUnit: 169137, costoMoUnit: 71132 },
  { id: 'marmol-perforado-bacha', categoria: '29 - Marmolería/Granitos', categoriaNum: 29, tarea: 'Perforado de Granito y Pegado de Bacha Doble', unidad: 'U', costoMatUnit: 625803, costoMoUnit: 77690 },
  { id: 'marmol-zocalo-gris-mara', categoria: '29 - Marmolería/Granitos', categoriaNum: 29, tarea: 'Zócalo de Granito Gris Mara (Alt. 5 cm)', unidad: 'ML', costoMatUnit: 14855, costoMoUnit: 14891 },

  // 30 - Amoblamientos para cocinas, placares y vestidores
  { id: 'amobl-alacena', categoria: '30 - Amoblamientos para cocinas, placares y vestidores', categoriaNum: 30, tarea: 'Alacena de aglomerado enchapado c/ estante y cajonera', unidad: 'ML', costoMatUnit: 292654, costoMoUnit: 71132 },
  { id: 'amobl-bajo-mesada', categoria: '30 - Amoblamientos para cocinas, placares y vestidores', categoriaNum: 30, tarea: 'Bajo mesada aglomerado enchapado c/ estante y cajonera', unidad: 'ML', costoMatUnit: 329236, costoMoUnit: 92781 },
  { id: 'amobl-placard-150', categoria: '30 - Amoblamientos para cocinas, placares y vestidores', categoriaNum: 30, tarea: 'Placard 1.50x2.30x0.60 melamina 18mm blanco', unidad: 'U', costoMatUnit: 1190330, costoMoUnit: 111480 },
  { id: 'amobl-placard-240', categoria: '30 - Amoblamientos para cocinas, placares y vestidores', categoriaNum: 30, tarea: 'Placard 2.40x2.30x0.60 melamina 18mm blanco', unidad: 'U', costoMatUnit: 1677283, costoMoUnit: 111480 },

  // 31 - Aberturas de madera
  { id: 'abert-madera-embutir', categoria: '31 - Aberturas de madera', categoriaNum: 31, tarea: 'Puerta Placa Corrediza de Embutir, hoja 60/70 (Interior)', unidad: 'U', costoMatUnit: 302993, costoMoUnit: 94579 },
  { id: 'abert-madera-placa', categoria: '31 - Aberturas de madera', categoriaNum: 31, tarea: 'Puerta Placa, hoja 60/70 (Interior)', unidad: 'U', costoMatUnit: 281351, costoMoUnit: 67771 },
  { id: 'abert-madera-colonial', categoria: '31 - Aberturas de madera', categoriaNum: 31, tarea: 'Puerta de Entrada Estilo Colonial 0.90 x 2.00 (Exterior)', unidad: 'U', costoMatUnit: 1418818, costoMoUnit: 115139 },

  // 32 - Aberturas de aluminio
  { id: 'abert-alu-060x150', categoria: '32 - Aberturas de aluminio', categoriaNum: 32, tarea: 'Linea Modena. Ventana 0.60 x 1.50 Paño Fijo c/DVH', unidad: 'U', costoMatUnit: 477498, costoMoUnit: 59299 },
  { id: 'abert-alu-200x060', categoria: '32 - Aberturas de aluminio', categoriaNum: 32, tarea: 'Linea Modena. Ventana 2.00 x 0.60 Corrediza c/DVH', unidad: 'U', costoMatUnit: 615441, costoMoUnit: 79066 },
  { id: 'abert-alu-200x150', categoria: '32 - Aberturas de aluminio', categoriaNum: 32, tarea: 'Linea Modena. Ventana 2.00 x 1.50 Paño Fijo c/DVH', unidad: 'U', costoMatUnit: 742774, costoMoUnit: 107304 },
  { id: 'abert-alu-balcon', categoria: '32 - Aberturas de aluminio', categoriaNum: 32, tarea: 'Linea Modena. Ventana Balcón 2.00 x 2.00 Corrediza c/DVH', unidad: 'U', costoMatUnit: 1114161, costoMoUnit: 107304 },
  { id: 'abert-alu-ventiluz', categoria: '32 - Aberturas de aluminio', categoriaNum: 32, tarea: 'Linea Modena. Ventiluz 1.00 x 0.50 Corredizo c/DVH', unidad: 'U', costoMatUnit: 520038, costoMoUnit: 59299 },

  // 35 - Colocación de artefactos sanitarios, accesorios y grifería
  { id: 'artef-bano-completo', categoria: '35 - Colocación de artefactos sanitarios, accesorios y grifería', categoriaNum: 35, tarea: 'Baño Completo (inodoro c/mochila, bidet, lavatorio y bañera)', unidad: 'U', costoMatUnit: 3494493, costoMoUnit: 444745 },
  { id: 'artef-lavadero-cocina', categoria: '35 - Colocación de artefactos sanitarios, accesorios y grifería', categoriaNum: 35, tarea: 'Lavadero y cocina', unidad: 'U', costoMatUnit: 773049, costoMoUnit: 192723 },
  { id: 'artef-toilette', categoria: '35 - Colocación de artefactos sanitarios, accesorios y grifería', categoriaNum: 35, tarea: 'Toilette c/depósito a mochila', unidad: 'U', costoMatUnit: 1348029, costoMoUnit: 207548 },

  // 36 - Colocación de artefactos a gas
  { id: 'gas-anafe', categoria: '36 - Colocación de artefactos a gas', categoriaNum: 36, tarea: 'Colocación Anafe (sin ventilación)', unidad: 'U', costoMatUnit: 1023780, costoMoUnit: 59623 },
  { id: 'gas-caldera-dual', categoria: '36 - Colocación de artefactos a gas', categoriaNum: 36, tarea: 'Colocación Caldera Dual (con ventilación)', unidad: 'U', costoMatUnit: 5611738, costoMoUnit: 283921 },
  { id: 'gas-horno', categoria: '36 - Colocación de artefactos a gas', categoriaNum: 36, tarea: 'Colocación Horno (sin ventilación)', unidad: 'U', costoMatUnit: 1232936, costoMoUnit: 141393 },

  // 37 - Calefacción (Piso Radiante, Radiadores y Split)
  { id: 'calef-radiadores-120m2', categoria: '37 - Calefacción. (Piso Radiante, Radiadores y Split)', categoriaNum: 37, tarea: 'Calefacción por Radiadores para vivienda de 120m2 (dos plantas)', unidad: 'U', costoMatUnit: 8765731, costoMoUnit: 3567353 },

  // 41 - Limpieza y Ayuda de Gremios
  { id: 'limp-ayuda-gremios', categoria: '41 - Limpieza y Ayuda de Gremios', categoriaNum: 41, tarea: 'Ayuda de gremios', unidad: 'M²', costoMatUnit: 0, costoMoUnit: 25132 },
  { id: 'limp-final', categoria: '41 - Limpieza y Ayuda de Gremios', categoriaNum: 41, tarea: 'Limpieza final', unidad: 'M²', costoMatUnit: 0, costoMoUnit: 4094 },

  // 45 - Zingueria
  { id: 'zing-babeta-perimetral', categoria: '45 - Zingueria', categoriaNum: 45, tarea: 'Colocación de Babeta Perimetral Color Amurada/Atornillada', unidad: 'ML', costoMatUnit: 9663, costoMoUnit: 13782 },
  { id: 'zing-bajada-desague', categoria: '45 - Zingueria', categoriaNum: 45, tarea: 'Colocación de Bajada de Desagües en Chapa Galvanizada Vista', unidad: 'ML', costoMatUnit: 14746, costoMoUnit: 8613 },
  { id: 'zing-canaleta-ext', categoria: '45 - Zingueria', categoriaNum: 45, tarea: 'Colocación de Canaleta Exterior Galvanizada Vista', unidad: 'ML', costoMatUnit: 22738, costoMoUnit: 9188 },
  { id: 'zing-canaleta-int', categoria: '45 - Zingueria', categoriaNum: 45, tarea: 'Colocación de Canaleta Interna Conversa Galvanizada', unidad: 'ML', costoMatUnit: 22071, costoMoUnit: 20673 },
  { id: 'zing-recibidor-embudo', categoria: '45 - Zingueria', categoriaNum: 45, tarea: 'Colocación de Recibidor/Embudo de Chapa Galvanizada', unidad: 'U', costoMatUnit: 43201, costoMoUnit: 22969 }
];

export const CalculadoraCostosManoObra: React.FC = () => {
  const { currentUser } = useAuth();

  // Modo de visualización de columnas: Total / Materiales / Mano de Obra
  const [computeMode, setComputeMode] = useState<'all' | 'material' | 'manpower'>('all');
  const [activeTab, setActiveTab] = useState<'tabla' | 'materiales' | 'incidencia'>('tabla');

  // Filtros de categoría y búsqueda
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ESTADOS LOCALES REACTIVOS:
  // "los campos inicien en 0 y se calculen los totales automáticamente mediante estados locales, sin precargar totales."
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [matPriceInputs, setMatPriceInputs] = useState<Record<string, string>>({});
  const [moPriceInputs, setMoPriceInputs] = useState<Record<string, string>>({});

  // Ajuste porcentual de obra
  const [adjustmentPercent, setAdjustmentPercent] = useState<number>(0);

  // Modals & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showContractModal, setShowContractModal] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const loadSavedCount = async () => {
    try {
      const list = await getPresupuestos(currentUser?.uid);
      setSavedCount(list.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSavedCount();
    const handleUpdate = () => loadSavedCount();
    window.addEventListener('presupuestos_updated', handleUpdate);
    return () => window.removeEventListener('presupuestos_updated', handleUpdate);
  }, [currentUser]);

  // Lista de etapas/categorías ordenadas
  const allStages = useMemo(() => {
    const list: string[] = [];
    CONSTRUCTION_ITEMS.forEach(it => {
      if (!list.includes(it.categoria)) {
        list.push(it.categoria);
      }
    });
    return list;
  }, []);

  // Función para parsear números en formato argentino (admite comas '0,6' y puntos '0.6')
  const parseNumberValue = (raw: string | undefined, defaultVal: number = 0): number => {
    if (!raw || raw.trim() === '') return defaultVal;
    const normalized = raw.trim().replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) || parsed < 0 ? defaultVal : parsed;
  };

  const getQuantity = (id: string): number => {
    const raw = quantityInputs[id];
    if (!raw || raw.trim() === '') return 0;
    const normalized = raw.trim().replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  const getMatUnitCost = (item: ConstructionItem): number => {
    if (matPriceInputs[item.id] !== undefined) {
      return parseNumberValue(matPriceInputs[item.id], item.costoMatUnit);
    }
    return item.costoMatUnit;
  };

  const getMoUnitCost = (item: ConstructionItem): number => {
    if (moPriceInputs[item.id] !== undefined) {
      return parseNumberValue(moPriceInputs[item.id], item.costoMoUnit);
    }
    return item.costoMoUnit;
  };

  // Manejadores de cambios en los inputs editables
  const handleQuantityChange = (id: string, val: string) => {
    setQuantityInputs(prev => ({ ...prev, [id]: val }));
  };

  const handleMatPriceChange = (id: string, val: string) => {
    setMatPriceInputs(prev => ({ ...prev, [id]: val }));
  };

  const handleMoPriceChange = (id: string, val: string) => {
    setMoPriceInputs(prev => ({ ...prev, [id]: val }));
  };

  // Botón para reiniciar todo a 0
  const handleResetToZero = () => {
    setQuantityInputs({});
    setMatPriceInputs({});
    setMoPriceInputs({});
    setAdjustmentPercent(0);
    setToastMessage('🔄 Se restablecieron todas las cantidades y subtotales a 0.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // CÁLCULOS DINÁMICOS REACTIVOS: Inician estrictamente en 0 y suman a medida que se ingresan datos
  const calculation = useMemo(() => {
    let rawTotalMat = 0;
    let rawTotalMo = 0;
    let populatedCount = 0;
    const activeItems: (SavedPresupuestoItem & { categoria: string })[] = [];

    CONSTRUCTION_ITEMS.forEach(it => {
      const qty = getQuantity(it.id);
      const effectiveMatUnit = getMatUnitCost(it);
      const effectiveMoUnit = getMoUnitCost(it);

      if (qty > 0) {
        const subMat = effectiveMatUnit * qty;
        const subMo = effectiveMoUnit * qty;
        rawTotalMat += subMat;
        rawTotalMo += subMo;
        populatedCount++;

        activeItems.push({
          id: it.id,
          categoria: it.categoria,
          tarea: it.tarea,
          unidad: it.unidad,
          cantidad: qty,
          costoMatUnit: effectiveMatUnit,
          costoMoUnit: effectiveMoUnit,
          subtotalMat: Math.round(subMat),
          subtotalMo: Math.round(subMo),
          subtotalTotal: Math.round(subMat + subMo)
        });
      }
    });

    const effectiveMat = computeMode === 'manpower' ? 0 : rawTotalMat;
    const effectiveMo = computeMode === 'material' ? 0 : rawTotalMo;
    const subtotalRaw = effectiveMat + effectiveMo;

    const adjustmentAmount = Math.round((subtotalRaw * adjustmentPercent) / 100);
    const costoTotal = Math.max(0, subtotalRaw + adjustmentAmount);

    return {
      rawTotalMat: Math.round(rawTotalMat),
      rawTotalMo: Math.round(rawTotalMo),
      effectiveMat: Math.round(effectiveMat),
      effectiveMo: Math.round(effectiveMo),
      costoTotal: Math.round(costoTotal),
      adjustmentAmount,
      populatedCount,
      activeItems
    };
  }, [quantityInputs, matPriceInputs, moPriceInputs, computeMode, adjustmentPercent]);

  // Ítems filtrados por búsqueda y por etapa
  const displayedItems = useMemo(() => {
    let list = CONSTRUCTION_ITEMS;
    if (selectedStage !== 'all') {
      list = list.filter(i => i.categoria === selectedStage);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        i.tarea.toLowerCase().includes(q) || 
        i.categoria.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedStage, searchQuery]);

  // Agrupamiento por categorías (Trabajos Preliminares, Movimiento de suelos, etc.)
  const groupedCategories = useMemo(() => {
    const map: Record<string, ConstructionItem[]> = {};
    displayedItems.forEach(item => {
      if (!map[item.categoria]) {
        map[item.categoria] = [];
      }
      map[item.categoria].push(item);
    });
    return map;
  }, [displayedItems]);

  // =========================================================================
  // BOTÓN "IMPRIMIR PDF": Genera documento detallado y guarda copia en Firestore
  // =========================================================================
  const handlePrintPdf = async () => {
    if (calculation.costoTotal === 0 && calculation.populatedCount === 0) {
      alert('Por favor ingresá cantidades en al menos una tarea antes de imprimir el PDF.');
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const primaryColor = [15, 36, 92]; // Deep navy #0f245c
      const secondaryColor = [30, 41, 59];

      // Membrete Superior Oficial
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('BAHÍA OFICIOS', 14, 13);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Cómputo Métrico y Presupuesto Detallado de Obra • Bahía Blanca', 14, 19);

      const todayStr = new Date().toLocaleDateString('es-AR');
      doc.setFontSize(8);
      doc.text(`Fecha: ${todayStr}`, pageWidth - 14, 13, { align: 'right' });
      doc.text(`Doc Ref: CUST-${Date.now().toString().slice(-6)}`, pageWidth - 14, 19, { align: 'right' });

      let currentY = 35;

      // Encabezado de la Obra
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('DESGLOSE DETALLADO DE MANO DE OBRA Y MATERIALES', 14, currentY);

      currentY += 5;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(`Total de Tareas Cotizadas: ${calculation.populatedCount} ítems con cómputo • Precios de plaza Bahía Blanca`, 14, currentY);

      currentY += 6;

      // Generar filas para la tabla de autoTable
      const tableBody = calculation.activeItems.map(it => [
        it.categoria,
        it.tarea,
        it.unidad,
        String(it.cantidad),
        it.costoMatUnit > 0 ? `$${it.costoMatUnit.toLocaleString('es-AR')}` : '-',
        it.subtotalMat > 0 ? `$${it.subtotalMat.toLocaleString('es-AR')}` : '-',
        it.costoMoUnit > 0 ? `$${it.costoMoUnit.toLocaleString('es-AR')}` : '-',
        it.subtotalMo > 0 ? `$${it.subtotalMo.toLocaleString('es-AR')}` : '-',
        `$${it.subtotalTotal.toLocaleString('es-AR')}`
      ]);

      autoTable(doc, {
        startY: currentY,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 36, 92],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7.5
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 44 },
          2: { cellWidth: 10, halign: 'center' },
          3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 17, halign: 'right' },
          5: { cellWidth: 19, halign: 'right' },
          6: { cellWidth: 17, halign: 'right' },
          7: { cellWidth: 19, halign: 'right' },
          8: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }
        },
        head: [['Categoría', 'Tarea', 'Unid.', 'Cant.', 'Mat. Unit', 'Mat. Subtot', 'M.O. Unit', 'M.O. Subtot', 'Subtotal']],
        body: tableBody
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Si queda poco espacio para el cuadro final, agregar página
      if (currentY > pageHeight - 65) {
        doc.addPage();
        currentY = 20;
      }

      // Tabla de Resumen Económico
      const senaSug = Math.round(calculation.costoTotal * 0.3);
      const saldoSug = calculation.costoTotal - senaSug;

      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.2
        },
        head: [['CONCEPTO ECONÓMICO', 'IMPORTE ARS']],
        body: [
          ['Subtotal Costo de Materiales', `$${calculation.effectiveMat.toLocaleString('es-AR')}`],
          ['Subtotal Costo de Mano de Obra Especializada', `$${calculation.effectiveMo.toLocaleString('es-AR')}`],
          ...(calculation.adjustmentAmount !== 0 ? [[`Ajuste de Obra (${adjustmentPercent}%)`, `$${calculation.adjustmentAmount.toLocaleString('es-AR')}`]] : []),
          ['TOTAL PRESUPUESTADO FINAL', `$${calculation.costoTotal.toLocaleString('es-AR')} ARS`],
          ['(-) Anticipo / Seña convenida sugerida (30%)', `$${senaSug.toLocaleString('es-AR')}`],
          ['(=) Saldo contra entrega de obra (70%)', `$${saldoSug.toLocaleString('es-AR')}`]
        ]
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Firmas
      if (currentY < pageHeight - 35) {
        doc.setDrawColor(180, 180, 180);
        doc.line(20, currentY + 16, 75, currentY + 16);
        doc.line(pageWidth - 75, currentY + 16, pageWidth - 20, currentY + 16);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('FIRMA DEL PROFESIONAL', 47.5, currentY + 20, { align: 'center' });
        doc.text('FIRMA DEL CLIENTE', pageWidth - 47.5, currentY + 20, { align: 'center' });
      }

      // Pie legal
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Documento emitido mediante Bahía Oficios (bahiaoficios.com) • Valores con IVA en materiales e informe de mano de obra para Bahía Blanca.',
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );

      const fileName = `Presupuesto_Computo_Obra_${todayStr.replace(/\//g, '-')}_BahiaOficios.pdf`;
      doc.save(fileName);

      // Guardar también automáticamente en el historial de Mis Presupuestos
      await savePresupuesto({
        titulo: `Cómputo de Obra (${calculation.populatedCount} tareas)`,
        rubro: 'Construcción General',
        fecha: todayStr,
        items: calculation.activeItems,
        montoManoObra: calculation.effectiveMo,
        montoMateriales: calculation.effectiveMat,
        montoTotal: calculation.costoTotal,
        montoSena: senaSug,
        montoSaldo: saldoSug,
        clienteNombre: currentUser?.nombre || 'Presupuesto de Obra',
        clienteDireccion: 'Bahía Blanca',
        observaciones: `Cómputo detallado de ${calculation.populatedCount} tareas con desglose de materiales y mano de obra.`
      });

      setToastMessage('✅ Documento PDF descargado y guardado en Mis Presupuestos.');
      setTimeout(() => setToastMessage(null), 4000);
      loadSavedCount();
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Ocurrió un inconveniente al generar el PDF. Por favor intentá nuevamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Guardar copia directa en Mis Presupuestos
  const handleSaveToHistory = async () => {
    if (calculation.costoTotal === 0 && calculation.populatedCount === 0) {
      alert('Por favor ingresá cantidades en al menos una tarea antes de guardar.');
      return;
    }

    try {
      await savePresupuesto({
        titulo: `Cómputo de Obra (${calculation.populatedCount} tareas)`,
        rubro: 'Construcción General',
        fecha: new Date().toLocaleDateString('es-AR'),
        items: calculation.activeItems,
        montoManoObra: calculation.effectiveMo,
        montoMateriales: calculation.effectiveMat,
        montoTotal: calculation.costoTotal,
        montoSena: Math.round(calculation.costoTotal * 0.3),
        montoSaldo: Math.round(calculation.costoTotal * 0.7),
        clienteNombre: currentUser?.nombre || 'Presupuesto de Obra',
        clienteDireccion: 'Bahía Blanca',
        observaciones: `Cómputo con ajuste del ${adjustmentPercent}%.`
      });

      setToastMessage('✅ ¡Presupuesto guardado con éxito en Mis Presupuestos!');
      setTimeout(() => setToastMessage(null), 4000);
      loadSavedCount();
    } catch (err) {
      console.error(err);
      setToastMessage('❌ Error al guardar presupuesto.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Enviar por WhatsApp
  const handleShareWhatsApp = () => {
    if (calculation.costoTotal === 0) {
      alert('Ingresá al menos una cantidad para compartir el presupuesto.');
      return;
    }

    const lines = calculation.activeItems.slice(0, 15).map(it => 
      `• ${it.tarea} (${it.cantidad} ${it.unidad}): MO $${it.subtotalMo.toLocaleString('es-AR')} | Mat $${it.subtotalMat.toLocaleString('es-AR')}`
    );

    const message = `📊 *CÓMPUTO Y PRESUPUESTO DE OBRA (BAHÍA OFICIOS)*
📍 *Bahía Blanca*

${lines.join('\n')}${calculation.activeItems.length > 15 ? `\n... y ${calculation.activeItems.length - 15} tareas más` : ''}

🧱 *Costo de Materiales:* $${calculation.effectiveMat.toLocaleString('es-AR')}
🛠️ *Costo de Mano de obra:* $${calculation.effectiveMo.toLocaleString('es-AR')}
💰 *COSTO TOTAL:* $${calculation.costoTotal.toLocaleString('es-AR')} ARS

📄 *Generado en Bahía Oficios (bahiaoficios.com/calculadora-costos)*`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs font-bold">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Breadcrumb Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#0f245c] dark:text-blue-400 uppercase tracking-wider text-[11px]">
              Calculadora Dinámica de Costos • Bahía Blanca
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 dark:text-slate-400">
              Campos editables de Materiales y Mano de Obra. Inician en $0 y suman automáticamente.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/mis-presupuestos"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#0f245c] dark:text-blue-300 font-bold transition-colors"
            >
              <FolderOpen size={13} />
              <span>Mis Presupuestos</span>
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[#0f245c] text-white text-[10px] rounded-full">
                  {savedCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Header oficial estilo SISMAT */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0f245c] text-white flex items-center justify-center shrink-0 shadow-md">
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Cómputo y Presupuesto de Obra
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Tabla organizada por categorías con costos unitarios y cantidades editables. Todo inicia en $0.
              </p>
            </div>
          </div>

          {/* Botones de acción rápida en cabecera */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetToZero}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              title="Restablecer todas las cantidades y subtotales a 0"
            >
              <RotateCcw size={13} />
              <span>Poner todo en 0</span>
            </button>

            {/* BOTÓN IMPRIMIR PDF SOLICITADO */}
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="Generar y descargar documento PDF detallado"
            >
              <Printer size={14} />
              <span>{isGeneratingPdf ? 'Generando PDF...' : 'Imprimir PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f245c] hover:bg-[#163683] text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Save size={13} />
              <span>Guardar Presupuesto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Principales: Tabla de Cómputo | Listado de Materiales | Incidencia de Costos */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('tabla')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'tabla'
                ? 'border-[#0f245c] text-[#0f245c] dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Tabla de Cómputo por Categorías</span>
            {calculation.populatedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                {calculation.populatedCount} tareas
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materiales')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'materiales'
                ? 'border-[#0f245c] text-[#0f245c] dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package size={14} />
            <span>Listado de Materiales</span>
            {calculation.activeItems.filter(it => it.costoMatUnit > 0).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                {calculation.activeItems.filter(it => it.costoMatUnit > 0).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incidencia')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'incidencia'
                ? 'border-[#0f245c] text-[#0f245c] dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart size={14} />
            <span>Incidencia de Costos</span>
          </button>
        </div>
      </div>

      {/* Contenedor Principal: Menú Lateral de Categorías + Tabla Central */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ============================================================== */}
          {/* MENÚ LATERAL IZQUIERDO: ETAPAS / CATEGORÍAS                    */}
          {/* ============================================================== */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-6">
            <div className="bg-[#0f245c] text-white px-4 py-3 font-black text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Categorías de Obra</span>
              <span className="text-[10px] text-blue-200 font-bold">
                {allStages.length} rubros
              </span>
            </div>

            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tarea o categoría..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSelectedStage('all')}
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                  selectedStage === 'all'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0f245c] dark:text-blue-300 font-black border-l-4 border-[#0f245c]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>Mostrar Todas las Categorías</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                  {CONSTRUCTION_ITEMS.length}
                </span>
              </button>

              {allStages.map(stage => {
                const stageItems = CONSTRUCTION_ITEMS.filter(it => it.categoria === stage);
                const stageHasCount = stageItems.some(it => getQuantity(it.id) > 0);
                const isSelected = selectedStage === stage;

                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setSelectedStage(stage)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0f245c] dark:text-blue-300 font-black border-l-4 border-[#0f245c]'
                        : stageHasCount
                        ? 'text-blue-900 dark:text-blue-200 font-bold bg-blue-50/50'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate pr-1">{stage}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      stageHasCount
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {stageItems.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============================================================== */}
          {/* ÁREA CENTRAL: TABLA DE CÓMPUTO DINÁMICA CON CATEGORÍAS         */}
          {/* ============================================================== */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Toolbar Superior: Modo Selector de Columnas y Acciones */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400">Modo de Columnas:</span>
                <select
                  value={computeMode}
                  onChange={(e) => setComputeMode(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">Materiales + Mano de Obra (Completo)</option>
                  <option value="material">Solo Costo de Materiales</option>
                  <option value="manpower">Solo Costo de Mano de Obra</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {/* BOTÓN IMPRIMIR PDF EN BARRA SUPERIOR */}
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  title="Imprimir documento PDF con desglose completo"
                >
                  <Printer size={13} />
                  <span>Imprimir PDF</span>
                </button>

                <a
                  href={`/presupuestar?manoObra=${calculation.effectiveMo}&materiales=${calculation.effectiveMat}&total=${calculation.costoTotal}&titulo=${encodeURIComponent(`Cómputo de Obra (${calculation.populatedCount} tareas)`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  title="Abrir presupuestador online en otra página (/presupuestar)"
                >
                  <ExternalLink size={13} className="text-blue-200" />
                  <span>Presupuestar Online</span>
                </a>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* TAB 1: TABLA DE CÓMPUTO COMPLETA CON CATEGORÍAS SEPARADAS */}
            {activeTab === 'tabla' ? (
              <div className="space-y-6">
                {Object.entries(groupedCategories).map(([stageName, items]) => {
                  // Subtotales dinámicos de esta categoría: inician en 0 y suman según inputs
                  let stageMatTotal = 0;
                  let stageMoTotal = 0;

                  items.forEach(it => {
                    const q = getQuantity(it.id);
                    const matUnit = getMatUnitCost(it);
                    const moUnit = getMoUnitCost(it);

                    stageMatTotal += matUnit * q;
                    stageMoTotal += moUnit * q;
                  });

                  const stageGrandTotal = (computeMode === 'manpower' ? 0 : stageMatTotal) + 
                                          (computeMode === 'material' ? 0 : stageMoTotal);

                  return (
                    <div
                      key={stageName}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          {/* THEAD: Estilo oficial con fondo azul marino de 2 niveles */}
                          <thead>
                            <tr className="bg-[#0f245c] text-white font-bold border-b border-blue-950">
                              <th rowSpan={2} className="py-3 px-4 font-black text-sm tracking-wide">
                                {stageName}
                              </th>
                              <th rowSpan={2} className="py-3 px-2 text-center w-14">
                                Unidad
                              </th>
                              <th rowSpan={2} className="py-3 px-3 text-center w-24">
                                Cantidad
                              </th>
                              {computeMode !== 'manpower' && (
                                <th colSpan={2} className="py-2 px-3 text-center bg-blue-950/70 border-l border-r border-blue-800/50">
                                  Costo de Materiales
                                </th>
                              )}
                              {computeMode !== 'material' && (
                                <th colSpan={2} className="py-2 px-3 text-center bg-blue-950/50 border-r border-blue-800/50">
                                  Costo de Mano de obra
                                </th>
                              )}
                              <th rowSpan={2} className="py-3 px-4 text-right w-32">
                                Subtotal
                              </th>
                            </tr>
                            <tr className="bg-[#122b64] text-blue-200 text-[11px] font-bold border-b border-blue-950">
                              {computeMode !== 'manpower' && (
                                <>
                                  <th className="py-1.5 px-3 text-center border-l border-blue-800/50 w-28">Unitario ($)</th>
                                  <th className="py-1.5 px-3 text-right border-r border-blue-800/50 w-28">Subtotal</th>
                                </>
                              )}
                              {computeMode !== 'material' && (
                                <>
                                  <th className="py-1.5 px-3 text-center w-28">Unitario ($)</th>
                                  <th className="py-1.5 px-3 text-right border-r border-blue-800/50 w-28">Subtotal</th>
                                </>
                              )}
                            </tr>
                          </thead>

                          {/* TBODY: CAMPOS EDITABLES PARA CANTIDAD, COSTO MAT Y COSTO MO */}
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {items.map(item => {
                              const rawQty = quantityInputs[item.id] !== undefined ? quantityInputs[item.id] : '';
                              const qtyNumber = getQuantity(item.id);

                              const effectiveMatUnit = getMatUnitCost(item);
                              const effectiveMoUnit = getMoUnitCost(item);

                              const subMat = effectiveMatUnit * qtyNumber;
                              const subMo = effectiveMoUnit * qtyNumber;
                              const rowTotal = (computeMode === 'manpower' ? 0 : subMat) + 
                                               (computeMode === 'material' ? 0 : subMo);

                              return (
                                <tr
                                  key={item.id}
                                  className={`transition-colors ${
                                    qtyNumber > 0
                                      ? 'bg-blue-50/70 dark:bg-blue-950/30 font-semibold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  {/* Tarea */}
                                  <td className="py-2.5 px-4 text-slate-900 dark:text-white">
                                    <span>{item.tarea}</span>
                                    <span className="text-[10px] text-slate-400 block sm:hidden">
                                      x {item.unidad}
                                    </span>
                                  </td>

                                  {/* Unidad */}
                                  <td className="py-2.5 px-2 text-center font-bold text-slate-600 dark:text-slate-300">
                                    {item.unidad}
                                  </td>

                                  {/* CAMPO EDITABLE 1: Cantidad (inicia en 0 / vacío) */}
                                  <td className="py-2.5 px-2 text-center">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={rawQty}
                                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                      placeholder="0"
                                      className={`w-20 px-2 py-1 text-center font-black rounded-lg border focus:outline-none transition-all ${
                                        qtyNumber > 0
                                          ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20'
                                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                      }`}
                                    />
                                  </td>

                                  {/* COSTO DE MATERIALES */}
                                  {computeMode !== 'manpower' && (
                                    <>
                                      {/* CAMPO EDITABLE 2: Costo Unitario de Materiales */}
                                      <td className="py-2 px-2 text-center">
                                        <div className="relative inline-flex items-center">
                                          <span className="text-slate-400 text-[10px] mr-1">$</span>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={matPriceInputs[item.id] !== undefined ? matPriceInputs[item.id] : item.costoMatUnit.toLocaleString('es-AR')}
                                            onFocus={() => {
                                              if (matPriceInputs[item.id] === undefined) {
                                                setMatPriceInputs(prev => ({ ...prev, [item.id]: String(item.costoMatUnit) }));
                                              }
                                            }}
                                            onChange={(e) => handleMatPriceChange(item.id, e.target.value)}
                                            className="w-20 px-1.5 py-1 text-right text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-700 dark:text-slate-200"
                                            title="Editar costo unitario de materiales"
                                          />
                                        </div>
                                      </td>
                                      {/* Subtotal Materiales ($0 si cantidad es 0) */}
                                      <td className={`py-2.5 px-3 text-right ${qtyNumber > 0 ? 'font-bold text-amber-700 dark:text-amber-300' : 'text-slate-400'}`}>
                                        ${Math.round(subMat).toLocaleString('es-AR')}
                                      </td>
                                    </>
                                  )}

                                  {/* COSTO DE MANO DE OBRA */}
                                  {computeMode !== 'material' && (
                                    <>
                                      {/* CAMPO EDITABLE 3: Costo Unitario de Mano de Obra */}
                                      <td className="py-2 px-2 text-center">
                                        <div className="relative inline-flex items-center">
                                          <span className="text-slate-400 text-[10px] mr-1">$</span>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={moPriceInputs[item.id] !== undefined ? moPriceInputs[item.id] : item.costoMoUnit.toLocaleString('es-AR')}
                                            onFocus={() => {
                                              if (moPriceInputs[item.id] === undefined) {
                                                setMoPriceInputs(prev => ({ ...prev, [item.id]: String(item.costoMoUnit) }));
                                              }
                                            }}
                                            onChange={(e) => handleMoPriceChange(item.id, e.target.value)}
                                            className="w-20 px-1.5 py-1 text-right text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700 dark:text-slate-200"
                                            title="Editar costo unitario de mano de obra"
                                          />
                                        </div>
                                      </td>
                                      {/* Subtotal Mano de Obra ($0 si cantidad es 0) */}
                                      <td className={`py-2.5 px-3 text-right ${qtyNumber > 0 ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-slate-400'}`}>
                                        ${Math.round(subMo).toLocaleString('es-AR')}
                                      </td>
                                    </>
                                  )}

                                  {/* Subtotal Total del Ítem ($0 si cantidad es 0) */}
                                  <td className={`py-2.5 px-4 text-right whitespace-nowrap ${qtyNumber > 0 ? 'font-black text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                    ${Math.round(rowTotal).toLocaleString('es-AR')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>

                          {/* TFOOT: Subtotales por categoría discriminados (Mano de Obra y Materiales) */}
                          <tfoot>
                            <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700 text-xs">
                              <td colSpan={3} className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                                Subtotal {stageName}:
                              </td>
                              {computeMode !== 'manpower' && (
                                <>
                                  <td className="py-2.5 px-2 text-right text-slate-400 text-[10px]">Total Mat:</td>
                                  <td className="py-2.5 px-3 text-right font-black text-amber-700 dark:text-amber-400">
                                    ${Math.round(stageMatTotal).toLocaleString('es-AR')}
                                  </td>
                                </>
                              )}
                              {computeMode !== 'material' && (
                                <>
                                  <td className="py-2.5 px-2 text-right text-slate-400 text-[10px]">Total M.O:</td>
                                  <td className="py-2.5 px-3 text-right font-black text-blue-700 dark:text-blue-400">
                                    ${Math.round(stageMoTotal).toLocaleString('es-AR')}
                                  </td>
                                </>
                              )}
                              <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white">
                                ${Math.round(stageGrandTotal).toLocaleString('es-AR')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : activeTab === 'materiales' ? (
              /* TAB 2: LISTADO DE MATERIALES DONDE HUBO CANTIDADES INGRESADAS */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Package size={18} className="text-amber-500" />
                    <span>Listado de Materiales Requeridos para el Cómputo</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Resumen consolidado de insumos y materiales cotizados según las cantidades que fuiste ingresando.
                  </p>
                </div>

                {calculation.activeItems.filter(it => it.costoMatUnit > 0).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Package size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-bold">
                      Aún no ingresaste cantidades en tareas con materiales. Escribí las medidas en la tabla de cómputo para ver el listado acá.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold">
                          <th className="py-2.5 px-3">Categoría</th>
                          <th className="py-2.5 px-3">Material / Tarea</th>
                          <th className="py-2.5 px-2 text-center">Unidad</th>
                          <th className="py-2.5 px-2 text-center">Cantidad</th>
                          <th className="py-2.5 px-3 text-right">Costo Unitario ($)</th>
                          <th className="py-2.5 px-3 text-right font-black">Subtotal Materiales ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {calculation.activeItems.filter(it => it.costoMatUnit > 0).map(it => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 text-slate-400 font-semibold">{it.categoria}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{it.tarea}</td>
                            <td className="py-2 px-2 text-center font-bold text-slate-600 dark:text-slate-300">{it.unidad}</td>
                            <td className="py-2 px-2 text-center font-black text-blue-700 dark:text-blue-300">{it.cantidad}</td>
                            <td className="py-2 px-3 text-right text-slate-500">${it.costoMatUnit.toLocaleString('es-AR')}</td>
                            <td className="py-2 px-3 text-right font-black text-amber-700 dark:text-amber-400">
                              ${it.subtotalMat.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-black text-xs border-t border-slate-200 dark:border-slate-700">
                          <td colSpan={5} className="py-3 px-3 text-slate-900 dark:text-white">Total Materiales de Obra:</td>
                          <td className="py-3 px-3 text-right text-amber-700 dark:text-amber-400 text-sm">
                            ${calculation.effectiveMat.toLocaleString('es-AR')} ARS
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 3: INCIDENCIA DE COSTOS (PORCENTAJES DE MATERIALES VS MANO DE OBRA) */
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart size={18} className="text-blue-600" />
                    <span>Incidencia de Costos: Materiales vs Mano de Obra</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Proporción porcentual calculada según los valores que vas ingresando.
                  </p>
                </div>

                {calculation.costoTotal === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <p className="text-xs font-bold">
                      Ingresá cantidades en la tabla de cómputo para ver la barra de incidencia y porcentajes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Barra de Proporción Gráfica */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-amber-600 flex items-center gap-1.5">
                          <Package size={14} /> Materiales ({Math.round((calculation.effectiveMat / calculation.costoTotal) * 100)}%)
                        </span>
                        <span className="text-blue-600 flex items-center gap-1.5">
                          <Wrench size={14} /> Mano de Obra ({Math.round((calculation.effectiveMo / calculation.costoTotal) * 100)}%)
                        </span>
                      </div>

                      <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                        <div 
                          className="bg-amber-500 transition-all duration-500" 
                          style={{ width: `${Math.round((calculation.effectiveMat / calculation.costoTotal) * 100)}%` }} 
                        />
                        <div 
                          className="bg-[#0f245c] transition-all duration-500" 
                          style={{ width: `${Math.round((calculation.effectiveMo / calculation.costoTotal) * 100)}%` }} 
                        />
                      </div>
                    </div>

                    {/* Comparativa Numérica */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                        <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block uppercase">
                          Materiales de Construcción
                        </span>
                        <span className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1 block">
                          ${calculation.effectiveMat.toLocaleString('es-AR')}
                        </span>
                        <span className="text-[10px] text-amber-700/80 dark:text-amber-400 mt-0.5 block">
                          Representa el {Math.round((calculation.effectiveMat / calculation.costoTotal) * 100)}% del total
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
                        <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 block uppercase">
                          Mano de Obra Especializada
                        </span>
                        <span className="text-xl font-black text-blue-900 dark:text-blue-200 mt-1 block">
                          ${calculation.effectiveMo.toLocaleString('es-AR')}
                        </span>
                        <span className="text-[10px] text-blue-700/80 dark:text-blue-400 mt-0.5 block">
                          Representa el {Math.round((calculation.effectiveMo / calculation.costoTotal) * 100)}% del total
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* CAJA DE TOTALES FINAL                                           */}
            {/* ============================================================== */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md space-y-5">
              {/* Ajuste total de obra (%) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Ajuste total de obra (%):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Podés aplicar un margen o descuento global sobre el cómputo total.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    value={adjustmentPercent}
                    onChange={(e) => setAdjustmentPercent(parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-1.5 text-center text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              {/* Totales Grandes en tiempo real */}
              <div className="space-y-2 text-right">
                <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  Costo de Materiales: <strong className="text-amber-700 dark:text-amber-400 ml-2">${calculation.effectiveMat.toLocaleString('es-AR')}</strong>
                </div>

                <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  Costo de Mano de obra: <strong className="text-blue-700 dark:text-blue-400 ml-2">${calculation.effectiveMo.toLocaleString('es-AR')}</strong>
                </div>

                {adjustmentPercent !== 0 && (
                  <div className="text-xs font-semibold text-slate-500">
                    Ajuste de obra ({adjustmentPercent > 0 ? `+${adjustmentPercent}` : adjustmentPercent}%): 
                    <span className="font-bold ml-1">${calculation.adjustmentAmount.toLocaleString('es-AR')}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xl sm:text-2xl font-black text-[#0f245c] dark:text-white">
                    Costo Total: <span className="text-blue-600 dark:text-blue-400 ml-2">${calculation.costoTotal.toLocaleString('es-AR')} ARS</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                    {calculation.populatedCount} tareas contabilizadas en el presupuesto actual.
                  </span>
                </div>
              </div>

              {/* Acciones del Presupuesto */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* BOTÓN IMPRIMIR PDF EN CAJA DE TOTALES */}
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Descargar documento PDF detallado con el cómputo final"
                >
                  <Printer size={15} />
                  <span>{isGeneratingPdf ? 'Generando PDF...' : 'Imprimir PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToHistory}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Guardar Copia</span>
                </button>

                <a
                  href={`/presupuestar?manoObra=${calculation.effectiveMo}&materiales=${calculation.effectiveMat}&total=${calculation.costoTotal}&titulo=${encodeURIComponent(`Cómputo de Obra (${calculation.populatedCount} tareas)`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#0f245c] hover:bg-[#163683] text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  title="Abrir presupuestador online en una pestaña dedicada (/presupuestar)"
                >
                  <ExternalLink size={15} className="text-amber-300" />
                  <span>Abrir /presupuestar</span>
                </a>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <MessageCircle size={14} className="text-emerald-400" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Disclaimer Legal Oficial */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                <Info size={14} className="text-blue-600 shrink-0" />
                <span>Condiciones de Cómputo y Valores de Referencia:</span>
              </div>
              <p>
                Los valores de materiales de este cómputo incluyen el IVA, en tanto que los costos de mano de obra son consultados a contratistas y profesionales con condición de entrega de factura monotributo en Bahía Blanca. Podés modificar libremente los costos unitarios de materiales y mano de obra para adaptarlos a tu presupuesto específico.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA FLOTANTE INFERIOR CON TOTALES EN VIVO Y BOTÓN IMPRIMIR PDF */}
      {calculation.costoTotal > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3 px-4 shadow-2xl animate-fade-in">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Cómputo</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {calculation.populatedCount} tareas
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Materiales</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  ${calculation.effectiveMat.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Mano de Obra</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  ${calculation.effectiveMo.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Obra</span>
                <span className="text-sm font-black text-[#0f245c] dark:text-blue-300">
                  ${calculation.costoTotal.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToZero}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                title="Poner todo en 0"
              >
                Limpiar ($0)
              </button>

              {/* BOTÓN IMPRIMIR PDF EN BARRA FLOTANTE */}
              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Descargar documento PDF completo"
              >
                <Printer size={13} />
                <span>Imprimir PDF</span>
              </button>

              <a
                href={`/presupuestar?manoObra=${calculation.effectiveMo}&materiales=${calculation.effectiveMat}&total=${calculation.costoTotal}&titulo=${encodeURIComponent(`Cómputo de Obra (${calculation.populatedCount} tareas)`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-[#0f245c] hover:bg-[#163683] text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                title="Abrir presupuestador online en una nueva pestaña (/presupuestar)"
              >
                <ExternalLink size={13} className="text-amber-300" />
                <span>/presupuestar</span>
              </a>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <MessageCircle size={13} />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contrato y Recibo Oficial prellenado */}
      <ContratoPresupuestoModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        initialJobTitle={`Cómputo de Obra (${calculation.populatedCount} tareas)`}
        initialRubro="Construcción y Oficios"
        initialManoObra={calculation.effectiveMo > 0 ? calculation.effectiveMo : undefined}
        initialMateriales={calculation.effectiveMat > 0 ? calculation.effectiveMat : undefined}
        initialAmount={calculation.costoTotal > 0 ? calculation.costoTotal : undefined}
      />
    </div>
  );
};

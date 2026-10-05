/**
 * voiceBudgetParser.ts
 * Parser inteligente de dictado por voz para presupuestos (tareas y materiales)
 * Integra Gemini 3.8 Flash a través de /api/parse-presupuesto-voice con fallback heurístico local.
 */

export interface ParsedBudgetItem {
  descripcion: string;
  cantidad: string;
  precio: number | string;
  precioUnitario?: number | string;
}

const SPANISH_NUMBERS: Record<string, number> = {
  'uno': 1, 'una': 1, 'un': 1,
  'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
  'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
  'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
  'veinte': 20, 'treinta': 30, 'cuarenta': 40, 'cincuenta': 50,
  'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90,
  'cien': 100, 'ciento': 100, 'doscientos': 200, 'trescientos': 300,
  'cuatrocientos': 400, 'quinientos': 500
};

/**
 * Normaliza números coloquiales en texto (ej: "20.000" -> "20000", "5.000" -> "5000", "20 mil" -> "20000")
 */
function normalizeSpokenText(raw: string): string {
  let text = raw.toLowerCase().trim();

  // 1. Quitar puntos de miles en números argentinos (ej: 20.000 -> 20000, 5.000 -> 5000, 1.500.000 -> 1500000)
  text = text.replace(/(\d+)\.(\d{3})\b/g, '$1$2');
  text = text.replace(/(\d+)\.(\d{3})\b/g, '$1$2'); // dos veces para millones

  // 2. Reemplazar "mil" precedido de número
  text = text.replace(/(\d+)\s*mil\b/g, (_, num) => `${parseInt(num, 10) * 1000}`);
  text = text.replace(/(\d+)\s*k\b/g, (_, num) => `${parseInt(num, 10) * 1000}`);

  // 3. Reemplazar "pesos", "$" o "pe"
  text = text.replace(/\$/g, '');
  text = text.replace(/\bpesos\b/g, '');
  text = text.replace(/\bpe\b/g, '');

  return text;
}

/**
 * Fallback local heurístico inteligente para cuando no hay conexión a internet o Gemini falla
 */
export function parseVoiceLocally(rawText: string, type: 'tarea' | 'material'): ParsedBudgetItem[] {
  if (!rawText || !rawText.trim()) return [];

  const normalized = normalizeSpokenText(rawText);

  // Intentar separar por "y también", "y además", "y", punto o coma (salvo que sea un número)
  const parts = normalized
    .split(/\by además\b|\by también\b|\by luego\b|;|\n/i)
    .map(p => p.trim())
    .filter(p => p.length > 2);

  const results: ParsedBudgetItem[] = [];
  const sentences = parts.length > 0 ? parts : [normalized];

  for (const sentence of sentences) {
    let desc = sentence.trim();

    // Detectar si dice "cada uno" / "por unidad" / "el metro" / "la unidad"
    const isPerUnit = /\bcada uno\b|\bcada una\b|\bpor unidad\b|\bel metro\b|\bel m2\b|\bel ml\b|\bpor metro\b/i.test(desc);
    desc = desc.replace(/\bcada uno\b|\bcada una\b|\bpor unidad\b|\bel metro\b|\bel m2\b|\bel ml\b|\bpor metro\b/gi, ' ');

    // 1. Extraer precio
    let precio = 0;
    const priceMatch = desc.match(/(?:a|valen|vale|cuestan|cuesta|salen|sale|por|en|\$)\s*([0-9]+)/i)
      || desc.match(/([0-9]+)\s*$/i);

    if (priceMatch) {
      precio = parseInt(priceMatch[1], 10) || 0;
      desc = desc.replace(priceMatch[0], ' ');
    }

    // 2. Extraer cantidad y unidad
    let numericQty = 1;
    let unitLabel = type === 'material' ? 'un' : 'un';

    // A) Buscar dígitos (ej: "4 m", "4 metros", "10 m2", "3 un")
    const numRegexStart = /^(\d+)\s*(m2|m²|metros cuadrados|metros|metro|ml|m|bolsas|bolsa|litros|litro|kg|kilos|unidades|unidad|un)?\b/i;
    const numRegexAnywhere = /\b(\d+)\s*(m2|m²|metros cuadrados|metros|metro|ml|m|bolsas|bolsa|litros|litro|kg|kilos|unidades|unidad|un)\b/i;

    const digitMatch = desc.match(numRegexStart) || desc.match(numRegexAnywhere);

    if (digitMatch) {
      numericQty = parseInt(digitMatch[1], 10) || 1;
      const rawUnit = (digitMatch[2] || '').toLowerCase();
      if (rawUnit.includes('m2') || rawUnit.includes('cuadrado')) unitLabel = 'm²';
      else if (rawUnit.includes('ml')) unitLabel = 'ml';
      else if (rawUnit.startsWith('m')) unitLabel = 'm';
      else if (rawUnit.includes('bolsa')) unitLabel = 'bolsas';
      else if (rawUnit.includes('litro')) unitLabel = 'lts';
      else if (rawUnit.includes('kg') || rawUnit.includes('kilo')) unitLabel = 'kg';
      else unitLabel = 'un';

      desc = desc.replace(digitMatch[0], ' ');
    } else {
      // B) Probar con números escritos en palabras ("tres codos", "cuatro metros", "diez bolsas")
      for (const [word, val] of Object.entries(SPANISH_NUMBERS)) {
        const wordRegex = new RegExp(`^${word}\\s*(m2|m²|metros cuadrados|metros|metro|ml|m|bolsas|bolsa|litros|litro|kg|kilos|unidades|unidad|un)?\\b`, 'i');
        const match = desc.match(wordRegex);
        if (match) {
          numericQty = val;
          const rawUnit = (match[1] || '').toLowerCase();
          if (rawUnit.includes('m2') || rawUnit.includes('cuadrado')) unitLabel = 'm²';
          else if (rawUnit.includes('ml')) unitLabel = 'ml';
          else if (rawUnit.startsWith('m')) unitLabel = 'm';
          else if (rawUnit.includes('bolsa')) unitLabel = 'bolsas';
          else if (rawUnit.includes('litro')) unitLabel = 'lts';
          else if (rawUnit.includes('kg') || rawUnit.includes('kilo')) unitLabel = 'kg';
          else unitLabel = 'un';

          desc = desc.replace(match[0], ' ');
          break;
        }
      }
    }

    // Si es precio unitario y cantidad > 1, el total es precio * cantidad
    const unitPrice = isPerUnit ? precio : (numericQty > 0 && precio > 0 ? Math.round(precio / numericQty) : precio);
    if (isPerUnit && numericQty > 1 && precio > 0) {
      precio = precio * numericQty;
    }

    // 3. Limpieza de descripción
    desc = desc
      .replace(/^\s*de\s+/gi, '') // Quitar 'de' al inicio (ej: "de revoque" -> "revoque")
      .replace(/\b(valen|vale|cuestan|cuesta|salen|sale|precio|costo)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Corregir errores fonéticos comunes (ej: "reboque" -> "Revoque")
    desc = desc.replace(/reboque/gi, 'revoque');
    desc = desc.replace(/termofusion/gi, 'termofusión');

    // Capitalizar
    if (desc) {
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    } else {
      desc = type === 'tarea' ? 'Labor solicitada' : 'Material solicitado';
    }

    results.push({
      descripcion: desc,
      cantidad: `${numericQty} ${unitLabel}`,
      precio: precio > 0 ? precio : '',
      precioUnitario: unitPrice > 0 ? unitPrice : ''
    });
  }

  return results.filter(r => r.descripcion.length > 1 || r.precio !== '');
}

/**
 * Parsea el audio dictado llamando a la IA Gemini en el servidor, con fallback automático local.
 */
export async function parseVoiceToItems(
  text: string, 
  type: 'tarea' | 'material'
): Promise<ParsedBudgetItem[]> {
  if (!text || !text.trim()) return [];

  try {
    const res = await fetch('/api/parse-presupuesto-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, type })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.map((item: any) => ({
          descripcion: String(item.descripcion || '').trim(),
          cantidad: String(item.cantidad || '1 un').trim(),
          precio: item.precio !== undefined ? item.precio : '',
          precioUnitario: item.precioUnitario !== undefined ? item.precioUnitario : ''
        }));
      }
    }
  } catch (err) {
    console.warn('[VoiceBudgetParser] Error conectando con API Gemini, ejecutando fallback local:', err);
  }

  // Fallback heurístico inteligente
  return parseVoiceLocally(text, type);
}

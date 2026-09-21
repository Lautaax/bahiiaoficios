export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  imageUrl: string;
  tags: string[];
}

export const BLOG_CATEGORIES = [
  'Todos',
  'Seguridad y Gas',
  'Electricidad',
  'Plomería y Red',
  'Pintura y Humedad',
  'Guía de Contratación',
  'Climatización',
  'Cerrajería y Alarmas',
  'Albañilería y Techos'
] as const;

export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    slug: 'seguridad-gas-camuzzi-bahia-blanca',
    title: 'Normativas Camuzzi: Rejillas de ventilación, tiro balanceado y prevención de monóxido de carbono',
    excerpt: 'El viento y las bajas temperaturas en Bahía Blanca exigen instalaciones seguras. Qué revisar en estufas, calefones y por qué jamás tapar las rejillas reglamentarias.',
    category: 'Seguridad y Gas',
    author: 'Ing. Marcelo Gómez (Gasista Mat. 1° Cat)',
    date: '18 Mar, 2026',
    readTime: '6 min',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    tags: ['Gas', 'Camuzzi', 'Calefacción', 'Seguridad', 'Monóxido'],
    content: `
      En Bahía Blanca, las bajas temperaturas invernales combinadas con los fuertes vientos característicos de la zona convierten la calefacción a gas en un elemento vital del hogar, pero también en un factor crítico de seguridad.

      ### 1. El color de la llama: el primer semáforo de tu casa
      Cualquier artefacto a gas (termotanque, cocina, calefactor, caldera) debe emitir una llama de color **azul uniforme con un cono interior celeste nítido**.
      - **Llama azul:** Combustión perfecta y eficiente.
      - **Llama amarilla o anaranjada:** Indica combustión incompleta, falta de oxígeno y generación activa de **monóxido de carbono (CO)**, un gas incoloro, inodoro e imperceptible que puede ser letal en pocos minutos.

      ### 2. Por qué jamás debés tapar las rejillas de ventilación
      Una costumbre peligrosa durante los días de temporales en la ciudad es obturar las rejillas metálicas para evitar el ingreso de aire frío.
      - Las rejillas **inferiores** proveen el oxígeno fresco necesario para la combustión.
      - Las rejillas **superiores** evacúan los gases viciados y livianos.
      Tapar estas aberturas viola la normativa NAG-200 de Camuzzi Gas del Sur y expone a los habitantes a una asfixia silenciosa.

      ### 3. Diferencia entre Tiro Balanceado e Infrarrojo
      - **Tiro Balanceado (TB):** Toma el oxígeno del exterior y expulsa los humos hacia afuera a través de un caño coaxial. Es el **único sistema permitido en dormitorios y baños**.
      - **Sin Salida / Infrarrojo:** Consume el oxígeno del propio ambiente. Solo está permitido en livings o comedores amplios que cuenten con ventilación permanente cruzada superior e inferior calculada por kilocalorías.

      ### 4. Qué exigirle al gasista matriculado
      Antes de iniciar la temporada de frío:
      1. Limpieza de inyectores y quemadores para eliminar hollín.
      2. Revisión de los conductos de evacuación (sombreretes en techos que el viento bahiense suele doblar o descalzar).
      3. Verificación de la válvula de seguridad (termocupla) que corta el paso de gas si la llama se apaga accidentalmente.
      4. Prueba de hermeticidad con columna de agua manométrica para descartar microfugas.

      **Teléfonos útiles en Bahía Blanca:**
      - Emergencias Camuzzi Gas del Sur: **0800-999-0810** / **0810-666-0810**
      - Defensa Civil Bahía Blanca: **103**
    `
  },
  {
    id: '2',
    slug: 'proteccion-electrica-cortes-tension-bahia',
    title: 'Cortes de luz y picos de tensión: Cómo blindar tu instalación con disyuntor y puesta a tierra',
    excerpt: 'Las tormentas eléctricas y variaciones en la red suelen quemar electrodomésticos costosos. Aprendé qué dispositivos salvan vidas y aparatos.',
    category: 'Electricidad',
    author: 'Mariano Rossi (Electricista Matriculado)',
    date: '15 Mar, 2026',
    readTime: '5 min',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
    tags: ['Electricidad', 'EDES', 'Seguridad', 'Disyuntor', 'Puesta a Tierra'],
    content: `
      En nuestra ciudad, las tormentas de verano y las maniobras de distribución de EDES pueden generar transitorios y subas de tensión bruscas que dañan heladeras Inverter, smart TVs y bombas de agua.

      ### 1. Termomagnética vs. Disyuntor Diferencial: No son lo mismo
      - **Llave Termomagnética (Térmica):** Protege los cables de la instalación contra recalentamiento y cortocircuitos. Si hay un consumo excesivo, corta para evitar incendios.
      - **Interruptor Diferencial (Disyuntor):** Protege la **vida humana**. Detecta si la corriente 'se fuga' a través del chasis de un electrodoméstico o al cuerpo de una persona y corta en milisegundos (sensibilidad de 30mA).

      ### 2. El botón de test: Probalo una vez al mes
      El disyuntor tiene un botón rotulado con la letra **'T'**. Al presionarlo debe saltar de inmediato cortando toda la luz. Si al presionar el botón la palanca no cae, el mecanismo interno está trabado o averiado y no brindará protección ante un choque eléctrico.

      ### 3. La jabalina de puesta a tierra
      Toda casa en Bahía Blanca debe tener instalada una jabalina cobreada de 1,5 metros enterrada en suelo natural con su correspondiente cámara de inspección y cable verde/amarillo conectado a las patas oblicuas de todos los tomacorrientes. Sin jabalina, el disyuntor pierde más del 60% de su capacidad preventiva.

      ### 4. Protectores de sobretensión y baja tensión
      Para cuidar lavarropas, heladeras y computadoras, instalá un protector de tensión en el tablero principal o protectores individuales enchufables. Estos equipos cortan la alimentación si el voltaje supera los 242V o desciende por debajo de 190V, y cuentan con un retardo de reconexión de 3 a 5 minutos para permitir que se estabilice el compresor de gas refrigerante.
    `
  },
  {
    id: '3',
    slug: 'presion-agua-canon-congelados-bahia',
    title: 'Agua en Bahía Blanca: Bombas presurizadoras en verano y cómo proteger caños de las heladas',
    excerpt: 'Guía práctica para lidiar con la fluctuación de presión de red de ABSA y evitar roturas de caños por congelamiento en patios y azoteas.',
    category: 'Plomería y Red',
    author: 'Claudio Benítez (Instalador Sanitario)',
    date: '12 Mar, 2026',
    readTime: '6 min',
    imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80',
    tags: ['Plomería', 'ABSA', 'Agua', 'Bombas', 'Heladas'],
    content: `
      La provisión de agua potable en Bahía Blanca presenta desafíos muy particulares: en los meses calurosos de diciembre a febrero la presión en barrios altos disminuye notablemente, mientras que en las madrugadas de invierno las heladas con temperaturas bajo cero revientan caños a la intemperie.

      ### 1. Por qué la bomba 'chupadora directa' está prohibida
      Conectar una bomba directamente al caño de entrada de ABSA está prohibido por ordenanza municipal. Esto succiona sedimentos de la red callejera, genera vacío y despresuriza a las casas linderas.
      - **La solución correcta y reglamentaria:** Cisterna a nivel del suelo o enterrada que recibe el agua de red sin presión forzada, y desde allí una bomba eleva automáticamente al tanque superior.

      ### 2. Aislación de cañerías exteriores contra heladas
      En barrios abiertos como Patagonia, Millamapu o Aldea Romana, el viento sur congela los tramos expuestos de caños de termofusión o PVC.
      - Al congelarse, el agua aumenta un 9% su volumen y quiebra codos y uniones roscadas.
      - **Recomendación:** Recubrir todos los caños exteriores con fundas aislantes de polietileno expandido (coquillas tubulares) o lana de vidrio envuelta en cinta aluminizada impermeable.

      ### 3. Cómo detectar pérdidas invisibles en tu domicilio
      Si la factura de agua llega con montos desmedidos:
      1. Dejá llenos el tanque y cisternas.
      2. Cerrá todas las canillas, lavarropas y válvulas de inodoros.
      3. Verificá si la aguja o ruedita del medidor exterior sigue girando lentamente. Si se mueve, existe una fisura oculta en la cañería subterránea o una descarga permanente en la mochila del baño.
    `
  },
  {
    id: '4',
    slug: 'humedad-cimientos-salitre-costero',
    title: 'Humedad de cimientos y salitre en paredes: Tratamientos definitivos para el clima de Bahía Blanca',
    excerpt: 'El salitre costero y la napa freática provocan desprendimientos de revoque. Técnicas efectivas para solucionar el problema antes de pintar.',
    category: 'Pintura y Humedad',
    author: 'Arq. Valeria Santos',
    date: '10 Mar, 2026',
    readTime: '7 min',
    imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Pintura', 'Humedad', 'Cimientos', 'Salitre', 'Impermeabilización'],
    content: `
      Por su proximidad con el estuario y la ría, gran parte de Bahía Blanca (Ingeniero White, Villa Rosas, Noroeste, Spurr) padece alta salinidad en suelos y napas poco profundas, manifestándose como eflorescencias blancas y desprendimiento de revoques en zócalos.

      ### 1. El grave error de pintar encima de la humedad
      Aplicar masilla o esmaltes impermeabilizantes sobre revoque húmedo con salitre solo 'tapa' la superficie durante unas pocas semanas. La presión de evaporación del agua dentro del muro buscará salir inflando y reventando la película de pintura.

      ### 2. Método de recuperación paso a paso
      Para solucionar el salitre de raíz:
      1. **Picar el revoque afectado:** Retirar revoque grueso y fino hasta llegar al ladrillo vivo, extendiendo la demolición unos 40 a 50 centímetros por encima de la marca más alta de humedad.
      2. **Neutralizar las sales:** Lavar el ladrillo con una solución de agua y ácido muriático al 10%, enjuagar con abundante agua dulce y dejar secar completamente.
      3. **Inyección hidrófuga:** Si la capa aisladora horizontal original falló, perforar la base de la pared a 45° cada 15 cm e inyectar siliconas hidrófugas para crear una nueva barrera química.
      4. **Revoque hidrófugo nuevo:** Rehacer el azotado con cemento, arena y aditivo hidrófugo (tipo Ceresita o Sika 1) sin agregado de cal en la primera capa.
      5. **Pintura transpirable:** Utilizar pinturas látex micro-porosas antihongos que permitan la evaporación del vapor interior.
    `
  },
  {
    id: '5',
    slug: 'como-contratar-profesionales-evitar-estafas',
    title: 'Guía para contratar oficios sin sorpresas: Presupuestos por escrito, señas seguras y garantías',
    excerpt: 'Claves indispensables para pactar trabajos de obra, mantenimiento o reparaciones sin riesgos económicos ni disputas.',
    category: 'Guía de Contratación',
    author: 'Equipo Legal & Mediaciones Bahía Oficios',
    date: '08 Mar, 2026',
    readTime: '6 min',
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    tags: ['Contratos', 'Presupuestos', 'Seguridad', 'Garantía', 'Consejos Legales'],
    content: `
      Contratar un servicio para tu hogar debe ser un proceso transparente y seguro. Para proteger tanto al cliente como al profesional que trabaja con honestidad, aplicá siempre estas 5 reglas de oro:

      ### 1. El esquema de pagos por hitos (Nunca 100% por adelantado)
      Una de las causas más frecuentes de abandono de obra o demoras injustificadas es haber pagado todo el importe antes de que el trabajo esté finalizado.
      - **30% de seña inicial:** Para acopio de insumos indispensables o reserva de fecha.
      - **30% a mitad de trabajo:** Previa verificación ocular del avance acordado.
      - **40% al finalizar:** Una vez que el cliente revisó las instalaciones, probó el correcto funcionamiento y dio su conformidad.

      ### 2. Compra de materiales: Transparencia total
      Siempre que sea posible, es recomendable que el dueño de la casa adquiera directamente los materiales en corralones o ferreterías con lista brindada por el profesional, o que el profesional entregue las facturas y comprobantes fiscales originales emitidos a nombre del cliente.

      ### 3. Presupuesto desglosado por escrito
      Un presupuesto formal debe detallar:
      - Tareas específicas incluidas y tareas expresamente excluidas.
      - Tiempo estimado de ejecución en días hábiles.
      - Plazo de garantía de la mano de obra ante desperfectos no atribuibles al mal uso.
      - Quién se encarga del retiro de escombros y limpieza de obra.

      ### 4. Mantener registro de acuerdos
      Utilizá el chat de Bahía Oficios o mensajería por escrito para confirmar fechas de inicio, modificaciones pedidas sobre la marcha y montos adicionales pactados. Los acuerdos verbales se prestan a confusiones.
    `
  },
  {
    id: '6',
    slug: 'preparacion-techos-temporales-viento',
    title: 'Techos y vientos de 80 km/h: Cómo preparar chapas, tejas y canaletas antes de las tormentas bahienses',
    excerpt: 'Bahía Blanca es una de las ciudades más ventosas del país. Consejos de fijación y drenaje para evitar voladuras y filtraciones graves.',
    category: 'Albañilería y Techos',
    author: 'Esteban Carrizo (Constructor y Techista)',
    date: '05 Mar, 2026',
    readTime: '5 min',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Techos', 'Viento', 'Tormentas', 'Chapas', 'Canaletas'],
    content: `
      Los temporales de viento y lluvia que azotan recurrentemente el sudoeste bonaerense ponen a prueba la estructura de los techos. Un mantenimiento preventivo dos veces al año evita daños estructurales mayúsculos.

      ### 1. Fijaciones y tornillos autoperforantes
      En techos de chapa trapezoidal o acanalada, el viento genera un efecto aerodinámico de succión ('levantamiento de ala').
      - Revisar periódicamente las arandelas de goma/neoprene vulcanizadas de los tornillos autoperforantes. Si el sol las resecó, el agua se filtrará por el orificio hacia los tirantes de madera oxidando la estructura.
      - Colocar tornillos en la **cresta superior de la onda**, nunca en el valle por donde corre el caudal de agua.

      ### 2. Cenefas perimetrales y babetas
      El 80% de las voladuras de techo se inician en los bordes y aleros cuando el viento 'embolsa' las chapas sueltas. Es imprescindible contar con babetas de chapa galvanizada doblada firmemente amuradas con tarugos y sellador poliuretánico (evitar selladores acéticos que atacan el zinc).

      ### 3. Limpieza de canaletas y embudos
      Antes de la temporada otoñal de vientos y hojas secas, limpiar a fondo canaletas y rejillas de desagües pluviales. Si la canaleta se desborda por hojas acumuladas, el agua ingresa hacia el cielorraso arruinando durlock o machimbre.
    `
  },
  {
    id: '7',
    slug: 'mantenimiento-aire-acondicionado-inverter',
    title: 'Aire Acondicionado e Inverter: Mantenimiento anual y cómo ahorrar hasta un 40% de electricidad',
    excerpt: 'La suciedad en serpentinas y turbinas duplica el consumo eléctrico. Paso a paso para alargar la vida útil de tu equipo.',
    category: 'Climatización',
    author: 'Juan Pérez (Técnico en Refrigeración)',
    date: '02 Mar, 2026',
    readTime: '5 min',
    imageUrl: 'https://images.unsplash.com/photo-1599939571322-792a326991f2?auto=format&fit=crop&w=1200&q=80',
    tags: ['Aire Acondicionado', 'Inverter', 'Ahorro Eléctrico', 'Mantenimiento'],
    content: `
      Los aires acondicionados split y de tecnología Inverter son electrodomésticos de alta eficiencia, pero su rendimiento depende directamente de la limpieza de sus componentes térmicos.

      ### 1. Limpieza de filtros interiores: fácil y esencial
      Al menos una vez al mes durante el período de uso intensivo:
      - Abrir la tapa frontal del split y retirar las mallas plásticas.
      - Lavarlas bajo la canilla con agua tibia y jabón neutro.
      - Dejarlas secar a la sombra (el sol directo puede deformar la matriz de nylon).
      - Colocar filtros limpios mejora la calidad del aire respirable y evita que el forzador trabaje sobrecargado.

      ### 2. Ménsulas de unidad exterior reforzadas contra el viento
      En Bahía Blanca, la unidad exterior (condensador) instalada en paredes altas o azoteas sufre ráfagas extremas.
      - Es fundamental que las ménsulas metálicas estén fijadas con tacos químicos o varillas roscadas pasantes con arandela plana y contratuerca.
      - Colocar tacos de goma antivibratorios entre las patas del equipo y la ménsula para evitar ruidos molestos transmitidos a los dormitorios.

      ### 3. El mito de la 'recarga de gas anual'
      Un equipo de aire acondicionado bien instalado posee un circuito sellado de cobre soldado por pestañado hermético: **el gas no se gasta ni se vence con el tiempo**. Si el equipo no enfría, existe una pérdida activa que debe localizarse con nitrógeno y espuma antes de rellenar refrigerante.
    `
  },
  {
    id: '8',
    slug: 'seguridad-cerraduras-puertas-bahia',
    title: 'Cerrajería doméstica: Cilindros de seguridad, cerraduras multipunto y qué hacer si se traba la llave',
    excerpt: 'Cómo prevenir roturas de cerrojos y reforzar los accesos principales de tu casa o departamento en Bahía Blanca.',
    category: 'Cerrajería y Alarmas',
    author: 'Martín Almada (Cerrajería de Precisión)',
    date: '28 Feb, 2026',
    readTime: '4 min',
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80',
    tags: ['Cerrajería', 'Seguridad', 'Cerraduras', 'Hogar'],
    content: `
      El acceso a tu vivienda es la primera línea de protección de tu familia y bienes. Muchos problemas mecánicos en cerraduras pueden evitarse con un mantenimiento simple y correcto.

      ### 1. Qué lubricante usar (y cuál está terminantemente prohibido)
      - **PROHIBIDO:** Colocar aceite de cocina, grasa comestible o aerosol multiuso convencional dentro del tambor de la llave. El aceite atrae polvillo ambiental, forma una pasta abrasiva y traba los pernos internos de bronce.
      - **CORRECTO:** Usar únicamente **grafito en polvo seco** soplado directamente en el orificio de la llave. El grafito lubrica en seco sin empastar.

      ### 2. Cilindros Europerfil de Seguridad
      Las cerraduras tradicionales de doble paleta o cilindros convencionales son vulnerables al método de ganzúa o rotura por palanca.
      - Es recomendable instalar cilindros con llave computada y sistema **anti-rotura programada (anti-snap)**, que evita que fracturen el cuerpo del cilindro desde afuera.
      - Colocar un escudo protector macizo de acero cementado en la cara exterior de la puerta.

      ### 3. Si la llave se rompe adentro
      No golpees ni intentes empujar el fragmento con otra llave, ya que terminarás calzando el pedazo partido al fondo del bombillo. Si asoma algún milímetro, sujetalo con una pinza de punta fina tirando firmemente en la posición neutra de giro. Si no sale, contactá a un cerrajero matriculado para desarmar el cuerpo sin dañar la hoja de la puerta.
    `
  },
  {
    id: '9',
    slug: 'grietas-paredes-suelos-arcillosos',
    title: 'Suelos arcillosos en Bahía Blanca: Cómo diferenciar grietas de revoque de fallas estructurales',
    excerpt: 'En barrios como Patagonia, Palihue o Harding Green, las arcillas expansivas mueven cimientos. Aprendé a monitorear rajaduras.',
    category: 'Albañilería y Techos',
    author: 'Ing. Civil Fernando Díaz',
    date: '24 Feb, 2026',
    readTime: '6 min',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    tags: ['Estructuras', 'Grietas', 'Cimientos', 'Suelos', 'Construcción'],
    content: `
      En diversas áreas geográficas de Bahía Blanca predominan los suelos con alto porcentaje de arcillas expansivas. Este tipo de suelo se hincha notablemente cuando se satura de agua de lluvia y se contrae drásticamente en épocas de sequía, generando tensiones sobre las fundaciones de las viviendas.

      ### 1. Grieta de revoque vs. Grieta estructural
      - **Fisuras superficiales en tela de araña:** Tienen menos de 0,5 mm de espesor y solo afectan la capa de enlucido de yeso o revoque fino por secado acelerado o retracción térmica. No revisten peligro estructural.
      - **Grietas a 45 grados en dinteles y esquinas de puertas o ventanas:** Cruzan el espesor del ladrillo y suelen ensancharse hacia arriba o abajo. Revelan que una zapata o viga de encadenado ha sufrido un asentamiento diferencial.

      ### 2. El método del testigo de yeso
      Si detectás una grieta preocupante en una pared portante:
      1. Prepará una pequeña tira de yeso blanco puro de 1 cm de espesor y aplicala cruzando la grieta como un parche puente.
      2. Marcá la fecha con lápiz.
      3. Si a los 15 o 30 días el yeso se fisura y se parte, la grieta está **activa y en movimiento**, lo que requiere consulta inmediata con un ingeniero civil o calculista para evaluar recalces o pilotines.
      4. Si el yeso permanece intacto durante meses, el asentamiento ya se estabilizó y se puede reparar la abertura con llaves de hierro y mortero estructural.

      ### 3. Cuidado con los desagües pluviales
      La regla de oro en suelos bahienses es canalizar las bajadas pluviales y el agua de riego lejos del perímetro de los muros. Una filtración constante en una vereda o cantero reblandece la arcilla y origina el descenso de la esquina más pesada de la casa.
    `
  },
  {
    id: '10',
    slug: 'verificacion-matriculas-oficiales',
    title: 'Paso a paso: Cómo corroborar la matrícula de un gasista o electricista en los registros oficiales',
    excerpt: 'Evitá multas de corte de suministro o instalaciones peligrosas verificando la vigencia de la credencial habilitante.',
    category: 'Guía de Contratación',
    author: 'Colegio de Técnicos & Bahía Oficios',
    date: '20 Feb, 2026',
    readTime: '4 min',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    tags: ['Matrículas', 'Habilitaciones', 'Camuzzi', 'Colegio de Técnicos'],
    content: `
      En profesiones críticas donde está en juego la seguridad física (electricidad, gas, estructuras), es responsabilidad ineludible del usuario verificar que el profesional posea matrícula habilitante activa ante el ente regulador o colegio profesional correspondiente.

      ### 1. Gasistas Matriculados (Camuzzi Gas del Sur / ENARGAS)
      Existen tres categorías de gasistas:
      - **1° Categoría:** Habilitados para instalaciones de cualquier potencia y tipo (domiciliarias, comerciales e industriales).
      - **2° Categoría:** Habilitados para instalaciones unifamiliares de hasta cierto límite de consumo.
      - **3° Categoría:** Solo habilitados para artefactos individuales o gas envasado menor.
      Podés corroborar la matrícula oficial directamente en la oficina de Camuzzi en Bahía Blanca o en su padrón digital público solicitando el DNI y número de credencial del instalador.

      ### 2. Electricistas e Instaladores Electrotécnicos
      Deben estar inscriptos en el **Colegio de Técnicos de la Provincia de Buenos Aires (Distrito VI - Bahía Blanca)** o Colegio de Ingenieros (CIPBA).
      - Exigí que te muestren la credencial física anual con sticker o código QR de habilitación vigente.
      - Recordá que las empresas distribuidoras como EDES S.A. exigen el Certificado de Aptitud Eléctrica firmado por un profesional con matrícula vigente para dar el alta de un medidor nuevo.
    `
  },
  {
    id: '11',
    slug: 'colocacion-ceramicos-porcelanatos',
    title: 'Porcelanatos y cerámicos: Por qué se levantan los pisos y qué pegamento exige la amplitud térmica',
    excerpt: 'La gran variación de temperatura en nuestra zona dilata los pisos. Claves para colocar juntas y pegamentos impermeables.',
    category: 'Pintura y Humedad',
    author: 'Daniel Navarro (Colocador Profesional)',
    date: '16 Feb, 2026',
    readTime: '5 min',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    tags: ['Pisos', 'Porcelanato', 'Pegamentos', 'Construcción'],
    content: `
      Uno de los reclamos más frecuentes en obras residenciales es el levantamiento súbito ('efecto carpa') de placas de porcelanato meses o años después de ser colocadas.

      ### 1. La absorción de agua: Porcelanato vs. Cerámica común
      - La cerámica tradicional tiene porosidad y absorbe agua, por lo que pega con morteros cementicios comunes.
      - El porcelanato es prácticamente vítreo y no absorbe agua (absorción menor al 0,5%). **Requiere adhesivo flexible enriquecido con resinas sintéticas** (tipo Klaukol Blanco Pro o similares). Si se usa adhesivo común, las piezas se despegarán con los primeros cambios térmicos.

      ### 2. La trampa de colocar 'a hueso' (sin junta)
      Muchos propietarios solicitan pegar las placas pegadas una contra otra sin espacio intermedio para lograr un aspecto continuo.
      - En Bahía Blanca, la amplitud térmica (días de 38°C en verano y noches de -4°C en invierno) provoca dilataciones inevitables.
      - Sin juntas de al menos **2 mm a 3 mm en interiores** y **5 mm en exteriores**, las piezas no tienen espacio para expandirse, chocan entre sí y se levantan en bloque partiendo el material.
    `
  },
  {
    id: '12',
    slug: 'botiquin-emergencias-domesticas',
    title: 'Botiquín de emergencias del hogar: Llaves maestras, tableros y números de guardia en Bahía Blanca',
    excerpt: 'Qué debe saber cada integrante de la familia para actuar en los primeros 3 minutos ante una fuga, corte o inundación.',
    category: 'Seguridad y Gas',
    author: 'Defensa del Hogar Bahía',
    date: '10 Feb, 2026',
    readTime: '5 min',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
    tags: ['Emergencias', 'Seguridad', 'Teléfonos Útiles', 'Hogar', 'Bahía Blanca'],
    content: `
      En caso de una contingencia doméstica (rotura de un caño maestro, olor penetrante a gas o chispazo en un enchufe), los primeros 180 segundos determinan si el hecho queda en una anécdota o deriva en un siniestro grave.

      ### 1. Las 3 llaves que todos en la casa deben saber cerrar
      1. **Llave de corte de gas general:** Ubicada habitualmente en el gabinete del medidor sobre la línea municipal o en la entrada de la vivienda. La manija perpendicular al caño indica corte cerrado.
      2. **Llave de paso general de agua:** Suele ubicarse bajo la bacha de la cocina o en la vereda. Es aconsejable girarla suavemente dos veces al año para evitar que el sarro la atasque.
      3. **Disyuntor general de electricidad:** Debe estar señalizado con cartelería clara y sin obstáculos que impidan el acceso inmediato a oscuras.

      ### 2. Guía rápida de emergencias Bahía Blanca
      Tené estos números agendados en tu teléfono:
      - **Defensa Civil Bahía Blanca:** 103
      - **Bomberos:** 100
      - **Policía / Comando de Patrullas:** 911
      - **SAME Emergencias Médicas:** 107
      - **Camuzzi Gas (Fugas en red o medidor):** 0800-999-0810
      - **EDES (Cables caídos o peligro en vía pública):** 0800-999-3337
      - **ABSA Bahía Blanca (Roturas de red de agua):** 0800-999-2272
      - **Hospital Municipal Leónidas Lucero:** (0291) 459-8484
    `
  }
];

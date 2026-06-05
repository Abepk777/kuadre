# Plan de Implementación: Landing Page (Astro) para Kuadre

Este documento contiene las especificaciones técnicas y de diseño para la creación del sitio web público (Landing Page) de Kuadre utilizando **Astro**. El objetivo es mantener una cohesión visual perfecta con la aplicación web principal (`app.kuadre.krecit.com`), reutilizando la misma paleta de colores, tipografía y estilo general (Glassmorphism, Modo Oscuro/Claro nativo).

## 1. Arquitectura y Stack Tecnológico
- **Framework:** Astro (SSG para máximo rendimiento SEO y velocidad).
- **Estilos:** Tailwind CSS v4 (misma configuración que el panel).
- **Iconos:** Lucide React (vía `@astrojs/react` o SVG directo) o cualquier paquete de iconos compatible con Astro.
- **Tipografía:** Inter (Google Fonts).

## 2. Guía de Estilos (Copiar a `src/styles/global.css` en Astro)
Para asegurar que los botones, fondos y textos sean idénticos, utiliza las siguientes variables CSS y configuración base de Tailwind v4:

```css
@import "tailwindcss";

@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-border: hsl(var(--border));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221 83% 53%; /* Azul Rey */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 210 10% 8%; 
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 210 10% 15%;
    --secondary-foreground: 210 40% 98%;
    --muted: 210 10% 15%;
    --muted-foreground: 215 20.2% 65.1%;
    --card: 210 10% 11%;
    --card-foreground: 210 40% 98%;
    --border: 210 10% 18%;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground transition-colors duration-300;
    font-family: 'Inter', system-ui, sans-serif;
  }
}
```

## 3. Estructura de Secciones (Páginas)

### A. Navegación (Header)
- Logo de Kuadre a la izquierda.
- Enlaces centrales: Características, Precios, Contacto.
- Derecha: Botón secundario `Ir al Panel` (`https://app.kuadre.krecit.com/login`) y botón primario `Pruébalo Gratis` (`https://app.kuadre.krecit.com/register`).
- Clases recomendadas: `fixed w-full backdrop-blur-md bg-background/80 border-b border-border z-50`.

### B. Hero Section
- **Titular:** "El Punto de Venta Inteligente para Venezuela"
- **Subtítulo:** "Funciona sin internet, maneja múltiples monedas y automatiza tus facturas por WhatsApp."
- **CTAs:** `Comenzar 7 días gratis` (bg-primary) y `Ver Demostración` (bg-secondary).
- **Visual:** Imagen o mockup estilo Dashboard flotando con sombra (`shadow-2xl shadow-primary/20`).

### C. Características Principales (Bento Grid)
Usar tarjetas estilo `bg-card border border-border rounded-2xl p-6 hover:-translate-y-1 transition-transform`
1. **Offline-First:** Sigue cobrando sin conexión.
2. **Multi-Moneda Dinámico:** Convierte de $ a Bs al vuelo usando BCV o Paralelo.
3. **Bot de WhatsApp:** Sistema EvolutionAPI integrado para recibos digitales.
4. **Hardware Flexible:** Imprime en Bluetooth o USB directamente.

### D. Sección de Precios
- Tabla simple. Destacar la capa "7 días gratis".
- Botón directo hacia el registro del SaaS.

### E. Footer
- Enlaces de interés (Términos, Privacidad).
- Firma de agua: `Impulsado por KRECIT` vinculando a `krecit.com`.

## 4. Notas de Integración
- No es necesario manejar estados complejos (`useState`) en la Landing Page, a menos que se use un componente React de "Toggle Dark Mode" incrustado en Astro (mediante `client:load`).
- Los enlaces de registro e inicio de sesión deben usar rutas absolutas apuntando al subdominio del panel: `https://app.kuadre.krecit.com/login` y `https://app.kuadre.krecit.com/register`.

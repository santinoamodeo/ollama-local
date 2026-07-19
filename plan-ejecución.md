# Plan de Ejecución — Chatbot Interno

## Fase 1: Experiencia básica de chat (prioridad alta)
1. Renderizado de Markdown en las respuestas (negrita, títulos, listas)
2. Resaltado de sintaxis para bloques de código
3. Botón de copiar respuesta / copiar bloque de código
4. Botón de detener generación en curso (stop)

## Fase 2: Gestión de conversaciones
5. Múltiples chats (sidebar): crear, cambiar entre, eliminar conversaciones
6. Selector de modelo (dropdown) para elegir entre los modelos disponibles

## Fase 3: Control de acceso y uso
7. Login básico interno (usuario/contraseña, con vista a SSO Azure AD a futuro)
8. Registro de uso/logs básicos (quién, cuándo, sin contenido sensible)

## Fase 4: Funcionalidad avanzada
9. Subida de archivos (PDF/TXT) para consultas sobre su contenido

## Fase 5: Pulido visual
10. Avatares diferenciados usuario/IA, indicador de "escribiendo..." animado, tema claro/oscuro
11. Indicador de tiempo de respuesta / métricas visibles

## Orden sugerido de implementación
Markdown (1) → Múltiples chats (5) → Selector de modelo (6) → Subida de archivos (9) → resto en paralelo según tiempo disponible.
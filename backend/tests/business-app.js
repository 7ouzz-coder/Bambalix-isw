import express from 'express';
import { createApp } from '../src/app.js';
import { equipmentRoutes } from '../src/routes/equipos.routes.js';
import { permissions } from '../src/schemas/sesiones.schema.js';
// Adaptador de las suites de negocio anteriores: no acredita autenticación real.
// La sesión, CSRF y los bloqueos reales se prueban sin él en sesiones.integration.test.js.
export function createBusinessTestApp(options) {
  if (process.env.NODE_ENV !== 'test') throw new Error('Adaptador exclusivo de pruebas');
  const app = express();
  app.use(express.json());
  const equipment = equipmentRoutes(options.db);
  // Ejercita el intercambio subyacente, sin publicar su ruta en la aplicación real.
  app.use('/api/v1/operations/resources', (req, res, next) => {
    if (req.method === 'PATCH' && req.path.endsWith('/decision')) return equipment(req, res, next);
    next();
  });
  app.use(createApp({ ...options,
    sessionMiddleware(req, _res, next) { req.user = { ...req.user, role: req.user?.role || 'INTERNO', authenticated: true, permissions }; next(); },
    csrfMiddleware(_req, _res, next) { next(); },
  }));
  return app;
}

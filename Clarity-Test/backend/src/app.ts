import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth';
import filesRoutes from './routes/files';
import adminRoutes from './routes/admin';
import permissionsRoutes from './routes/permissions';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import './db';

const app = express();

// Load OpenAPI spec
const specPath = path.join(__dirname, '..', 'openapi.yaml');
let swaggerDoc: any = null;
try {
  if (fs.existsSync(specPath)) {
    const raw = fs.readFileSync(specPath, 'utf8');
    swaggerDoc = yaml.load(raw);
    console.log('OpenAPI spec loaded successfully');
  } else {
    console.error('OpenAPI spec NOT found at:', specPath);
  }
} catch (err) {
  console.error('Failed to load OpenAPI spec:', err);
}

// CORS configuration
app.use(cors());

// Aplicar bodyParser.json() PRIMERO para todas las rutas que lo necesiten
app.use(bodyParser.json());

// Rutas de autenticación y admin deben ir primero
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/permissions', permissionsRoutes);

// Ruta de archivos (se encarga internamente de no usar bodyParser donde no debe)
app.use('/api/files', filesRoutes);

if (swaggerDoc) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  // Redirect /docs to /docs/ to ensure assets load correctly
  app.get('/docs', (req, res) => res.redirect('/docs/'));
}

app.get('/', (req, res) => res.json({ status: 'Clarity backend running' }));

export default app;

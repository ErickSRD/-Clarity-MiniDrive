import express from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const specPath = path.join(__dirname, '..', '..', 'openapi.yaml');
let doc: any = {};
try {
  const raw = fs.readFileSync(specPath, 'utf8');
  doc = yaml.load(raw) as any;
} catch (err) {
  console.error('Failed to load OpenAPI spec from:', specPath, err);
}

router.use('/', swaggerUi.serve);
router.get('/', (req, res) => {
  res.send(swaggerUi.generateHTML(doc));
});

export default router;

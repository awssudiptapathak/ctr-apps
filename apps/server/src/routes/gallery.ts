import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware.js';

const router = Router();

function mapImage(row: any) {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    imageUrl: row.image_url,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
  };
}

router.get('/', async (_req, res) => {
  const rows = await query<any>(
    `SELECT * FROM public.gallery_images WHERE active = true
      ORDER BY sort_order ASC, created_at DESC`,
  );
  return res.json({ images: rows.map(mapImage) });
});

router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthedRequest, res) => {
  const { imageUrl, title, caption, sortOrder } = req.body || {};
  if (!imageUrl || typeof imageUrl !== 'string' || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(imageUrl)) {
    return res.status(400).json({ error: 'imageUrl must be a base64 data image' });
  }
  const sizeBytes = Math.ceil((imageUrl.length - imageUrl.indexOf(',') - 1) * 0.75);
  if (sizeBytes <= 0 || sizeBytes > 4 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image must be smaller than 4 MB.' });
  }
  const mimeType = imageUrl.slice(5, imageUrl.indexOf(';'));
  const row = await queryOne<any>(
    `INSERT INTO public.gallery_images (title, caption, image_url, mime_type, size_bytes, sort_order, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title?.trim() || null, caption?.trim() || null, imageUrl, mimeType, sizeBytes, Number(sortOrder) || 0, req.userId],
  );
  await query(
    `DELETE FROM public.gallery_images
      WHERE id IN (
        SELECT id FROM public.gallery_images
         WHERE active = true
         ORDER BY created_at DESC
         OFFSET 50
      )`,
  );
  return res.status(201).json({ image: mapImage(row) });
});

router.delete('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const row = await queryOne<any>(
    'DELETE FROM public.gallery_images WHERE id = $1 RETURNING id',
    [req.params.id],
  );
  if (!row) return res.status(404).json({ error: 'Gallery image not found' });
  return res.status(204).end();
});

export default router;

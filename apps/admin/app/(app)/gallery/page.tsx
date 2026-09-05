'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type GalleryImage = { id: string; title: string | null; caption: string | null; imageUrl: string; sortOrder: number };

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState('');

  const load = () => api.get<{ images: GalleryImage[] }>('/gallery').then((data) => setImages(data.images)).catch((error: any) => setMessage(error.message));
  useEffect(() => {
    void load();
  }, []);

  const upload = async () => {
    if (!imageUrl) return setMessage('Choose an image first.');
    try {
      const result = await api.post<{ image: GalleryImage }>('/gallery', { imageUrl, title, caption, sortOrder: images.length });
      setImages((current) => [result.image, ...current].slice(0, 50));
      setImageUrl(''); setTitle(''); setCaption(''); setMessage('Image uploaded.');
    } catch (error: any) { setMessage(error.message); }
  };

  const remove = async (id: string) => {
    await api.delete(`/gallery/${id}`);
    setImages((current) => current.filter((image) => image.id !== id));
  };

  return <main style={{ minHeight: '100vh', padding: '2rem 1.25rem', color: '#fff7ea', background: 'linear-gradient(180deg,#1a0b0f,#3b1318)' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ color: '#f9d27a', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Content</div><h1>Festival gallery</h1></div><Link href="/dashboard" style={{ color: '#f7d980' }}>Back to dashboard</Link></header>
      {message ? <p>{message}</p> : null}
      <section style={{ ...panelStyle, marginTop: 20 }}>
        <h2>Upload gallery image</h2>
        <p>Maximum 50 active images are kept. Older images are removed automatically when the limit is exceeded.</p>
        <input type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0]; if (!file) return;
          if (file.size > 4 * 1024 * 1024) return setMessage('Image must be smaller than 4 MB.');
          const reader = new FileReader(); reader.onload = () => setImageUrl(String(reader.result)); reader.readAsDataURL(file);
        }} />
        <input placeholder="Title (optional)" value={title} onChange={(event) => setTitle(event.target.value)} style={fieldStyle} />
        <input placeholder="Caption (optional)" value={caption} onChange={(event) => setCaption(event.target.value)} style={fieldStyle} />
        <button type="button" onClick={upload} style={buttonStyle}>Upload image</button>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, marginTop: 20 }}>
        {images.map((image) => <article key={image.id} style={panelStyle}><img src={image.imageUrl} alt={image.title || 'Gallery'} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12 }} /><strong>{image.title || 'Untitled'}</strong><p>{image.caption}</p><button type="button" onClick={() => remove(image.id)} style={{ ...buttonStyle, background: '#ef4444' }}>Remove</button></article>)}
      </section>
    </div>
  </main>;
}

const panelStyle: React.CSSProperties = { background: 'rgba(20,11,13,0.8)', border: '1px solid rgba(249,210,122,0.35)', borderRadius: 18, padding: '1rem' };
const fieldStyle: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', margin: '0.8rem 0', padding: '0.7rem', borderRadius: 10 };
const buttonStyle: React.CSSProperties = { border: 0, borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 800, background: 'linear-gradient(135deg,#f4d383,#c77921)', cursor: 'pointer' };

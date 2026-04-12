'use client';

import { useState, FormEvent } from 'react';

export default function HomePage() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timezone, setTimezone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthTime,
          birthLocation: {
            latitude: Number(latitude),
            longitude: Number(longitude),
            timezone,
          },
        }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? 'Checkout failed');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError('No checkout URL returned');
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">HD Translators</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span>Birth date (YYYY-MM-DD)</span>
          <input
            className="border rounded px-3 py-2"
            name="birthDate"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Birth time (HH:MM:SS)</span>
          <input
            className="border rounded px-3 py-2"
            name="birthTime"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Latitude</span>
          <input
            className="border rounded px-3 py-2"
            name="latitude"
            type="text"
            inputMode="decimal"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Longitude</span>
          <input
            className="border rounded px-3 py-2"
            name="longitude"
            type="text"
            inputMode="decimal"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Timezone (IANA)</span>
          <input
            className="border rounded px-3 py-2"
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {submitting ? 'Redirecting…' : 'Get My Reading — $9'}
        </button>
      </form>
    </main>
  );
}

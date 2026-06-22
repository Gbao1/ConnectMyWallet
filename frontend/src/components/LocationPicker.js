import { useEffect, useMemo, useState } from 'react';
import { fetchLocations } from '../api/services';

/**
 * Australian location picker backed by GET /api/locations.
 */
export default function LocationPicker({ value, onChange, className = '' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(value?.state || '');
  const [city, setCity] = useState(value?.city || '');
  const [suburb, setSuburb] = useState(value?.suburb || '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const locs = await fetchLocations();
        if (!cancelled) setData(Array.isArray(locs) ? locs : []);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => {
    const row = data.find((s) => s.state === state);
    return row?.cities || [];
  }, [data, state]);

  const suburbs = useMemo(() => {
    const row = cities.find((c) => c.city === city);
    return row?.suburbs || [];
  }, [cities, city]);

  useEffect(() => {
    if (!state || !city) return;
    onChange?.({
      type: 'physical',
      country: 'Australia',
      state,
      city,
      suburb,
      address: suburb ? `${suburb}, ${city}, ${state}` : `${city}, ${state}`,
    });
  }, [state, city, suburb, onChange]);

  if (loading) {
    return <p className={`text-xs text-gray-500 ${className}`}>Loading locations…</p>;
  }

  if (data.length === 0) return null;

  return (
    <div className={`grid gap-2 sm:grid-cols-3 ${className}`}>
      <select
        value={state}
        onChange={(e) => {
          setState(e.target.value);
          setCity('');
          setSuburb('');
        }}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
      >
        <option value="">State</option>
        {data.map((s) => (
          <option key={s.state} value={s.state}>
            {s.state}
          </option>
        ))}
      </select>
      <select
        value={city}
        onChange={(e) => {
          setCity(e.target.value);
          setSuburb('');
        }}
        disabled={!state}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
      >
        <option value="">City</option>
        {cities.map((c) => (
          <option key={c.city} value={c.city}>
            {c.city}
          </option>
        ))}
      </select>
      <select
        value={suburb}
        onChange={(e) => setSuburb(e.target.value)}
        disabled={!city}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
      >
        <option value="">Suburb</option>
        {suburbs.map((sub) => (
          <option key={sub} value={sub}>
            {sub}
          </option>
        ))}
      </select>
    </div>
  );
}

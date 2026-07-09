'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Map, Marker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import { useJobs } from '@/hooks/useJobs';
import { StatusBadge } from '@/components/StatusBadge';
import { MAP_STYLE_URL } from '@/lib/map-style';
import type { Job } from '@/lib/types';

type LocatedJob = Job & { locationLat: number; locationLng: number };

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#9CA3AF',
  IN_PROGRESS: '#2563EB',
  COMPLETED: '#16A34A',
  CANCELLED: '#DC2626',
};

export function JobMap() {
  const { data: jobs, isLoading, isError } = useJobs();
  const [selected, setSelected] = useState<LocatedJob | null>(null);

  const located = useMemo(
    () => (jobs ?? []).filter((job): job is LocatedJob => job.locationLat != null && job.locationLng != null),
    [jobs],
  );

  const initialViewState = useMemo(() => {
    if (located.length === 0) return { longitude: -122.4194, latitude: 37.7749, zoom: 10 };
    const avgLat = located.reduce((sum, job) => sum + job.locationLat, 0) / located.length;
    const avgLng = located.reduce((sum, job) => sum + job.locationLng, 0) / located.length;
    return { longitude: avgLng, latitude: avgLat, zoom: 11 };
  }, [located]);

  if (isLoading) return <p className="p-6 text-sm text-gray-400">Loading map…</p>;
  if (isError) return <p className="p-6 text-sm text-red-600">Could not load jobs.</p>;

  return (
    <Map initialViewState={initialViewState} mapStyle={MAP_STYLE_URL} style={{ width: '100%', height: '100%' }}>
      <NavigationControl position="top-right" />
      {located.map((job) => (
        <Marker
          key={job.id}
          longitude={job.locationLng}
          latitude={job.locationLat}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelected(job);
          }}
        >
          <span
            className="block h-4 w-4 cursor-pointer rounded-full border-2 border-white shadow"
            style={{ backgroundColor: STATUS_COLOR[job.status] ?? '#9CA3AF' }}
          />
        </Marker>
      ))}
      {selected ? (
        <Popup
          longitude={selected.locationLng}
          latitude={selected.locationLat}
          onClose={() => setSelected(null)}
          closeOnClick={false}
          anchor="bottom"
        >
          <div className="min-w-[180px] space-y-1.5 p-1">
            <p className="text-sm font-semibold text-gray-900">{selected.title}</p>
            {selected.description ? <p className="text-xs text-gray-500">{selected.description}</p> : null}
            <StatusBadge status={selected.status} />
            <p className="text-xs text-gray-500">{selected.assignee?.name ?? 'Unassigned'}</p>
            <Link
              href={`/submissions?jobId=${selected.id}`}
              className="block pt-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              View submissions →
            </Link>
          </div>
        </Popup>
      ) : null}
    </Map>
  );
}

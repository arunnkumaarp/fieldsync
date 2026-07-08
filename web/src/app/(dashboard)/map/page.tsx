import { JobMap } from '@/components/JobMap';

export default function JobMapPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-8 py-4">
        <h1 className="text-xl font-bold text-gray-900">Job map</h1>
        <p className="mt-1 text-sm text-gray-500">Click a pin for job details and to jump to its submissions.</p>
      </div>
      <div className="flex-1">
        <JobMap />
      </div>
    </div>
  );
}

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { HDProfile } from '@/lib/hd-engine/types';

type Props = {
  params: { orderId: string };
};

function isHdProfileJson(value: unknown): value is HDProfile {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.type === 'string' &&
    typeof o.authority === 'string' &&
    typeof o.profile === 'string' &&
    Array.isArray(o.definedCenters)
  );
}

export default async function ResultPage({ params }: Props) {
  const orderId = params.orderId;
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* Server Component cookie writes are not always available */
          }
        },
      },
    }
  );

  const { data: row, error } = await supabase
    .from('hd_profiles')
    .select('profile_json')
    .eq('order_id', orderId)
    .maybeSingle();

  const profileJson = row?.profile_json;
  const profile = isHdProfileJson(profileJson) ? profileJson : null;

  if (error || !profile) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <p className="mb-4">Your reading is being prepared. Check your email shortly.</p>
        <p className="text-sm text-gray-600">
          Order ID: <span className="font-mono break-all">{orderId}</span>
        </p>
      </main>
    );
  }

  const centers = profile.definedCenters.join(', ');

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-lg font-medium mb-4">Your chart is ready</h1>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-gray-600">Type</dt>
          <dd>{profile.type}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Authority</dt>
          <dd>{profile.authority}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Profile</dt>
          <dd>{profile.profile}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Defined centers</dt>
          <dd>{centers}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-gray-600">
        Order ID: <span className="font-mono break-all">{orderId}</span>
      </p>
    </main>
  );
}

import { useQuery } from '@tanstack/react-query';
import { discoverPublicEvents } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useDiscoverPublicEvents() {
    return useQuery({
        queryKey: qk.discoverPublicEvents(),
        queryFn: discoverPublicEvents,
    });
}

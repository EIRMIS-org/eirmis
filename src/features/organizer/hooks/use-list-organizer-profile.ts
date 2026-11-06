import { useQuery } from '@tanstack/react-query';
import { getOrganizerProfile } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function useListOrganizerProfile() {
    return useQuery({
        queryKey: qk.getOrganizerProfile(),
        queryFn: getOrganizerProfile,
    });
}

export const useGetOrganizerProfile = useListOrganizerProfile;

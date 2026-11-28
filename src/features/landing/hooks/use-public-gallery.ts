import { useQuery } from '@tanstack/react-query';
import { listPublicGalleryImages } from '@/lib/api';
import { qk } from '@/lib/api/query-keys';

export function usePublicGallery(eventId: string) {
    return useQuery({
        queryKey: qk.listPublicGalleryImages(eventId),
        queryFn: () => listPublicGalleryImages(eventId),
    });
}

export const useListPublicGalleryImages = usePublicGallery;

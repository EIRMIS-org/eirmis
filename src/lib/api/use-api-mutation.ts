import {
    useMutation,
    useQueryClient,
    type MutationFunction,
    type QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './index';

function errorDescription(error: unknown): string | undefined {
    if (!(error instanceof ApiError)) {
        return error instanceof Error ? error.message : undefined;
    }

    return [error.details, error.hint].filter(Boolean).join(' — ') || undefined;
}

interface MutationCallbacks<TData, TVariables> {
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: unknown, variables: TVariables) => void | Promise<void>;
}

export function useApiMutation<TData, TVariables>(
    mutationFn: MutationFunction<TData, TVariables>,
    invalidationKeys: readonly QueryKey[],
    successMessage: string,
    options?: MutationCallbacks<TData, TVariables>,
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onSuccess: async (data, variables) => {
            toast.success(successMessage);
            await Promise.all(
                invalidationKeys.map((queryKey) =>
                    queryClient.invalidateQueries({ queryKey }),
                ),
            );
            await options?.onSuccess?.(data, variables);
        },
        onError: async (error, variables) => {
            toast.error(
                error instanceof ApiError ? error.message : 'Request failed',
                { description: errorDescription(error) },
            );
            await options?.onError?.(error, variables);
        },
    });
}

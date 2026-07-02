import { useQuery } from '@tanstack/react-query';
import { listPharmacists } from '../api/pharmacists';
import * as pharmacistsLocalRepository from '../services/pharmacistsLocalRepository';
import { queryKeys } from '../api/queryKeys';
import type { IPharmacist } from '../types';

export function usePharmacists() {
  return useQuery<IPharmacist[]>({
    queryKey: queryKeys.pharmacists,
    queryFn: async () => {
      try {
        const result = await listPharmacists();
        await pharmacistsLocalRepository.save(result);
        return result;
      } catch {
        return pharmacistsLocalRepository.list();
      }
    }
  });
}

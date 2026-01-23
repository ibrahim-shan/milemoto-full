import { z } from 'zod';
import { CreateCountry } from '@milemoto/types';

// Re-export shared schemas/types for convenience in the backend
export {
  CreateCountry,
  UpdateCountry,
  CreateState,
  UpdateState,
  CreateCity,
  UpdateCity,
  type CreateCountryDto,
  type UpdateCountryDto,
  type CreateStateDto,
  type UpdateStateDto,
  type CreateCityDto,
  type UpdateCityDto,
  CountryListQuery,
  StateListQuery,
  CityListQuery,
  type CountryListQueryDto,
  type StateListQueryDto,
  type CityListQueryDto,
} from '@milemoto/types';

import { CountryListQuery } from '@milemoto/types';

export { CountryListQuery as ListQuery };
export type ListQueryDto = z.infer<typeof CountryListQuery>;

// ==== IMPORT ====

export const ImportCountries = z.array(CreateCountry);
export type ImportCountryRows = z.infer<typeof ImportCountries>;

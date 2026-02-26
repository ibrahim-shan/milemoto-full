import { get } from './api';

import type { CityDropdownItem, CountryDropdownItem, StateDropdownItem } from '@/types';

export function fetchCheckoutCountries(): Promise<{ items: CountryDropdownItem[] }> {
  return get<{ items: CountryDropdownItem[] }>('/locations/countries');
}

export function fetchCheckoutStates(countryId?: number): Promise<{ items: StateDropdownItem[] }> {
  const qs = countryId ? `?countryId=${countryId}` : '';
  return get<{ items: StateDropdownItem[] }>(`/locations/states${qs}`);
}

export function fetchCheckoutCities(stateId?: number): Promise<{ items: CityDropdownItem[] }> {
  const qs = stateId ? `?stateId=${stateId}` : '';
  return get<{ items: CityDropdownItem[] }>(`/locations/cities${qs}`);
}

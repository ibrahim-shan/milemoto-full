import { CreateProductDto } from '@milemoto/types';
import { useFormContext } from 'react-hook-form';

import { useGetGrades } from '@/hooks/useGradeQueries';
import { useGetWarranties } from '@/hooks/useWarrantyQueries';
import { GeneralCombobox } from '@/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form';

export function TechnicianDetailsTab() {
  const { control } = useFormContext<CreateProductDto>();
  const { data: grades } = useGetGrades({ page: 1, limit: 100, status: 'active' });
  const { data: warranties } = useGetWarranties({ page: 1, limit: 100, status: 'active' });

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={control}
        name="gradeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel required={true}>Product Grade</FormLabel>
            <FormControl>
              <GeneralCombobox
                data={grades?.items.map(grade => ({ label: grade.name, value: grade.id })) || []}
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Select grade"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="warrantyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Warranty Information</FormLabel>
            <FormControl>
              <GeneralCombobox
                data={
                  warranties?.items.map(warranty => ({
                    label: warranty.name,
                    value: warranty.id,
                  })) || []
                }
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Select warranty"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

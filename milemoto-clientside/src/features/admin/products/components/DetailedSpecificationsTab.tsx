import { CreateProductDto } from '@milemoto/types';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { useGetUnitGroups } from '@/hooks/useUnitQueries';
import { Button } from '@/ui/button';
import { GeneralCombobox } from '@/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

export function DetailedSpecificationsTab() {
  const { control, watch, setValue } = useFormContext<CreateProductDto>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'specifications',
  });

  const { data: unitGroups } = useGetUnitGroups({
    page: 1,
    limit: 100,
    search: '',
    status: 'active',
  });

  // Watch specifications to handle dependent fields
  const specifications = watch('specifications');

  const handleGroupChange = (index: number, groupId: number) => {
    // Reset unit and fields when group changes
    const currentSpec = specifications?.[index];
    if (currentSpec) {
      setValue(`specifications.${index}`, {
        unitGroupId: groupId,
        unitValueId: 0, // Reset unit
        fields: [], // Reset fields
      });
    }
  };

  const handleUnitChange = (index: number, unitId: number) => {
    setValue(`specifications.${index}.unitValueId`, unitId);
  };

  const handleFieldChange = (index: number, fieldId: number, value: string) => {
    const currentFields = specifications?.[index]?.fields || [];
    const fieldIndex = currentFields.findIndex(f => f.unitFieldId === fieldId);

    const newFields = [...currentFields];
    if (fieldIndex >= 0) {
      newFields[fieldIndex] = { unitFieldId: fieldId, value };
    } else {
      newFields.push({ unitFieldId: fieldId, value });
    }

    setValue(`specifications.${index}.fields`, newFields);
  };

  if (!unitGroups?.items) return <div>Loading units...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() =>
            append({
              unitGroupId: 0,
              unitValueId: 0,
              fields: [],
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Add Specification
        </Button>
      </div>

      {fields.map((field, index) => {
        const currentSpec = specifications?.[index];
        const selectedGroupId = currentSpec?.unitGroupId;
        const selectedGroup = unitGroups.items.find(g => g.id === selectedGroupId);

        // Options for Unit Group
        const groupOptions = unitGroups.items.map(g => ({
          label: g.name,
          value: g.id,
        }));

        // Options for Unit Value (filtered by selected group)
        const unitOptions =
          selectedGroup?.values?.map(v => ({
            label: `${v.name} (${v.code})`,
            value: v.id,
          })) || [];

        return (
          <div
            key={field.id}
            className="relative rounded-md border p-4"
          >
            <div className="mb-4 flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-medium">Specification #{index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                justify="center"
                size="icon"
                className="text-destructive hover:text-destructive/90 h-8 w-8"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Unit Group Selection */}
              <FormField
                control={control}
                name={`specifications.${index}.unitGroupId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specification Type</FormLabel>
                    <FormControl>
                      <GeneralCombobox
                        data={groupOptions}
                        value={field.value || ''}
                        onChange={val => handleGroupChange(index, val as number)}
                        placeholder="Select type (e.g. Dimensions)"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Value Selection */}
              <FormField
                control={control}
                name={`specifications.${index}.unitValueId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <GeneralCombobox
                        data={unitOptions}
                        value={field.value || ''}
                        onChange={val => handleUnitChange(index, val as number)}
                        placeholder="Select unit (e.g. cm)"
                        disabled={!selectedGroupId}
                        emptyMessage={selectedGroupId ? 'No units found' : 'Select a type first'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dynamic Fields based on Group - Only show if Unit is selected */}
            {selectedGroup?.fields &&
              selectedGroup.fields.length > 0 &&
              !!currentSpec?.unitValueId && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {selectedGroup.fields.map(groupField => {
                    const currentFieldValue = currentSpec?.fields?.find(
                      f => f.unitFieldId === groupField.id,
                    )?.value;

                    return (
                      <div
                        key={groupField.id}
                        className="space-y-2"
                      >
                        <Label required={!!groupField.required}>{groupField.name}</Label>
                        <Input
                          value={currentFieldValue || ''}
                          onChange={e => handleFieldChange(index, groupField.id, e.target.value)}
                          placeholder={`Enter ${groupField.name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        );
      })}

      {fields.length === 0 && (
        <div className="text-muted-foreground py-8 text-center text-sm">
          No specifications added. Click &quot;Add Specification&quot; to define product details.
        </div>
      )}
    </div>
  );
}

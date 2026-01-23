'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateUnitGroup, CreateUnitGroupDto } from '@milemoto/types';
import { Plus, Trash2 } from 'lucide-react';
import { Resolver, useFieldArray, useForm } from 'react-hook-form';

import {
  useCreateUnitGroup,
  useGetUnitGroup,
  useUpdateUnitGroup,
  type UnitGroup,
} from '@/hooks/useUnitQueries';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

interface UnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitGroup?: UnitGroup | null;
}

export function UnitDialog({ open, onOpenChange, unitGroup }: UnitDialogProps) {
  const isEdit = !!unitGroup;
  const createMutation = useCreateUnitGroup();
  const updateMutation = useUpdateUnitGroup();

  // Fetch full details if editing (to get values and fields)
  const { data: fullUnitGroup, isLoading: isLoadingDetails } = useGetUnitGroup(
    unitGroup?.id as number,
    open && isEdit,
  );

  const form = useForm<CreateUnitGroupDto>({
    resolver: zodResolver(CreateUnitGroup) as unknown as Resolver<CreateUnitGroupDto>,
    mode: 'onChange',
    defaultValues: {
      name: '',
      status: 'active',
      values: [{ name: '', code: '' }],
      fields: [{ name: '', required: false }],
    },
  });

  const {
    fields: valueFields,
    append: appendValue,
    remove: removeValue,
  } = useFieldArray({
    control: form.control,
    name: 'values',
  });

  const {
    fields: fieldFields,
    append: appendField,
    remove: removeField,
  } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  useEffect(() => {
    if (open) {
      if (unitGroup) {
        // If we have full details loaded, use them. Otherwise wait or use partial.
        // For better UX, we might want to show a loader or just wait.
        if (fullUnitGroup) {
          form.reset({
            name: fullUnitGroup.name,
            status: fullUnitGroup.status as 'active' | 'inactive',
            values: fullUnitGroup.values?.map(v => ({
              id: v.id,
              name: v.name,
              code: v.code,
            })) || [{ name: '', code: '' }],
            fields:
              fullUnitGroup.fields && fullUnitGroup.fields.length > 0
                ? fullUnitGroup.fields.map(f => ({
                    id: f.id,
                    name: f.name,
                    required: !!f.required,
                  }))
                : [{ name: '', required: false }],
          });
        }
      } else {
        form.reset({
          name: '',
          status: 'active',
          values: [{ name: '', code: '' }],
          fields: [{ name: '', required: false }],
        });
      }
    }
  }, [open, unitGroup, fullUnitGroup, form]);

  // Form Data Type including IDs for internal handling
  type UnitGroupFormData = {
    name: string;
    status: 'active' | 'inactive';
    values: { id?: number; name: string; code: string }[];
    fields: { id?: number; name: string; required: boolean }[];
  };

  const handleSubmit = async (data: CreateUnitGroupDto) => {
    try {
      // Cast data to UnitGroupFormData to access the 'id' property that might be present
      // from the form state (useFieldArray) but is not in the DTO.
      const formData = data as unknown as UnitGroupFormData;

      // Filter out the 'id' properties from values and fields before sending to the API
      const dataToSend: CreateUnitGroupDto = {
        name: formData.name,
        status: formData.status,
        values: formData.values.map(v => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...rest } = v;
          return rest;
        }),
        fields: formData.fields.map(f => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...rest } = f;
          return rest;
        }),
      };

      if (isEdit && unitGroup) {
        await updateMutation.mutateAsync({ id: unitGroup.id, ...dataToSend });
      } else {
        await createMutation.mutateAsync(dataToSend);
      }
      onOpenChange(false);
    } catch {
      // Error handled by hook
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Unit Group' : 'Add Unit Group'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update unit group details, values, and fields.'
              : 'Create a new unit group (e.g. Weight) with its values (e.g. kg, lb).'}
          </DialogDescription>
        </DialogHeader>

        {isEdit && isLoadingDetails ? (
          <div className="py-8 text-center">Loading details...</div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Parent Group Info */}
              <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required={true}>Group Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Weight"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required={true}>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Unit Values */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Unit Values</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendValue({ name: '', code: '' })}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Value
                  </Button>
                </div>
                {valueFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-4"
                  >
                    <FormField
                      control={form.control}
                      name={`values.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="Name (e.g. Kilogram)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`values.${index}.code`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormControl>
                            <Input
                              placeholder="Code (kg)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      justify="center"
                      className="text-destructive"
                      onClick={() => {
                        removeValue(index);
                        form.trigger('values');
                      }}
                      disabled={valueFields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.formState.errors.values?.root && (
                  <p className="text-destructive text-sm font-medium">
                    {form.formState.errors.values.root.message}
                  </p>
                )}
                {form.formState.errors.values?.message && (
                  <p className="text-destructive text-sm font-medium">
                    {form.formState.errors.values.message}
                  </p>
                )}
              </div>

              {/* Unit Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Unit Fields</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendField({ name: '', required: false })}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Field
                  </Button>
                </div>
                {fieldFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-4"
                  >
                    <FormField
                      control={form.control}
                      name={`fields.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="Field Name (e.g. Net Weight)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`fields.${index}.required`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value || false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Required</FormLabel>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      justify="center"
                      className="text-destructive"
                      onClick={() => {
                        removeField(index);
                        form.trigger('fields');
                      }}
                      disabled={fieldFields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.formState.errors.fields?.root && (
                  <p className="text-destructive text-sm font-medium">
                    {form.formState.errors.fields.root.message}
                  </p>
                )}
                {form.formState.errors.fields?.message && (
                  <p className="text-destructive text-sm font-medium">
                    {form.formState.errors.fields.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || (isEdit && !form.formState.isDirty)}
                >
                  {isPending ? 'Saving...' : isEdit ? 'Update Group' : 'Create Group'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

import { CircleX, CloudUpload, GripVertical, ImageIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';
import { Button } from '@/ui/button';
import { Card, CardContent } from '@/ui/card';
import { Progress } from '@/ui/progress';
import { Sortable, SortableItem, SortableItemHandle } from '@/ui/sortable';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

type SortableImage = {
  id: string;
  src: string;
  alt: string;
  type: 'default' | 'uploaded';
};

interface ImageUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  className?: string;
  value?: string[];
  onChange?: (urls: string[]) => void;
  showInstructions?: boolean;
}

export default function SortableImageUpload({
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
  accept = 'image/*',
  className,
  value = [],
  onChange,
  showInstructions = true,
}: ImageUploadProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [, setActiveId] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<SortableImage[]>([]);

  // Auto-hide errors
  useEffect(() => {
    if (errors.length > 0) {
      const timer = setTimeout(() => {
        setErrors([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errors]);

  // Sync with value prop
  useEffect(() => {
    if (value) {
      const currentUrls = allImages.map(img => img.src);
      // Check if external value is different from local state
      // This handles:
      // 1. Initial load
      // 2. Form reset (value becomes empty)
      // 3. Switching products (value changes completely)
      // It avoids update if the change originated from this component (drag/drop/upload)
      const isDifferent =
        value.length !== currentUrls.length || value.some((url, i) => url !== currentUrls[i]);

      if (isDifferent) {
        const newImages: SortableImage[] = value.map((url, index) => ({
          id: url,
          src: url,
          alt: `Image ${index + 1}`,
          type: 'default',
        }));
        setAllImages(newImages);
        // Clear any pending uploads if we are resetting/switching
        setImages([]);
        setErrors([]);
      }
    }
  }, [value, allImages]);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!file.type.startsWith('image/')) {
        return 'File must be an image';
      }
      if (file.size > maxSize) {
        return `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
      }
      if (allImages.length + images.length >= maxFiles) {
        return `Maximum ${maxFiles} files allowed`;
      }
      return null;
    },
    [maxSize, allImages.length, images.length, maxFiles],
  );

  const uploadToSupabase = useCallback(
    async (imageFile: ImageFile) => {
      try {
        const fileExt = imageFile.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile.file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        const publicUrl = data.publicUrl;

        // Update image status
        setImages(prev =>
          prev.map(img =>
            img.id === imageFile.id ? { ...img, progress: 100, status: 'completed' } : img,
          ),
        );

        // Add to allImages and notify parent
        setAllImages(prev => {
          const newSortableImage: SortableImage = {
            id: publicUrl,
            src: publicUrl,
            alt: imageFile.file.name,
            type: 'uploaded',
          };
          const updated = [...prev, newSortableImage];

          // Defer onChange to avoid state update during render if called synchronously
          setTimeout(() => onChange?.(updated.map(img => img.src)), 0);

          return updated;
        });

        // Remove from temporary images list after a delay
        setTimeout(() => {
          setImages(prev => prev.filter(img => img.id !== imageFile.id));
        }, 2000);
      } catch (error) {
        console.error(error);
        setImages(prev =>
          prev.map(img =>
            img.id === imageFile.id ? { ...img, status: 'error', error: 'Upload failed' } : img,
          ),
        );
        toast.error(`Failed to upload ${imageFile.file.name}`);
      }
    },
    [onChange],
  );

  const addImages = useCallback(
    (files: FileList | File[]) => {
      const newImages: ImageFile[] = [];
      const newErrors: string[] = [];

      Array.from(files).forEach(file => {
        const error = validateFile(file);
        if (error) {
          newErrors.push(`${file.name}: ${error}`);
          return;
        }

        const imageFile: ImageFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          status: 'uploading',
        };

        newImages.push(imageFile);
      });

      if (newErrors.length > 0) {
        setErrors(prev => [...prev, ...newErrors]);
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);

        // Start uploads
        newImages.forEach(imageFile => {
          uploadToSupabase(imageFile);
        });
      }
    },
    [uploadToSupabase, validateFile],
  );

  const removeImage = useCallback(
    async (id: string) => {
      const imageToRemove = allImages.find(img => img.id === id);

      // Remove from allImages
      const updatedImages = allImages.filter(img => img.id !== id);
      setAllImages(updatedImages);
      onChange?.(updatedImages.map(img => img.src));

      // If it's in the temporary images array (e.g. failed upload), remove it there too
      setImages(prev => prev.filter(img => img.id !== id));

      // If it was a newly uploaded image, delete from Supabase Storage
      // We don't delete 'default' images here because the backend handles their deletion
      // when the product is saved, preventing data loss if the user cancels.
      if (imageToRemove && imageToRemove.type === 'uploaded') {
        try {
          // Extract path from URL
          // Expected format: .../products/uploads/filename.ext
          const url = new URL(imageToRemove.src);
          const pathParts = url.pathname.split('/products/');
          if (pathParts.length > 1) {
            const path = pathParts[1]; // uploads/filename.ext
            if (path) {
              await supabase.storage.from('products').remove([path]);
            }
          }
        } catch (error) {
          console.error('Error deleting image from Supabase:', error);
        }
      }
    },
    [allImages, onChange],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        addImages(files);
      }
    },
    [addImages],
  );

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.onchange = e => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        addImages(target.files);
      }
    };
    input.click();
  }, [accept, addImages]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Instructions */}
      {showInstructions ? (
        <div className="mb-4 text-center">
          <p className="text-muted-foreground text-sm">
            Upload up to {maxFiles} images (JPG, PNG, GIF, WebP, max {formatBytes(maxSize)} each).{' '}
            <br />
            Drag and drop images to reorder.
            {allImages.length > 0 && ` ${allImages.length}/${maxFiles} uploaded.`}
          </p>
        </div>
      ) : null}

      {/* Image Grid with Sortable */}
      <div className="mb-6">
        <Sortable
          value={allImages.map(item => item.id)}
          onValueChange={newItemIds => {
            const newAllImages = newItemIds
              .map(itemId => allImages.find(img => img.id === itemId))
              .filter((item): item is SortableImage => item !== undefined);

            setAllImages(newAllImages);
            onChange?.(newAllImages.map(img => img.src));
          }}
          getItemValue={item => item}
          strategy="grid"
          className={cn(
            'grid auto-rows-fr gap-2.5',
            maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-5',
          )}
          onDragStart={event => setActiveId(event.active.id as string)}
          onDragEnd={() => setActiveId(null)}
        >
          {allImages.map(item => (
            <SortableItem
              key={item.id}
              value={item.id}
            >
              <div className="bg-accent/50 border-border hover:bg-accent/70 group relative flex shrink-0 items-center justify-center rounded-md border shadow-none transition-all duration-200 hover:z-10 data-[dragging=true]:z-50">
                <Image
                  src={item.src}
                  className="pointer-events-none h-[120px] w-full rounded-md object-cover"
                  alt={item.alt}
                  width={500}
                  height={500}
                />

                {/* Drag Handle */}
                <SortableItemHandle className="absolute start-2 top-2 cursor-grab opacity-0 active:cursor-grabbing group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon"
                    justify="center"
                    className="size-6 rounded-full"
                  >
                    <GripVertical className="size-3.5" />
                  </Button>
                </SortableItemHandle>

                {/* Remove Button Overlay */}
                <Button
                  onClick={() => removeImage(item.id)}
                  variant="secondary"
                  justify="center"
                  size="icon"
                  className="absolute end-2 top-2 size-6 rounded-full opacity-0 shadow-sm group-hover:opacity-100"
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            </SortableItem>
          ))}
        </Sortable>
      </div>

      {/* Upload Area */}
      <Card
        className={cn(
          'rounded-md border-dashed shadow-none transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center text-center">
          <div className="border-border mx-auto mb-3 mt-3 flex size-[32px] items-center justify-center rounded-full border">
            <CloudUpload className="size-4" />
          </div>
          <h3 className="text-2sm text-foreground mb-0.5 font-semibold">
            Choose a file or drag & drop here.
          </h3>
          <span className="text-secondary-foreground mb-3 block text-xs font-normal">
            JPEG, PNG, up to {formatBytes(maxSize)}.
          </span>
          <Button
            size="sm"
            variant="solid"
            onClick={openFileDialog}
          >
            Browse File
          </Button>
        </CardContent>
      </Card>

      {/* Upload Progress Cards */}
      {images.length > 0 && (
        <div className="mt-6 space-y-3">
          {images.map(imageFile => (
            <Card
              key={imageFile.id}
              className="rounded-md shadow-none"
            >
              <CardContent className="flex items-center gap-2 p-3">
                <div className="border-border flex size-[32px] shrink-0 items-center justify-center rounded-md border">
                  <ImageIcon className="text-muted-foreground size-4" />
                </div>
                <div className="flex w-full flex-col gap-1.5">
                  <div className="-mt-2 flex w-full items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-foreground text-xs font-medium leading-none">
                        {imageFile.file.name}
                      </span>
                      <span className="text-muted-foreground text-xs font-normal leading-none">
                        {formatBytes(imageFile.file.size)}
                      </span>
                      {imageFile.status === 'uploading' && (
                        <p className="text-muted-foreground text-xs">
                          Uploading... {Math.round(imageFile.progress)}%
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => removeImage(imageFile.id)}
                      variant="ghost"
                      justify="center"
                      size="icon"
                      className="size-6"
                    >
                      <CircleX className="size-3.5" />
                    </Button>
                  </div>

                  <Progress
                    value={imageFile.progress}
                    className={cn(
                      'h-1 transition-all duration-300',
                      '[&>div]:bg-zinc-950 dark:[&>div]:bg-zinc-50',
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert
          variant="destructive"
          className="mt-5"
        >
          <AlertDescription>
            <AlertTitle>File upload error(s)</AlertTitle>
            <AlertDescription>
              {errors.map((error, index) => (
                <p
                  key={index}
                  className="last:mb-0"
                >
                  {error}
                </p>
              ))}
            </AlertDescription>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

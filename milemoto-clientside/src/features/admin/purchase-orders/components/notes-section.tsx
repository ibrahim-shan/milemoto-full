import { SectionCard } from './section-card';

import { Input } from '@/ui/input';
import { Label } from '@/ui/label';

type NotesSectionProps = {
  title: string;
  note: string;
  onNoteChange: (value: string) => void;
};

export function NotesSection({ title, note, onNoteChange }: NotesSectionProps) {
  return (
    <SectionCard
      title={title}
      className="space-y-2"
    >
      <div className="space-y-2">
        <Label htmlFor="po-note">Internal note</Label>
        <Input
          id="po-note"
          value={note}
          onChange={e => onNoteChange(e.target.value)}
        />
      </div>
    </SectionCard>
  );
}

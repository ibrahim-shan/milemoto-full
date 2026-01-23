import { PermissionGuard } from '@/features/admin/components/PermissionGuard';
import { SettingsSidebar } from '@/features/admin/components/SettingsSidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard requiredPermission="settings.read">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <aside className="sticky top-24 self-start">
          <div className="bg-card border-border/60 rounded-xl border p-3 shadow-sm">
            <SettingsSidebar />
          </div>
        </aside>
        <section>{children}</section>
      </div>
    </PermissionGuard>
  );
}

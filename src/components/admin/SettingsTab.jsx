import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Settings, Loader2, Lock, UserCog, CheckCircle, AlertTriangle } from 'lucide-react'
import { SettingSection, SettingToggle } from './SettingsBlocks.jsx'

/**
 * SettingsTab — admin tab body for live system settings (maintenance mode,
 * registration toggles, auto-approval, announcement banner). Only mounted
 * for super_admin.
 *
 * Each toggle calls `handleSaveSettings(patch)` which the parent owns. The
 * parent also drives `savingSettings` (boolean) so disabled state stays in
 * sync while the request is in flight.
 */
export default function SettingsTab({
  settings,
  isLoadingSettings,
  savingSettings,
  handleSaveSettings,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-gray-700" /> إعدادات النظام</CardTitle>
        <CardDescription>التحكم في سلوك المنصة وإعدادات التسجيل والصيانة</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSettings ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : !settings ? (
          <p className="text-center text-gray-400 py-8">لا توجد إعدادات</p>
        ) : (
          <div className="space-y-6">
            {/* Maintenance Mode */}
            <SettingSection icon={Lock} title="وضع الصيانة" color="amber">
              <SettingToggle
                label="تفعيل وضع الصيانة"
                description="عند التفعيل، لن يتمكن أحد سوى المدراء من الدخول"
                checked={settings.maintenanceMode}
                onChange={(v) => handleSaveSettings({ maintenanceMode: v })}
                disabled={savingSettings}
                danger
              />
              {settings.maintenanceMode && (
                <div className="mt-3 pl-9">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">رسالة الصيانة</label>
                  <textarea
                    defaultValue={settings.maintenanceMessage}
                    onBlur={(e) => {
                      if (e.target.value !== settings.maintenanceMessage) {
                        handleSaveSettings({ maintenanceMessage: e.target.value })
                      }
                    }}
                    rows={2}
                    className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              )}
            </SettingSection>

            {/* Registration */}
            <SettingSection icon={UserCog} title="التسجيل العام" color="blue">
              <SettingToggle
                label="السماح بالتسجيل"
                description="تشغيل/إيقاف التسجيل في المنصة بشكل عام"
                checked={settings.registrationEnabled}
                onChange={(v) => handleSaveSettings({ registrationEnabled: v })}
                disabled={savingSettings}
              />
              <SettingToggle
                label="تسجيل المرضى"
                checked={settings.patientRegistrationEnabled}
                onChange={(v) => handleSaveSettings({ patientRegistrationEnabled: v })}
                disabled={savingSettings || !settings.registrationEnabled}
              />
              <SettingToggle
                label="تسجيل الأطباء"
                checked={settings.doctorRegistrationEnabled}
                onChange={(v) => handleSaveSettings({ doctorRegistrationEnabled: v })}
                disabled={savingSettings || !settings.registrationEnabled}
              />
              <SettingToggle
                label="تسجيل المنظمات (مستشفيات/مختبرات/صيدليات)"
                checked={settings.organizationRegistrationEnabled}
                onChange={(v) => handleSaveSettings({ organizationRegistrationEnabled: v })}
                disabled={savingSettings || !settings.registrationEnabled}
              />
            </SettingSection>

            {/* Auto-Approval */}
            <SettingSection icon={CheckCircle} title="الاعتماد التلقائي" color="green">
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                عند التفعيل، الحسابات الجديدة تُعتمد تلقائياً بدون مراجعة الأدمن. ⚠️ استخدم بحذر.
              </p>
              <SettingToggle
                label="اعتماد المرضى تلقائياً"
                checked={settings.autoApprovePatients}
                onChange={(v) => handleSaveSettings({ autoApprovePatients: v })}
                disabled={savingSettings}
              />
              <SettingToggle
                label="اعتماد الأطباء تلقائياً"
                checked={settings.autoApproveDoctors}
                onChange={(v) => handleSaveSettings({ autoApproveDoctors: v })}
                disabled={savingSettings}
                warning
              />
              <SettingToggle
                label="اعتماد المنظمات تلقائياً"
                checked={settings.autoApproveOrganizations}
                onChange={(v) => handleSaveSettings({ autoApproveOrganizations: v })}
                disabled={savingSettings}
                warning
              />
            </SettingSection>

            {/* Announcement */}
            <SettingSection icon={AlertTriangle} title="إعلان عام" color="purple">
              <SettingToggle
                label="عرض إعلان للمستخدمين"
                description="يظهر شريط الإعلان في أعلى المنصة لكل المستخدمين"
                checked={settings.announcement?.enabled}
                onChange={(v) => handleSaveSettings({ announcement: { ...settings.announcement, enabled: v } })}
                disabled={savingSettings}
              />
              {settings.announcement?.enabled && (
                <div className="mt-3 pl-9 space-y-2">
                  <textarea
                    defaultValue={settings.announcement?.message || ''}
                    onBlur={(e) => {
                      if (e.target.value !== settings.announcement?.message) {
                        handleSaveSettings({ announcement: { ...settings.announcement, message: e.target.value } })
                      }
                    }}
                    placeholder="نص الإعلان..."
                    rows={2}
                    className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-900"
                  />
                  <select
                    value={settings.announcement?.level || 'info'}
                    onChange={(e) => handleSaveSettings({ announcement: { ...settings.announcement, level: e.target.value } })}
                    className="text-sm rounded-lg border border-gray-200 dark:border-slate-700 px-2 h-9 bg-white dark:bg-slate-900"
                  >
                    <option value="info">معلومة (أزرق)</option>
                    <option value="warning">تحذير (أصفر)</option>
                    <option value="success">نجاح (أخضر)</option>
                  </select>
                </div>
              )}
            </SettingSection>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

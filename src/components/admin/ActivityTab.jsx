import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Activity, Loader2, Trash2 } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState.jsx'

/**
 * ActivityTab — admin tab body listing recent activity log entries.
 * Super-admin sees a "Clear logs" button.
 */
export default function ActivityTab({
  activities = [],
  isLoadingActivity,
  authUser,
  handleClearLogs,
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>النشاط الأخير</CardTitle>
          <CardDescription>آخر الأنشطة على المنصة</CardDescription>
        </div>
        {authUser?.role === 'super_admin' && activities.length > 0 && (
          <Button variant="destructive" size="sm" className="gap-2 bg-red-500 hover:bg-red-600 text-white" onClick={handleClearLogs}>
            <Trash2 className="h-4 w-4" />مسح السجلات
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingActivity ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="لا يوجد نشاط مسجل بعد"
            description="سجلات النظام فارغة حالياً."
          />
        ) : (
          <div className="space-y-4">
            {activities.map((act) => (
              <div key={act._id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{act.action}</p>
                  {act.details && <p className="text-xs text-muted-foreground mt-0.5">{act.details}</p>}
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{act.userId?.fullName || act.organizationId?.name || 'النظام'}</span>
                    <span>{new Date(act.createdAt).toLocaleString('ar-EG')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

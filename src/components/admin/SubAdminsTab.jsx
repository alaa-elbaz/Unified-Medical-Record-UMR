import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { UserCog, Loader2, Plus, Trash2 } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState.jsx'
import { roleLabels } from './AdminLabels.js'

/**
 * SubAdminsTab — admin tab body listing super/sub admin accounts.
 * Only mounted for super_admin in AdminPage.
 */
export default function SubAdminsTab({
  subAdmins = [],
  isLoadingSubAdmins,
  authUser,
  setShowAddSubAdmin,
  handleRemoveSubAdmin,
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-indigo-600" /> إدارة المدراء</CardTitle>
          <CardDescription>الأشخاص الذين لديهم صلاحيات إدارية</CardDescription>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowAddSubAdmin(true)}>
          <Plus className="h-4 w-4" /> إضافة مدير مساعد
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingSubAdmins ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
        ) : subAdmins.length === 0 ? (
          <EmptyState icon={UserCog} title="لا يوجد مدراء" description="لم يتم إضافة أي مدير مساعد بعد." />
        ) : (
          <div className="space-y-3">
            {subAdmins.map((admin) => (
              <div key={admin._id} className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${admin.role === 'super_admin' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white">{admin.fullName}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${admin.role === 'super_admin' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}`}>
                      {roleLabels[admin.role]}
                    </span>
                    {admin._id === authUser?.id && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">أنت</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{admin.email} — {admin.phoneNumber}</p>
                </div>
                {admin.role === 'sub_admin' && admin._id !== authUser?.id && (
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => handleRemoveSubAdmin(admin)}>
                    <Trash2 size={14} /> حذف
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Users, Building2, Loader2, FileText, ShieldCheck } from 'lucide-react'
import { roleLabels, typeLabels } from './AdminLabels.js'
import EmptyState from '@/components/ui/EmptyState.jsx'
import { getImageUrl } from '@/utils/getImageUrl.js'

/**
 * ApprovalsTab — Admin tab body for reviewing pending user and organization
 * registration requests. Pure presentational; all data and handlers come
 * from props so AdminPage stays the source of truth.
 *
 * Props:
 *  - pendingUsers, pendingOrgs: arrays from /admin/users/pending and
 *    /admin/pending-organizations
 *  - isLoadingPending: boolean
 *  - handleUpdateStatus(id, status): approve/reject a user
 *  - handleApproveOrg(id): approve an organization
 *  - handleDeleteOrg(org):  reject (delete) an organization request
 */
export default function ApprovalsTab({
  pendingUsers = [],
  pendingOrgs = [],
  isLoadingPending = false,
  handleUpdateStatus,
  handleApproveOrg,
  handleDeleteOrg,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>اعتمادات الحسابات</CardTitle>
        <CardDescription>مراجعة طلبات التسجيل المعلقة للأفراد والمنظمات</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* User Approvals Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" /> اعتمادات الأفراد ({pendingUsers.length})
            </h3>
            {isLoadingPending ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
            ) : pendingUsers.length === 0 ? (
              <EmptyState icon={Users} title="لا توجد طلبات أفراد معلقة" description="جميع طلبات الأفراد تمت مراجعتها." />
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((u) => {
                  const docPath = u.idDocumentPath || u.syndicateIdPath || ''
                  const linkUrl = docPath && docPath !== 'pending' ? getImageUrl(docPath) : '#'
                  return (
                    <div key={u._id} className="border border-purple-100 dark:border-purple-900/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold">{u.fullName}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {roleLabels[u.role] || u.role}
                          </span>
                          {u.kycScore !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              (u.kycScore || 0) >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                              (u.kycScore || 0) >= 25 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              KYC: {u.kycScore}/100
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-slate-400 mb-3">
                          <p>الرقم القومي: {u.nationalId}</p>
                          <p>الهاتف: {u.phoneNumber}</p>
                        </div>
                        {u.kycScore !== undefined && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500 font-medium flex items-center gap-1">
                                <ShieldCheck size={12} /> تقرير التحقق (KYC)
                              </span>
                              <span className={`font-bold ${
                                (u.kycScore || 0) >= 70 ? 'text-green-600' : (u.kycScore || 0) >= 25 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {u.kycStatus === 'approved' ? '✅ معتمد' : u.kycStatus === 'pending_review' ? '⏳ مراجعة' : '❌ ضعيف'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${
                                (u.kycScore || 0) >= 70 ? 'bg-green-500' : (u.kycScore || 0) >= 25 ? 'bg-amber-500' : 'bg-red-500'
                              }`} style={{ width: `${Math.min(u.kycScore || 0, 100)}%` }} />
                            </div>
                          </div>
                        )}
                        {docPath && docPath !== 'pending' && (
                          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1">
                            <FileText size={14} /> عرض إثبات الهوية
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1" onClick={() => handleUpdateStatus(u._id, 'active')}>قبول</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 flex-1" onClick={() => handleUpdateStatus(u._id, 'rejected')}>رفض</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Organization Approvals Section */}
          <div className="pt-6 border-t dark:border-slate-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" /> اعتمادات المنظمات ({pendingOrgs.length})
            </h3>
            {isLoadingPending ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
            ) : pendingOrgs.length === 0 ? (
              <EmptyState icon={Building2} title="لا توجد طلبات منظمات معلقة" description="جميع طلبات المنظمات تمت مراجعتها." />
            ) : (
              <div className="space-y-4">
                {pendingOrgs.map((org) => (
                  <div key={org._id} className="border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold">{org.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {typeLabels[org.type] || org.type}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                          {org.sectorType === 'Private' ? 'خاص' : 'عام'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-slate-400">
                        <p>رقم التسجيل: {org.healthRegNumber}</p>
                        <p>الإيميل: {org.email}</p>
                        <p>الهاتف: {org.phoneNumber}</p>
                        <p>المدينة: {org.city}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex-1" onClick={() => handleApproveOrg(org._id)}>اعتماد المنظمة</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 flex-1" onClick={() => handleDeleteOrg(org)}>حذف الطلب</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

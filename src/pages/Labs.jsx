import { Card } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { TestTube, FileText } from 'lucide-react'

export default function Labs() {
    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <TestTube className="text-blue-600" />
                        نتائج التحاليل
                    </h2>
                    <p className="text-gray-500">استعراض وإدارة نتائج الفحوصات المخبرية للمرضى</p>
                </div>
                <Button className="gap-2">
                    <span className="text-xl leading-none">+</span> إضافة نتيجة جديدة
                </Button>
            </div>

            <Card className="p-4 border-gray-200">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Input
                            type="text"
                            placeholder="ابحث برقم الملف أو اسم المريض..."
                            className="bg-gray-50 h-11"
                        />
                    </div>
                    <Button variant="secondary" className="px-8 h-11">بحث</Button>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                    <FileText size={48} className="text-gray-300" />
                    <p className="text-lg font-medium text-gray-500">لا توجد نتائج تحاليل حديثة</p>
                    <p className="text-sm">يمكنك البحث عن مريض لاستعراض نتائجه السابقة</p>
                </div>
            </Card>
        </div>
    );
}

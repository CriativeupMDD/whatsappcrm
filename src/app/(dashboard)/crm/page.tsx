import Link from 'next/link';
import { BriefcaseBusiness, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">CRM</h1>
        <p className="mt-1 text-sm text-slate-400">
          Acompanhe oportunidades comerciais e funis de relacionamento.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BriefcaseBusiness className="size-5 text-primary" />
            Área comercial
          </CardTitle>
          <CardDescription className="text-slate-400">
            O CRM usa o módulo de pipelines existente para funis, etapas e negócios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/pipelines" />}>
            <GitBranch className="size-4" />
            Abrir pipelines
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

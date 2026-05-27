import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListTodo, Plus } from 'lucide-react';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tarefas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Organize os próximos retornos, acompanhamentos e pendências da clínica.
          </p>
        </div>
        <Button disabled>
          <Plus className="size-4" />
          Nova tarefa
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ListTodo className="size-5 text-primary" />
            Central de tarefas
          </CardTitle>
          <CardDescription className="text-slate-400">
            O módulo está reservado no menu e nas permissões. A criação operacional de tarefas pode ser ligada ao fluxo de atendimento na próxima etapa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center text-sm text-slate-400">
            Nenhuma tarefa cadastrada ainda.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

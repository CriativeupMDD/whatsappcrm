'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  APP_PERMISSIONS,
  type AppPermission,
  type TeamRole,
} from '@/lib/permissions';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: TeamRole;
  position: string | null;
  permissions: AppPermission[];
  status: string;
}

export function CollaboratorsCard() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<TeamRole>('attendant');
  const [permissions, setPermissions] = useState<AppPermission[]>(
    DEFAULT_ROLE_PERMISSIONS.attendant
  );

  async function loadMembers() {
    try {
      setLoading(true);
      const res = await fetch('/api/team/members');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load collaborators');
      setMembers(payload.members || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function handleRole(nextRole: TeamRole) {
    setRole(nextRole);
    setPermissions(DEFAULT_ROLE_PERMISSIONS[nextRole]);
  }

  function togglePermission(permission: AppPermission) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          position,
          role,
          permissions,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to create collaborator');

      toast.success('Colaborador cadastrado');
      setFullName('');
      setEmail('');
      setPassword('');
      setPosition('');
      handleRole('attendant');
      await loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create collaborator');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/40">
      <CardHeader>
        <CardTitle className="text-white">Colaboradores</CardTitle>
        <CardDescription className="text-slate-400">
          Cadastre acessos com permissões limitadas por área do AlmeidaClinic.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="space-y-2">
              <Label className="text-slate-200">Nome</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Senha provisória</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Função/cargo</Label>
              <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Recepção, vendas, financeiro..." required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Nível</Label>
            <Select value={role} onValueChange={(value) => handleRole(value as TeamRole)}>
              <SelectTrigger className="w-full border-slate-700 bg-slate-900 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-white">
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Permissões</Label>
            <div className="grid grid-cols-2 gap-2">
              {APP_PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="size-4 accent-primary"
                  />
                  {PERMISSION_LABELS[permission]}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Cadastrar colaborador
          </Button>
        </form>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
              Nenhum colaborador cadastrado.
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{member.full_name}</p>
                    <p className="text-sm text-slate-400">{member.email}</p>
                    <p className="mt-1 text-xs text-slate-500">{member.position}</p>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-300">
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {member.permissions.map((permission) => (
                    <Badge key={permission} className="bg-primary/10 text-primary hover:bg-primary/10">
                      {PERMISSION_LABELS[permission]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

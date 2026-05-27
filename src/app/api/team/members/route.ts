import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissions,
  type AppPermission,
  type TeamRole,
} from '@/lib/permissions';

const roleValues = ['administrator', 'attendant', 'commercial', 'financial', 'viewer'];

async function ensureClinic(ownerUserId: string, ownerName: string, ownerEmail: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('clinic_id')
    .eq('user_id', ownerUserId)
    .maybeSingle();

  if (profile?.clinic_id) return profile.clinic_id as string;

  const { data: clinic, error } = await admin
    .from('clinics')
    .insert({
      owner_user_id: ownerUserId,
      name: ownerName || ownerEmail || 'AlmeidaClinic',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  await admin.from('profiles').update({ clinic_id: clinic.id }).eq('user_id', ownerUserId);
  return clinic.id as string;
}

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('role, permissions')
    .eq('user_id', user.id)
    .maybeSingle();

  if (member && !normalizePermissions(member.permissions).includes('settings')) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function GET() {
  const result = await requireOwner();
  if ('error' in result) return result.error;

  const admin = createAdminClient();
  const clinicId = await ensureClinic(
    result.user.id,
    String(result.user.user_metadata?.full_name || ''),
    result.user.email || ''
  );

  const { data, error } = await admin
    .from('team_members')
    .select('id, full_name, email, role, position, permissions, status, created_at')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[team/members] list failed:', error);
    return NextResponse.json({ error: 'Failed to list collaborators' }, { status: 500 });
  }

  return NextResponse.json({ members: data || [] });
}

export async function POST(request: Request) {
  const result = await requireOwner();
  if ('error' in result) return result.error;

  const body = await request.json();
  const fullName = String(body.full_name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const position = String(body.position || '').trim();
  const role = String(body.role || 'viewer') as TeamRole;
  const requestedPermissions = normalizePermissions(body.permissions);

  if (!fullName || !email || !password || !position) {
    return NextResponse.json({ error: 'Name, email, temporary password, and position are required' }, { status: 400 });
  }

  if (!roleValues.includes(role)) {
    return NextResponse.json({ error: 'Invalid collaborator level' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Temporary password must have at least 6 characters' }, { status: 400 });
  }

  const admin = createAdminClient();
  const clinicId = await ensureClinic(
    result.user.id,
    String(result.user.user_metadata?.full_name || ''),
    result.user.email || ''
  );
  const permissions: AppPermission[] =
    requestedPermissions.length > 0 ? requestedPermissions : DEFAULT_ROLE_PERMISSIONS[role];

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'agent' },
  });

  if (created.error) {
    return NextResponse.json({ error: created.error.message }, { status: 400 });
  }

  const userId = created.data.user.id;
  await admin.from('profiles').upsert({
    user_id: userId,
    full_name: fullName,
    email,
    role: 'agent',
    clinic_id: clinicId,
  });

  const { data, error } = await admin
    .from('team_members')
    .insert({
      clinic_id: clinicId,
      owner_user_id: result.user.id,
      user_id: userId,
      full_name: fullName,
      email,
      role,
      position,
      permissions,
      status: 'active',
    })
    .select('id, full_name, email, role, position, permissions, status, created_at')
    .single();

  if (error) {
    await admin.auth.admin.deleteUser(userId);
    console.error('[team/members] insert failed:', error);
    return NextResponse.json({ error: 'Failed to save collaborator' }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}

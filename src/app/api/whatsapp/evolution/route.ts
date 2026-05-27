import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/whatsapp/encryption';
import {
  createOrConnectEvolutionInstance,
  disconnectEvolution,
  extractQrCode,
  getEvolutionStatus,
  mapEvolutionStatus,
} from '@/lib/whatsapp/evolution-api';

async function requireConfig() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: config, error } = await supabase
    .from('whatsapp_config')
    .select('evolution_api_url, evolution_api_key, evolution_instance_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[whatsapp/evolution] config load failed:', error);
    return { error: NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 }) };
  }

  if (!config?.evolution_api_url || !config.evolution_api_key || !config.evolution_instance_name) {
    return {
      error: NextResponse.json(
        { error: 'Evolution API configuration is incomplete' },
        { status: 400 }
      ),
    };
  }

  let apiKey: string;
  try {
    apiKey = decrypt(config.evolution_api_key);
  } catch (err) {
    console.error('[whatsapp/evolution] key decryption failed:', err);
    return {
      error: NextResponse.json(
        { error: 'Stored Evolution API key cannot be decrypted. Save it again.' },
        { status: 400 }
      ),
    };
  }

  return {
    supabase,
    user,
    config: {
      apiUrl: config.evolution_api_url,
      apiKey,
      instanceName: config.evolution_instance_name,
    },
  };
}

export async function GET() {
  const result = await requireConfig();
  if ('error' in result) return result.error;

  try {
    const payload = await getEvolutionStatus(result.config);
    const status = mapEvolutionStatus(payload);
    await result.supabase
      .from('whatsapp_config')
      .update({ evolution_status: status, status: status === 'connected' ? 'connected' : 'disconnected' })
      .eq('user_id', result.user.id);

    return NextResponse.json({ status, raw: payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Evolution API error';
    await result.supabase
      .from('whatsapp_config')
      .update({ evolution_status: 'error', status: 'disconnected' })
      .eq('user_id', result.user.id);
    return NextResponse.json({ status: 'error', error: message }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string | undefined;

  if (action === 'save') {
    const apiUrl = String(body.evolution_api_url || '').trim();
    const apiKey = String(body.evolution_api_key || '').trim();
    const instanceName = String(body.evolution_instance_name || '').trim();

    if (!apiUrl || !apiKey || !instanceName) {
      return NextResponse.json({ error: 'URL, API key, and instance name are required' }, { status: 400 });
    }

    const encryptedKey = encrypt(apiKey);
    const { error } = await supabase.from('whatsapp_config').upsert(
      {
        user_id: user.id,
        connection_type: 'evolution_qrcode',
        evolution_api_url: apiUrl,
        evolution_api_key: encryptedKey,
        evolution_instance_name: instanceName,
        evolution_status: 'disconnected',
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('[whatsapp/evolution] save failed:', error);
      return NextResponse.json({ error: 'Failed to save Evolution configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  const result = await requireConfig();
  if ('error' in result) return result.error;

  if (action === 'qrcode') {
    try {
      const payload = await createOrConnectEvolutionInstance(result.config);
      const qrCode = extractQrCode(payload);
      await result.supabase
        .from('whatsapp_config')
        .update({ evolution_status: 'waiting_qrcode', status: 'disconnected' })
        .eq('user_id', result.user.id);

      return NextResponse.json({ status: 'waiting_qrcode', qr_code: qrCode, raw: payload });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Evolution API error';
      await result.supabase
        .from('whatsapp_config')
        .update({ evolution_status: 'error', status: 'disconnected' })
        .eq('user_id', result.user.id);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (action === 'disconnect') {
    try {
      await disconnectEvolution(result.config);
      await result.supabase
        .from('whatsapp_config')
        .update({ evolution_status: 'disconnected', status: 'disconnected' })
        .eq('user_id', result.user.id);

      return NextResponse.json({ success: true, status: 'disconnected' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Evolution API error';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

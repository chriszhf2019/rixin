// Supabase Edge Function: send-reminders
// Checks for due reminders and sends push notifications.
//
// Requirements:
//   1. Deploy: supabase functions deploy send-reminders --no-verify-jwt
//   2. Set secrets: supabase secrets set VAPID_PRIVATE_KEY VAPID_EMAIL
//   3. Schedule (SQL in Supabase SQL Editor):
//      select cron.schedule('send-reminders', '* * * * *', $$
//        select net.http_post(
//          url:='https://<project>.supabase.co/functions/v1/send-reminders',
//          headers:='{"Authorization": "Bearer <service-role-key>"}'::jsonb
//        );
//      $$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find unnotified reminders due within the next 5 minutes
  const now = new Date().toISOString();
  const fiveMinLater = new Date(Date.now() + 5 * 60_000).toISOString();

  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, task:tasks!inner(id, title, user_id)')
    .eq('notified', false)
    .gte('remind_at', now)
    .lte('remind_at', fiveMinLater);

  if (!reminders?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  let sent = 0;

  for (const r of reminders) {
    if (!r.task) continue;

    // Send via web-push library (add to imports):
    // import webpush from 'npm:web-push';
    //
    // webpush.setVapidDetails(
    //   'mailto:' + Deno.env.get('VAPID_EMAIL')!,
    //   Deno.env.get('VAPID_PUBLIC_KEY')!,
    //   Deno.env.get('VAPID_PRIVATE_KEY')!
    // );
    //
    // const { data: subs } = await supabase
    //   .from('push_subscriptions')
    //   .select('endpoint, p256dh, auth')
    //   .eq('user_id', r.task.user_id);
    //
    // for (const sub of subs ?? []) {
    //   try {
    //     await webpush.sendNotification(sub, JSON.stringify({
    //       title: '⏰ 任务提醒',
    //       body: r.task.title,
    //       tag: `reminder-${r.id}`,
    //       url: '/today',
    //     }));
    //     sent++;
    //   } catch (err) {
    //     if (err.statusCode === 410) {
    //       await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    //     }
    //   }
    // }

    await supabase.from('reminders').update({ notified: true }).eq('id', r.id);
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});

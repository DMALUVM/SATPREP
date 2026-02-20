import {
  ensureSatProfile,
  getServiceClient,
  methodGuard,
  requireAuthUser,
  resolveStudentId,
  sendError,
} from './_lib/supabase.js';
import { getWeekStartSunday, renderWeeklyReportMarkdown } from './_lib/engine.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  try {
    const user = await requireAuthUser(req);
    const service = getServiceClient();
    const profile = await ensureSatProfile(service, user.id, req.body?.role_hint || 'parent');

    const studentId = resolveStudentId(profile, req.body?.student_id || null);
    if (!studentId) return res.status(400).json({ error: 'No linked student account found.' });
    if (profile.role !== 'parent' && studentId !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const weekStart = req.body?.week_start || getWeekStartSunday(new Date());

    const { data: report, error } = await service
      .from('sat_weekly_reports')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (error) throw new Error(`Unable to fetch report: ${error.message}`);
    if (!report) return res.status(404).json({ error: 'Weekly report not found. Generate parent report first.' });

    const markdown = renderWeeklyReportMarkdown(report);
    const filename = `sat-weekly-report-${studentId}-${weekStart}.md`;

    await service
      .from('sat_weekly_reports')
      .update({
        report_payload: {
          ...(report.report_payload || {}),
          last_exported_at: new Date().toISOString(),
        },
      })
      .eq('id', report.id);

    return res.status(200).json({
      filename,
      markdown,
      report,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

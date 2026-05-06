Deno.serve(async (req) => {
  try {
    const { transcript, contact } = await req.json();
    if (!transcript) return Response.json({ error: 'transcript is required' }, { status: 400 });

    // Parse transcript locally — extract key patterns without AI
    const lines = transcript.split('\n').filter(l => l.trim());

    // Simple extraction helpers
    const painKeywords = ['problem', 'challenge', 'struggle', 'issue', 'pain', 'difficult', 'hard', 'frustrat', 'slow', 'manual', 'broken', 'can\'t', 'cannot', "don't have", 'missing', 'lack'];
    const commitKeywords = ['will', 'going to', 'send', 'share', 'follow up', 'schedule', 'book', 'demo', 'trial', 'connect', 'introduce', 'next step', 'by'];
    const datePattern = /\b(monday|tuesday|wednesday|thursday|friday|tomorrow|next week|end of week|eow|eod|\d{1,2}\/\d{1,2}|\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\b/i;

    const painPoints = [];
    const commitments = [];
    let nextStepDate = null;

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (painKeywords.some(k => lower.includes(k)) && line.length > 20) {
        const clean = line.replace(/^[A-Za-z\s]+:\s*/, '').trim();
        if (clean && !painPoints.includes(clean) && painPoints.length < 5) painPoints.push(clean);
      }
      if (commitKeywords.some(k => lower.includes(k)) && line.length > 15) {
        const clean = line.replace(/^[A-Za-z\s]+:\s*/, '').trim();
        if (clean && !commitments.includes(clean) && commitments.length < 5) commitments.push(clean);
      }
      if (!nextStepDate && datePattern.test(lower)) {
        const match = lower.match(datePattern);
        if (match) nextStepDate = match[0];
      }
    });

    // Fallbacks
    if (painPoints.length === 0) painPoints.push('Pain points to be clarified in follow-up');
    if (commitments.length === 0) commitments.push('Review notes and agree on next steps');

    const contactName = contact || 'the contact';
    const firstName = contactName.split(' ')[0];

    const nextStep = commitments[0] || 'Follow up with next steps';

    const emailDraft = `Subject: Great speaking with you${firstName !== 'the' ? `, ${firstName}` : ''} — next steps

Hi ${firstName !== 'the' ? firstName : 'there'},

Thanks for taking the time to connect today. I really enjoyed our conversation and wanted to recap the key points.

Key takeaways from our call:
${painPoints.map(p => `• ${p}`).join('\n')}

Agreed next steps:
${commitments.map(c => `• ${c}`).join('\n')}

${nextStepDate ? `I'll follow up by ${nextStepDate}. ` : ''}Please let me know if you have any questions in the meantime.

Looking forward to moving things forward!

Best,
[Your name]`;

    const hubspotUpdates = [
      `Log call activity for ${contactName}`,
      `Update deal stage based on conversation outcome`,
      nextStepDate ? `Set follow-up task for ${nextStepDate}` : 'Create a follow-up task in HubSpot',
      commitments.length > 0 ? `Add note: "${commitments[0]}"` : 'Add call summary note',
    ];

    return Response.json({ contact: contactName, painPoints, commitments, nextStep, nextStepDate, emailDraft, hubspotUpdates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
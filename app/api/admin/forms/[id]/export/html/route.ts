import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'
import { FormSnapshot } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        publishedVersion: true,
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    if (!form.publishedVersion) {
      return NextResponse.json(
        { error: 'Form must be published before exporting' },
        { status: 400 }
      )
    }

    const snapshot = form.publishedVersion.snapshotJson as FormSnapshot
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Check for custom submit URL in query params
    const customSubmitUrl = request.nextUrl.searchParams.get('submitUrl')
    const submitUrl = customSubmitUrl || `${appUrl}/api/public/submit`

    const html = generateStandaloneHTML(snapshot, submitUrl)
    const filename = `${form.slug}-form.html`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('HTML export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateStandaloneHTML(snapshot: FormSnapshot, submitUrl: string): string {
  const snapshotJson = JSON.stringify(snapshot)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(snapshot.introTitle || snapshot.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%);
      min-height: 100vh;
    }
    .container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .progress-bar {
      position: sticky;
      top: 0;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 16px;
      z-index: 10;
    }
    .progress-info {
      max-width: 512px;
      margin: 0 auto;
    }
    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .progress-track {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      width: 100%;
      max-width: 512px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
      padding: 32px;
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .intro-title, .thankyou-title {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
      text-align: center;
    }
    .intro-desc, .thankyou-msg {
      font-size: 18px;
      color: #475569;
      text-align: center;
      margin-bottom: 32px;
    }
    .question-label {
      font-size: 20px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .required { color: #ef4444; margin-left: 4px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      color: white;
    }
    .btn-primary:hover { background: linear-gradient(90deg, #2563eb, #1d4ed8); }
    .btn-ghost {
      background: transparent;
      color: #64748b;
    }
    .btn-ghost:hover { background: #f1f5f9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-center { display: block; margin: 0 auto; }
    .input {
      width: 100%;
      padding: 16px;
      font-size: 18px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s;
    }
    .input:focus { border-color: #3b82f6; }
    .textarea { min-height: 120px; resize: vertical; }
    .choice-list { display: flex; flex-direction: column; gap: 12px; }
    .choice-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .choice-item:hover { border-color: #cbd5e1; }
    .choice-item.selected { border-color: #3b82f6; background: #eff6ff; }
    .choice-item input { width: 20px; height: 20px; }
    .choice-label { font-size: 18px; color: #0f172a; }
    .nav { display: flex; justify-content: space-between; margin-top: 32px; }
    .error { color: #ef4444; font-size: 14px; margin-top: 8px; }
    .success-icon {
      width: 64px;
      height: 64px;
      background: #dcfce7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .success-icon svg { width: 32px; height: 32px; color: #16a34a; }
    .redirect-msg { color: #64748b; font-size: 14px; text-align: center; margin-top: 24px; }
    .loading { display: flex; flex-direction: column; align-items: center; }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const SNAPSHOT = ${snapshotJson};
    const SUBMIT_URL = "${submitUrl}";

    let state = 'intro';
    let currentIndex = 0;
    let answers = {};
    let error = null;

    const questions = SNAPSHOT.questions.sort((a, b) => a.order - b.order);

    function render() {
      const app = document.getElementById('app');
      
      if (state === 'intro') {
        app.innerHTML = \`
          <div class="container">
            <div class="content">
              <div class="card">
                <h1 class="intro-title">\${escapeHtml(SNAPSHOT.introTitle || 'Welcome')}</h1>
                \${SNAPSHOT.introDescription ? \`<p class="intro-desc">\${escapeHtml(SNAPSHOT.introDescription)}</p>\` : ''}
                <button class="btn btn-primary btn-center" onclick="startForm()">
                  Start →
                </button>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      if (state === 'submitting') {
        app.innerHTML = \`
          <div class="container">
            <div class="content">
              <div class="card loading">
                <div class="spinner"></div>
                <p>Submitting your response...</p>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      if (state === 'thankyou') {
        let redirectHtml = '';
        if (SNAPSHOT.redirectUrl && SNAPSHOT.redirectDelaySec) {
          redirectHtml = \`<p class="redirect-msg">Redirecting in <span id="countdown">\${SNAPSHOT.redirectDelaySec}</span> seconds...</p>\`;
          setTimeout(startRedirectCountdown, 100);
        }
        
        app.innerHTML = \`
          <div class="container">
            <div class="content">
              <div class="card">
                <div class="success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h1 class="thankyou-title">\${escapeHtml(SNAPSHOT.thankYouTitle || 'Thank you!')}</h1>
                <p class="thankyou-msg">\${escapeHtml(SNAPSHOT.thankYouMessage || 'Your response has been recorded.')}</p>
                \${redirectHtml}
              </div>
            </div>
          </div>
        \`;
        return;
      }

      const q = questions[currentIndex];
      const progress = ((currentIndex + 1) / questions.length) * 100;

      app.innerHTML = \`
        <div class="container">
          <div class="progress-bar">
            <div class="progress-info">
              <div class="progress-text">
                <span>Question \${currentIndex + 1} of \${questions.length}</span>
                <span>\${Math.round(progress)}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: \${progress}%"></div>
              </div>
            </div>
          </div>
          <div class="content">
            <div class="card">
              <h2 class="question-label">
                \${escapeHtml(q.label)}
                \${q.required ? '<span class="required">*</span>' : ''}
              </h2>
              \${renderQuestion(q)}
              \${error ? \`<p class="error">\${escapeHtml(error)}</p>\` : ''}
              <div class="nav">
                <button class="btn btn-ghost" onclick="goBack()" \${currentIndex === 0 ? 'disabled' : ''}>
                  ← Back
                </button>
                \${q.type !== 'single_choice' ? \`
                  <button class="btn btn-primary" onclick="goNext()">
                    \${currentIndex === questions.length - 1 ? 'Submit' : 'Next →'}
                  </button>
                \` : ''}
              </div>
            </div>
          </div>
        </div>
      \`;
    }

    function renderQuestion(q) {
      const value = answers[q.key];
      const config = q.configJson || {};

      switch (q.type) {
        case 'short_text':
        case 'email':
        case 'phone':
          const inputType = q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : 'text';
          return \`<input type="\${inputType}" class="input" value="\${escapeHtml(value || '')}" 
            placeholder="\${escapeHtml(config.placeholder || '')}" 
            onchange="updateAnswer('\${q.key}', this.value)">\`;
        
        case 'long_text':
          return \`<textarea class="input textarea" placeholder="\${escapeHtml(config.placeholder || '')}"
            onchange="updateAnswer('\${q.key}', this.value)">\${escapeHtml(value || '')}</textarea>\`;
        
        case 'single_choice':
          return \`<div class="choice-list">
            \${(config.choices || []).map(c => \`
              <label class="choice-item \${value === c.id ? 'selected' : ''}" onclick="selectChoice('\${q.key}', '\${c.id}')">
                <input type="radio" name="\${q.key}" value="\${c.id}" \${value === c.id ? 'checked' : ''}>
                <span class="choice-label">\${escapeHtml(c.label)}</span>
              </label>
            \`).join('')}
          </div>\`;
        
        case 'multiple_choice':
          const selected = Array.isArray(value) ? value : [];
          return \`<div class="choice-list">
            \${(config.choices || []).map(c => \`
              <label class="choice-item \${selected.includes(c.id) ? 'selected' : ''}" onclick="toggleChoice('\${q.key}', '\${c.id}')">
                <input type="checkbox" value="\${c.id}" \${selected.includes(c.id) ? 'checked' : ''}>
                <span class="choice-label">\${escapeHtml(c.label)}</span>
              </label>
            \`).join('')}
          </div>\`;
        
        case 'consent':
          return \`<label class="choice-item \${value === true ? 'selected' : ''}" onclick="toggleConsent('\${q.key}')">
            <input type="checkbox" \${value === true ? 'checked' : ''}>
            <span class="choice-label">\${escapeHtml(config.consentText || 'I agree')}</span>
          </label>\`;
        
        default:
          return '';
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function startForm() {
      state = 'questions';
      render();
    }

    function updateAnswer(key, value) {
      answers[key] = value;
      error = null;
    }

    function selectChoice(key, value) {
      answers[key] = value;
      error = null;
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          currentIndex++;
          render();
        } else {
          submit();
        }
      }, 300);
    }

    function toggleChoice(key, value) {
      const current = Array.isArray(answers[key]) ? answers[key] : [];
      if (current.includes(value)) {
        answers[key] = current.filter(v => v !== value);
      } else {
        answers[key] = [...current, value];
      }
      error = null;
      render();
    }

    function toggleConsent(key) {
      answers[key] = !answers[key];
      error = null;
      render();
    }

    function validate() {
      const q = questions[currentIndex];
      const value = answers[q.key];
      const config = q.configJson || {};

      if (q.required) {
        if (value === null || value === undefined || value === '') {
          error = 'This field is required';
          return false;
        }
        if (Array.isArray(value) && value.length === 0) {
          error = 'Please select at least one option';
          return false;
        }
        if (q.type === 'consent' && value !== true) {
          error = 'You must agree to continue';
          return false;
        }
      }

      if (value && q.type === 'email') {
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
          return false;
        }
      }

      if (value && q.type === 'phone') {
        const cleaned = value.replace(/[\\s\\-\\(\\)]/g, '');
        if (!/^\\+?[0-9]{7,15}$/.test(cleaned)) {
          error = 'Please enter a valid phone number';
          return false;
        }
      }

      error = null;
      return true;
    }

    function goBack() {
      if (currentIndex > 0) {
        currentIndex--;
        error = null;
        render();
      }
    }

    function goNext() {
      if (!validate()) {
        render();
        return;
      }

      if (currentIndex < questions.length - 1) {
        currentIndex++;
        render();
      } else {
        submit();
      }
    }

    async function submit() {
      if (!validate()) {
        render();
        return;
      }

      state = 'submitting';
      render();

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const meta = {
          referrer: document.referrer || null,
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          utmTerm: urlParams.get('utm_term'),
          utmContent: urlParams.get('utm_content'),
        };

        const response = await fetch(SUBMIT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formSlug: SNAPSHOT.slug,
            answers,
            meta,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Submission failed');
        }

        state = 'thankyou';
        render();
      } catch (err) {
        error = err.message || 'Failed to submit form';
        state = 'questions';
        render();
      }
    }

    function startRedirectCountdown() {
      let count = SNAPSHOT.redirectDelaySec;
      const interval = setInterval(() => {
        count--;
        const el = document.getElementById('countdown');
        if (el) el.textContent = count;
        if (count <= 0) {
          clearInterval(interval);
          window.location.href = SNAPSHOT.redirectUrl;
        }
      }, 1000);
    }

    render();
  </script>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}


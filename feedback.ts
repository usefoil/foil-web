import { mountFeedback } from './lib/bugdrop/browser.js';

declare global {
  interface Window {
    FOIL_FEEDBACK_CONFIG?: Readonly<{ enabled: boolean; applicationId: string; widgetUrl: string }>;
    __foilFeedbackStarted?: boolean;
  }
}
const config = window.FOIL_FEEDBACK_CONFIG;
if (config?.enabled === true && window.location.origin === 'https://foil.neonwatty.com' && window.location.pathname === '/' && !window.__foilFeedbackStarted) {
  window.__foilFeedbackStarted = true;
  const fail = () => {
    if (document.getElementById('foil-feedback-error')) return;
    const notice = document.createElement('p');
    notice.id = 'foil-feedback-error';
    notice.setAttribute('role', 'status');
    notice.textContent = 'Website feedback is temporarily unavailable.';
    document.body.appendChild(notice);
  };
  try {
    if (!config.applicationId || config.widgetUrl !== 'https://widget.bugdrop.dev/widget.v1.js') throw new Error();
    void mountFeedback({ applicationId: config.applicationId, widgetUrl: config.widgetUrl }).ready.catch(fail);
  } catch { fail(); }
}

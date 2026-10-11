type Choice = 'granted' | 'denied';
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
const KEY = 'traspogru.analytics.v1';
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;

export function installAnalytics() {
  const root = document.getElementById('analytics-settings');
  const dialog = document.getElementById('analytics-consent') as HTMLDialogElement | null;
  const id = root?.dataset.measurementId;
  if (!dialog || !id || !/^G-[A-Z0-9]+$/.test(id)) return;
  const win = window as AnalyticsWindow;
  let started = false;
  let choice: Choice | null = null;
  let previousFocus: HTMLElement | null = null;
  function readChoice(): Choice | null {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (value?.version === 1 && ['granted', 'denied'].includes(value.choice) &&
          Number.isFinite(value.at) && value.at <= Date.now() && Date.now() - value.at < MAX_AGE) return value.choice;
    } catch { /* Storage bloccato: chiedere il consenso senza interrompere il sito. */ }
    return null;
  }
  function clearCookies() {
    const names = document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => /^_ga(?:_|$)/.test(n));
    const labels = location.hostname.split('.');
    const domains = ['', ...labels.map((_, i) => `.${labels.slice(i).join('.')}`)];
    for (const name of names) for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`;
    }
  }
  function start() {
    if (started || choice !== 'granted') return;
    started = true;
    win.dataLayer = win.dataLayer ?? [];
    win.gtag = function () { win.dataLayer!.push(arguments); };
    win.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    win.gtag('js', new Date());
    // Invia solo parametri di campagna noti, mai campi dei moduli o query arbitrarie.
    const page = new URL(location.href);
    for (const key of [...page.searchParams.keys()]) if (!['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].includes(key)) page.searchParams.delete(key);
    page.hash = '';
    let referrer = '';
    try { const ref = new URL(document.referrer); referrer = `${ref.origin}${ref.pathname}`; } catch { /* Visita diretta. */ }
    win.gtag('config', id, { page_location: page.href, page_referrer: referrer, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 15552000, cookie_update: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(script);
  }
  function show() {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog!.open) dialog!.showModal();
  }
  function save(next: Choice) {
    choice = next;
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, choice, at: Date.now() })); } catch { /* Consenso valido soltanto per questa pagina. */ }
    if (next === 'denied') {
      // Il reload rimuove anche i listener già caricati da gtag.
      (win as unknown as Record<string, unknown>)[`ga-disable-${id}`] = true;
      clearCookies();
    }
    dialog!.close();
    previousFocus?.focus();
    if (next === 'granted') start();
    else if (started) location.reload();
  }
  dialog.querySelectorAll<HTMLButtonElement>('[data-analytics-choice]').forEach(button => {
    button.addEventListener('click', () => save(button.dataset.analyticsChoice as Choice));
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); save(choice ?? 'denied'); });
  document.querySelectorAll<HTMLElement>('[data-open-analytics]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', show);
  });
  window.addEventListener('storage', event => { if (event.key === KEY) location.reload(); });
  choice = readChoice();
  if (choice === 'granted') start();
  else if (choice === null) show();
}

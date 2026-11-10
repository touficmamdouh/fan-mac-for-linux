const token = document.querySelector('meta[name="dashboard-token"]').content;
const $ = (id) => document.getElementById(id);
const readings = [];
let currentMode = null;
let currentLanguage = (() => {
  try { return localStorage.getItem('fan-dashboard-language') === 'en' ? 'en' : 'ar'; }
  catch { return 'ar'; }
})();
let lastServiceActive = false;
let lastUpdated = null;
let lastStatus = null;
let connectionFailed = false;

const messages = {
  ar: {
    brand: 'تبريد iMac', brandSubtitle: 'لوحة المراوح المحلية', brandLabel: 'لوحة تبريد iMac',
    liveMonitoring: 'مراقبة مباشرة', refreshInterval: 'تحديث كل ٥ ثوانٍ',
    headlineFirst: 'حرارة الجهاز', headlineSecond: 'تحت السيطرة.', systemStatus: 'حالة النظام',
    coolingStatus: 'حالة التبريد', airflow: 'تدفق الهواء', fanSpeed: 'سرعة المراوح',
    fanOdd: 'مروحة ١', fanHdd: 'مروحة ٢', fanCpu: 'مروحة ٣',
    unknownControl: 'حالة التحكم غير معروفة', temperatureSensor: 'مستشعر الحرارة', temperature: 'درجة الحرارة',
    temperatureGauge: 'مؤشر درجة الحرارة', celsius: 'درجة مئوية', recentReadings: 'آخر القراءات',
    sinceDashboardOpened: 'منذ فتح اللوحة', recentReadingsChart: 'رسم القراءات الأخيرة', now: 'الآن',
    coolingStyle: 'اختر أسلوب التبريد', operatingMode: 'وضع التشغيل',
    authConfirmation: 'ستحتاج لتأكيد الصلاحية عند تغيير الوضع.', quietMode: 'هادئ ذكي',
    quietDescription: 'توازن بين الهدوء والتبريد', boostMode: 'تبريد قوي',
    boostDescription: 'استجابة أسرع للحرارة', fansManagedBy: 'المراوح يديرها',
    localOnDevice: 'يعمل محليًا على هذا الجهاز', connection: 'جارٍ الاتصال…', reading: 'جارٍ القراءة',
    waitingSensor: 'بانتظار قراءة المستشعر', tempUnavailable: 'قراءة الحرارة غير متاحة',
    highTemp: 'حرارة مرتفعة. التبريد يعمل', warmTemp: 'حرارة ملحوظة', stableTemp: 'درجة حرارة مستقرة',
    serviceActive: 'الخدمة تعمل', serviceStopped: 'الخدمة متوقفة', serviceFailed: 'الخدمة بها عطل',
    serviceStarting: 'الخدمة قيد التشغيل', serviceStopping: 'الخدمة قيد الإيقاف', serviceReloading: 'الخدمة تعيد التحميل',
    serviceUnavailable: 'حالة الخدمة غير متاحة', serviceUnknown: 'حالة الخدمة غير معروفة', coolingActive: 'التبريد يعمل',
    sensorUnavailable: 'المستشعر غير متاح', dashboardOffline: 'اللوحة غير متصلة',
    controlActive: 'تحكم ذكي نشط', controlUnavailable: 'حالة التحكم غير متاحة',
    modeUnknown: 'الوضع غير معروف', quietModeShort: 'هادئ ذكي', boostModeShort: 'تبريد قوي',
    lastUpdate: 'آخر تحديث {time}',
    requestingAuthorization: 'جارٍ طلب تأكيد الصلاحية…', boostEnabled: 'تم تفعيل التبريد القوي.',
    quietEnabled: 'تم تفعيل الوضع الهادئ الذكي.', connectionError: 'تعذر قراءة حالة الجهاز.',
    modeError: 'لم يتغير وضع المراوح.', genericModeError: 'تعذر تغيير وضع المراوح.',
    requestDenied: 'رفض النظام طلب التحكم بالمراوح.', invalidSession: 'انتهت الجلسة. أعد تحميل الصفحة.',
    unsupportedRequest: 'طلب غير صالح.', helperMissing: 'مساعد التحكم غير مثبت أو إعداداته غير آمنة. أعد تثبيت اللوحة.',
    authUnavailable: 'تعذر فتح طلب الصلاحية. تحقق من تثبيت pkexec ومكوّن المصادقة.',
    languageButton: 'English', languageLabel: 'Switch to English'
  },
  en: {
    brand: 'iMac Cooling', brandSubtitle: 'Local fan dashboard', brandLabel: 'iMac cooling dashboard',
    liveMonitoring: 'Live monitoring', refreshInterval: 'Refreshes every 5 seconds',
    headlineFirst: 'System temperature', headlineSecond: 'under control.', systemStatus: 'System status',
    coolingStatus: 'Cooling status', airflow: 'Airflow', fanSpeed: 'Fan speed',
    fanOdd: 'Fan 1', fanHdd: 'Fan 2', fanCpu: 'Fan 3',
    unknownControl: 'Control status unknown', temperatureSensor: 'Temperature sensor', temperature: 'Temperature',
    temperatureGauge: 'Temperature gauge', celsius: 'Degrees Celsius', recentReadings: 'Recent readings',
    sinceDashboardOpened: 'Since page load', recentReadingsChart: 'Recent temperature readings chart', now: 'Now',
    coolingStyle: 'Choose a cooling profile', operatingMode: 'Operating mode',
    authConfirmation: 'Changing the mode requires system authorization.', quietMode: 'Quiet smart',
    quietDescription: 'Balances noise and cooling', boostMode: 'Boost cooling',
    boostDescription: 'Responds faster to heat', fansManagedBy: 'Fans managed by',
    localOnDevice: 'Running locally on this device', connection: 'Connecting…', reading: 'Reading status',
    waitingSensor: 'Waiting for a sensor reading', tempUnavailable: 'Temperature reading unavailable',
    highTemp: 'High temperature. Cooling is active', warmTemp: 'Temperature is elevated', stableTemp: 'Temperature is stable',
    serviceActive: 'Service running', serviceStopped: 'Service stopped', serviceFailed: 'Service failed',
    serviceStarting: 'Service starting', serviceStopping: 'Service stopping', serviceReloading: 'Service reloading',
    serviceUnavailable: 'Service status unavailable', serviceUnknown: 'Unknown service status', coolingActive: 'Cooling active',
    sensorUnavailable: 'Sensor unavailable', dashboardOffline: 'Dashboard disconnected',
    controlActive: 'Smart control active', controlUnavailable: 'Control status unavailable',
    modeUnknown: 'Mode unknown', quietModeShort: 'Quiet smart', boostModeShort: 'Boost cooling',
    lastUpdate: 'Last updated {time}',
    requestingAuthorization: 'Waiting for system authorization…', boostEnabled: 'Boost cooling enabled.',
    quietEnabled: 'Quiet smart mode enabled.', connectionError: 'Could not read device status.',
    modeError: 'The fan mode did not change.', genericModeError: 'Could not change the fan mode.',
    requestDenied: 'The system rejected the fan control request.', invalidSession: 'Session expired. Reload the dashboard.',
    unsupportedRequest: 'Invalid request.', helperMissing: 'The protected control helper is missing or unsafe. Reinstall the dashboard.',
    authUnavailable: 'Could not open the authorization prompt. Check that pkexec and an authentication agent are installed.',
    languageButton: 'العربية', languageLabel: 'التبديل إلى العربية'
  }
};

const serverErrors = {
  'رفض الطلب لأنه ليس من اللوحة المحلية.': 'requestDenied',
  'انتهت صلاحية الجلسة؛ أعد تحميل الصفحة.': 'invalidSession',
  'المسار غير موجود.': 'unsupportedRequest',
  'تعذر قراءة الطلب.': 'unsupportedRequest',
  'الوضع المطلوب غير صالح.': 'unsupportedRequest',
  'مساعد التحكم المحمي غير مثبت أو صلاحياته غير آمنة. ثبّت اللوحة أولًا.': 'helperMissing',
  'تعذر تشغيل طلب الصلاحية. تأكد من وجود pkexec ومكوّن المصادقة.': 'authUnavailable'
};
const serviceStateMessages = {
  active: 'serviceActive', inactive: 'serviceStopped', failed: 'serviceFailed',
  activating: 'serviceStarting', deactivating: 'serviceStopping', reloading: 'serviceReloading',
  'غير متاح': 'serviceUnavailable'
};

function t(key, values = {}) {
  return messages[currentLanguage][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

function formatNumber(value) {
  const locale = currentLanguage === 'en' ? 'en-US' : 'ar-EG';
  return new Intl.NumberFormat(locale, {maximumFractionDigits: 1}).format(value);
}

function readingCountText(count) {
  const formattedCount = formatNumber(count);
  if (currentLanguage === 'en') return `${formattedCount} ${count === 1 ? 'reading' : 'readings'}`;
  return count === 1 ? 'قراءة واحدة' : `${formattedCount} قراءة`;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
  document.title = currentLanguage === 'en' ? 'iMac Cooling | Fan Dashboard' : 'تبريد iMac | لوحة المراوح';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAria));
  });
  $('language-button').textContent = t('languageButton');
  $('language-button').setAttribute('aria-label', t('languageLabel'));
  $('reading-count').textContent = readingCountText(readings.length);
  if (lastStatus) updateLiveLabels(lastStatus);
  if (connectionFailed) {
    $('service-label').textContent = t('dashboardOffline');
    $('system-state').textContent = t('dashboardOffline');
    $('fan-control-state').textContent = t('controlUnavailable');
  }
  if ($('notice').dataset.messageKey) {
    $('notice').textContent = t($('notice').dataset.messageKey);
  }
  if (lastUpdated !== null) updateLastUpdated();
  if (currentMode !== null) updateModeLabel(currentMode);
}

function updateLastUpdated() {
  const locale = currentLanguage === 'en' ? 'en-US' : 'ar-EG';
  const time = new Date(lastUpdated * 1000).toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  $('last-update').textContent = t('lastUpdate', {time});
}

function updateModeLabel(mode) {
  $('fan-foot-mode').textContent = mode === 'boost' ? t('boostModeShort') : mode === 'quiet' ? t('quietModeShort') : t('modeUnknown');
}

function serviceLabel(state) {
  return t(serviceStateMessages[state] || 'serviceUnknown');
}

function updateLiveLabels(data) {
  const temp = data.temperature;
  const active = data.service === 'active';
  $('temp-label').textContent = temp == null ? t('tempUnavailable') : temp >= 85 ? t('highTemp') : temp >= 75 ? t('warmTemp') : t('stableTemp');
  $('service-label').textContent = serviceLabel(data.service);
  $('service-label').parentElement.classList.toggle('offline', !active);
  $('system-state').textContent = temp == null ? t('sensorUnavailable') : active ? t('coolingActive') : serviceLabel(data.service);
  $('fan-control-state').textContent = active ? t('controlActive') : serviceLabel(data.service);
}

function showNotice(key, isError = false) {
  const notice = $('notice');
  notice.className = isError ? 'notice error' : 'notice';
  notice.dataset.messageKey = key;
  notice.textContent = t(key);
}

function updateHistory(temp) {
  if (temp == null) return;
  readings.push({time: Date.now(), temp});
  if (readings.length > 42) readings.shift();
  $('reading-count').textContent = readingCountText(readings.length);
  const width = 360, height = 48, pad = 3;
  const vals = readings.map(x => x.temp), lo = Math.min(35, ...vals), hi = Math.max(60, ...vals);
  const span = Math.max(8, hi - lo);
  const pts = vals.map((v, i) => [pad + (readings.length === 1 ? width - pad * 2 : i * (width - pad * 2) / (readings.length - 1)), height - pad - ((v - lo) / span) * (height - pad * 2)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  $('history-line').setAttribute('d', line);
  $('history-area').setAttribute('d', `${line} L${pts.at(-1)[0]},${height} L${pts[0][0]},${height} Z`);
}

function render(data) {
  lastStatus = data;
  connectionFailed = false;
  const temp = data.temperature;
  $('dial-temp').textContent = temp == null ? '—°' : `${formatNumber(temp)}°`;
  const progress = temp == null ? 0 : Math.max(0, Math.min(1, (temp - 40) / 60));
  $('thermo-progress').style.strokeDasharray = `${(528 * progress).toFixed(1)} 704`;
  $('thermo-progress').style.stroke = temp >= 85 ? '#c74c36' : temp >= 75 ? '#dc8c35' : '#1d7968';
  $('temp-bullet').style.background = temp >= 85 ? '#c74c36' : temp >= 75 ? '#dc8c35' : '#1d7968';
  data.fans.forEach((rpm, i) => {
    $(`fan-${i+1}`).textContent = rpm == null ? '—' : formatNumber(rpm);
    $(`fan-${i+1}`).classList.toggle('error-text', rpm == null);
    $(`bar-${i+1}`).style.width = rpm == null ? '0%' : `${Math.max(3, Math.min(100, rpm / 6500 * 100))}%`;
  });
  lastServiceActive = data.service === 'active';
  updateLiveLabels(data);
  document.querySelectorAll('.mode-button').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === data.mode));
  $('fan-control-state').textContent = lastServiceActive ? t('controlActive') : t('serviceStopped');
  currentMode = data.mode;
  updateModeLabel(currentMode);
  lastUpdated = data.updated;
  updateLastUpdated();
  updateHistory(temp);
}

async function refresh() {
  try {
    const res = await fetch('/api/status', {cache:'no-store'});
    if (!res.ok) throw new Error(t('connectionError'));
    render(await res.json());
  } catch (error) {
    connectionFailed = true;
    $('service-label').textContent = t('dashboardOffline');
    $('service-label').parentElement.classList.add('offline');
    $('system-state').textContent = t('dashboardOffline');
    $('fan-control-state').textContent = t('controlUnavailable');
  }
}

async function setMode(mode) {
  if (mode === currentMode && lastServiceActive) return;
  let failureKey = 'genericModeError';
  showNotice('requestingAuthorization');
  document.querySelectorAll('.mode-button').forEach(el => el.disabled = true);
  try {
    const res = await fetch('/api/mode', {method:'POST', headers:{'Content-Type':'application/json','X-Dashboard-Token':token}, body:JSON.stringify({mode})});
    const data = await res.json();
    if (!res.ok) {
      failureKey = serverErrors[data.error] || 'modeError';
      throw new Error(failureKey);
    }
    render(data.status);
    showNotice(mode === 'boost' ? 'boostEnabled' : 'quietEnabled');
  } catch (error) {
    showNotice(failureKey, true);
    await refresh();
  } finally {
    document.querySelectorAll('.mode-button').forEach(el => el.disabled = false);
  }
}

$('language-button').addEventListener('click', () => {
  currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
  try { localStorage.setItem('fan-dashboard-language', currentLanguage); } catch {}
  applyLanguage();
});
document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
applyLanguage();
refresh();
setInterval(refresh, 5000);

const token = document.querySelector('meta[name="dashboard-token"]').content;
const $ = (id) => document.getElementById(id);
const readings = [];
let currentMode = null;
const fmt = new Intl.NumberFormat('ar-EG', {maximumFractionDigits: 1});

function updateHistory(temp) {
  if (temp == null) return;
  readings.push({time: Date.now(), temp});
  if (readings.length > 42) readings.shift();
  $('reading-count').textContent = `${fmt.format(readings.length)} قراءة`;
  const width = 360, height = 48, pad = 3;
  const vals = readings.map(x => x.temp), lo = Math.min(35, ...vals), hi = Math.max(60, ...vals);
  const span = Math.max(8, hi - lo);
  const pts = vals.map((v, i) => [pad + (readings.length === 1 ? width - pad * 2 : i * (width - pad * 2) / (readings.length - 1)), height - pad - ((v - lo) / span) * (height - pad * 2)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  $('history-line').setAttribute('d', line);
  $('history-area').setAttribute('d', `${line} L${pts.at(-1)[0]},${height} L${pts[0][0]},${height} Z`);
}

function render(data) {
  const temp = data.temperature;
  $('dial-temp').textContent = temp == null ? '—°' : `${fmt.format(temp)}°`;
  $('temp-label').textContent = temp == null ? 'قراءة الحرارة غير متاحة' : temp >= 85 ? 'حرارة مرتفعة — التبريد يعمل' : temp >= 75 ? 'حرارة ملحوظة' : 'درجة حرارة مستقرة';
  const progress = temp == null ? 0 : Math.max(0, Math.min(1, (temp - 40) / 60));
  $('thermo-progress').style.strokeDasharray = `${(528 * progress).toFixed(1)} 704`;
  $('thermo-progress').style.stroke = temp >= 85 ? '#c74c36' : temp >= 75 ? '#dc8c35' : '#1d7968';
  $('temp-bullet').style.background = temp >= 85 ? '#c74c36' : temp >= 75 ? '#dc8c35' : '#1d7968';
  data.fans.forEach((rpm, i) => {
    $(`fan-${i+1}`).textContent = rpm == null ? '—' : fmt.format(rpm);
    $(`fan-${i+1}`).classList.toggle('error-text', rpm == null);
    $(`bar-${i+1}`).style.width = rpm == null ? '0%' : `${Math.max(3, Math.min(100, rpm / 6500 * 100))}%`;
  });
  const active = data.service === 'active';
  $('service-label').textContent = active ? 'الخدمة تعمل' : `الخدمة ${data.service}`;
  $('service-label').parentElement.classList.toggle('offline', !active);
  $('system-state').textContent = temp == null ? 'المستشعر غير متاح' : active ? 'التبريد يعمل' : 'الخدمة متوقفة';
  document.querySelectorAll('.mode-button').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === data.mode));
  $('fan-control-state').textContent = active ? 'تحكم ذكي نشط' : 'الخدمة متوقفة';
  $('fan-foot-mode').textContent = data.mode === 'boost' ? 'تبريد قوي' : data.mode === 'quiet' ? 'هادئ ذكي' : 'الوضع غير معروف';
  $('last-update').textContent = `آخر تحديث ${new Date(data.updated * 1000).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}`;
  updateHistory(temp);
  currentMode = data.mode;
}

async function refresh() {
  try {
    const res = await fetch('/api/status', {cache:'no-store'});
    if (!res.ok) throw new Error('تعذر قراءة حالة الجهاز.');
    render(await res.json());
  } catch (error) {
    $('service-label').textContent = 'تعذر الاتصال';
    $('service-label').parentElement.classList.add('offline');
    $('system-state').textContent = 'اللوحة غير متصلة';
    $('fan-control-state').textContent = 'حالة التحكم غير متاحة';
  }
}

async function setMode(mode, button) {
  if (mode === currentMode && $('service-label').textContent === 'الخدمة تعمل') return;
  const notice = $('notice');
  notice.className = 'notice';
  notice.textContent = 'جارٍ طلب تأكيد الصلاحية…';
  document.querySelectorAll('.mode-button').forEach(el => el.disabled = true);
  try {
    const res = await fetch('/api/mode', {method:'POST', headers:{'Content-Type':'application/json','X-Dashboard-Token':token}, body:JSON.stringify({mode})});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'لم يتغير وضع المراوح.');
    render(data.status);
    notice.textContent = mode === 'boost' ? 'تم تفعيل التبريد القوي.' : 'تم تفعيل الوضع الهادئ الذكي.';
  } catch (error) {
    notice.className = 'notice error';
    notice.textContent = error.message || 'تعذر تغيير وضع المراوح.';
    await refresh();
  } finally {
    document.querySelectorAll('.mode-button').forEach(el => el.disabled = false);
  }
}

document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode, button)));
refresh();
setInterval(refresh, 5000);
